import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowDownRight,
  ArrowUpRight,
  Award,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  Copy,
  CreditCard,
  Edit3,
  ExternalLink,
  Eye,
  FolderKanban,
  Gift,
  IndianRupee,
  LayoutDashboard,
  PauseCircle,
  PlayCircle,
  Plus,
  RefreshCw,
  Save,
  Search,
  Settings,
  ShieldCheck,
  Star,
  Trash2,
  UserCheck,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { DashboardLayout, type SidebarLink } from '../../components/DashboardLayout';
import { LoadingState } from '../../components/ui/StateViews';
import { AdminCourseModal, type CourseEditorInitial } from '../../components/admin/AdminCourseModal';
import { AdminQuizModal, type QuizRow } from '../../components/admin/AdminQuizModal';
import { ImageUploader } from '../../components/admin/ImageUploader';
import { api } from '../../lib/api';
import { broadcastPlatformUpdate, subscribePlatformUpdates } from '../../lib/realtime';
import { useSite } from '../../context/SiteContext';

export const ADMIN_LINKS: SidebarLink[] = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/courses', label: 'Courses', icon: BookOpen },
  { to: '/admin/quizzes', label: 'Quizzes', icon: ClipboardCheck },
  { to: '/admin/categories', label: 'Categories', icon: FolderKanban },
  { to: '/admin/users', label: 'Users', icon: Users },
  { to: '/admin/certificates', label: 'Certificates', icon: Award },
  { to: '/admin/payments', label: 'Payments', icon: CreditCard },
  { to: '/admin/referrals', label: 'Referrals', icon: Gift },
  { to: '/admin/redemptions', label: 'Redemptions', icon: Wallet },
  { to: '/admin/settings', label: 'Settings', icon: Settings },
];

export type AdminSection =
  | 'overview'
  | 'courses'
  | 'quizzes'
  | 'categories'
  | 'users'
  | 'certificates'
  | 'payments'
  | 'referrals'
  | 'redemptions'
  | 'settings'
  | 'faculty'
  | 'batches'
  | 'students'
  | 'tests'
  | 'cms';

interface MetricWithGrowth {
  total: number;
  thisMonth: number;
  prevMonth: number;
  changePct: number | null;
}

interface AdminDashboardData {
  metrics: {
    studentsCount: number;
    facultyCount: number;
    totalUsersCount: number;
    coursesCount: number;
    publishedCoursesCount: number;
    enrollmentsCount: number;
    totalRevenue: number;
    coursesThisMonth: number;
    coursesPrevMonth: number;
    totalCoursesChangePct: number | null;
    publishedThisMonth: number;
    publishedPrevMonth: number;
    publishedChangePct: number | null;
    usersThisMonth: number;
    usersPrevMonth: number;
    usersChangePct: number | null;
    revenueThisMonth: number;
    revenuePrevMonth: number;
    revenueChangePct: number | null;
    successfulPaymentsCount?: number;
    failedPaymentsCount?: number;
    cancelledPaymentsCount?: number;
    refundedPaymentsCount?: number;
    referralsCount?: number;
    certificatesCount?: number;
    quizAttemptsCount?: number;
    redemptionRequestsCount?: number;
    liveClassesCount: number;
    pendingPayments: number;
    coursesMetric?: MetricWithGrowth;
  };
  coursePerformance: Array<{ id: number; title: string; enrollments: number; revenue: number; is_published: number }>;
  recentPayments: Array<Record<string, unknown>>;
  revenueByMethod: Array<{ method: string; total: number; txns: number }>;
}

const cardCls = 'rounded-2xl border border-slate-800/90 bg-[#0F172A] shadow-xl shadow-slate-950/40';
const inputCls =
  'w-full rounded-xl border border-slate-700 bg-slate-900/90 px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-[#FF7A00] focus:outline-none';
const btnPrimary =
  'inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#FF7A00] px-4 py-2 text-xs font-bold text-white shadow-lg shadow-orange-500/20 hover:bg-orange-500 transition cursor-pointer';
const btnBlue =
  'inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#0052CC] px-4 py-2 text-xs font-bold text-white hover:bg-blue-600 transition cursor-pointer';
const btnGhost =
  'inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-800 transition cursor-pointer';

function GrowthBadge({ pct }: { pct: number | null | undefined }) {
  if (pct === null || pct === undefined) {
    return (
      <span className="inline-flex items-center rounded-full bg-slate-800 px-2 py-0.5 text-[11px] font-semibold text-slate-300">
        0% (first mo)
      </span>
    );
  }
  if (pct === 0) {
    return (
      <span className="inline-flex items-center rounded-full bg-slate-800 px-2 py-0.5 text-[11px] font-semibold text-slate-300">
        0% vs last mo
      </span>
    );
  }
  const positive = pct > 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-bold ${
        positive ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'
      }`}
    >
      {positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      {positive ? `+${pct}%` : `${pct}%`} vs last mo
    </span>
  );
}

function PaymentStatusBadge({ status, label }: { status: string; label?: string }) {
  const s = (status || '').toLowerCase();
  const text =
    label ||
    (s === 'successful'
      ? 'Success'
      : s === 'pending'
      ? 'Pending'
      : s === 'processing'
      ? 'Processing'
      : s === 'failed'
      ? 'Failed'
      : s === 'cancelled'
      ? 'Cancelled'
      : s === 'refunded'
      ? 'Refunded'
      : status);

  const style =
    s === 'successful'
      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
      : s === 'processing'
      ? 'bg-blue-500/15 text-blue-300 border-blue-500/30'
      : s === 'pending'
      ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
      : s === 'failed' || s === 'cancelled'
      ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
      : 'bg-purple-500/15 text-purple-300 border-purple-500/30';

  return <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${style}`}>{text}</span>;
}

export function AdminPortal({ section }: { section: AdminSection }) {
  const normalizedSection: AdminSection =
    section === 'tests'
      ? 'quizzes'
      : section === 'students'
      ? 'users'
      : section === 'cms'
      ? 'settings'
      : section;

  const navigate = useNavigate();
  const { refreshSite: refreshPublicSite } = useSite();
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');

  // Shared core states
  const [dashboard, setDashboard] = useState<AdminDashboardData | null>(null);
  const [courses, setCourses] = useState<Array<Record<string, unknown>>>([]);
  const [categories, setCategories] = useState<Array<Record<string, unknown>>>([]);
  const [faculty, setFaculty] = useState<Array<Record<string, unknown>>>([]);
  const [quizzes, setQuizzes] = useState<QuizRow[]>([]);
  const [usersList, setUsersList] = useState<Array<Record<string, unknown>>>([]);
  const [certificates, setCertificates] = useState<Array<Record<string, unknown>>>([]);
  const [payments, setPayments] = useState<Array<Record<string, unknown>>>([]);
  const [referrals, setReferrals] = useState<Record<string, unknown> | null>(null);
  const [redemptions, setRedemptions] = useState<Array<Record<string, unknown>>>([]);
  const [batches, setBatches] = useState<Array<Record<string, unknown>>>([]);
  const [enquiries, setEnquiries] = useState<Array<Record<string, unknown>>>([]);
  const [cms, setCms] = useState<Record<string, any> | null>(null);

  // Filters & Modals
  const [courseSearch, setCourseSearch] = useState('');
  const [courseCatFilter, setCourseCatFilter] = useState('all');
  const [courseStatusFilter, setCourseStatusFilter] = useState('all');
  const [coursePage, setCoursePage] = useState(1);
  const [courseModalOpen, setCourseModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<CourseEditorInitial | null>(null);

  const [quizModalOpen, setQuizModalOpen] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState<QuizRow | null>(null);

  const [catModalOpen, setCatModalOpen] = useState(false);
  const [catForm, setCatForm] = useState({
    id: 0,
    name: '',
    slug: '',
    description: '',
    image: '',
    icon_name: 'BookOpen',
    is_active: true,
  });

  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('all');
  const [editingUser, setEditingUser] = useState<Record<string, any> | null>(null);
  const [viewingUser, setViewingUser] = useState<Record<string, any> | null>(null);

  const [certIssueOpen, setCertIssueOpen] = useState(false);
  const [certForm, setCertForm] = useState({ student_id: '', course_id: '' });

  const [paymentStatusFilter, setPaymentStatusFilter] = useState('all');
  const [autoPollPayments, setAutoPollPayments] = useState(false);

  const [referralSearch, setReferralSearch] = useState('');
  const [redemptionFilter, setRedemptionFilter] = useState('all');
  const [redemptionModalOpen, setRedemptionModalOpen] = useState(false);
  const [redemptionForm, setRedemptionForm] = useState({
    user_id: '',
    amount: 250,
    method: 'UPI',
    account_details: '',
    notes: '',
  });

  const [settingsTab, setSettingsTab] = useState<'platform' | 'cms' | 'referral' | 'faculty' | 'batches'>('platform');

  // Faculty & Batch quick create forms inside Settings -> Faculty & Batches
  const [facForm, setFacForm] = useState({
    full_name: '',
    email: '',
    mobile: '',
    password: '',
    title: 'Senior Instructor',
    specialization: '',
  });
  const [batchForm, setBatchForm] = useState({
    name: '',
    course_id: '',
    faculty_id: '',
    start_date: '',
    end_date: '',
    timings: '7:00 PM - 8:30 PM',
    total_seats: 60,
    status: 'upcoming',
  });

  const notify = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3200);
  };

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [cats, facs, cs] = await Promise.all([
        api<Array<Record<string, unknown>>>('/api/admin/categories').catch(() => []),
        api<Array<Record<string, unknown>>>('/api/admin/faculty').catch(() => []),
        api<Array<Record<string, unknown>>>('/api/admin/courses').catch(() => []),
      ]);
      setCategories(cats);
      setFaculty(facs);
      setCourses(cs);

      if (normalizedSection === 'overview') {
        const [d, enqs] = await Promise.all([
          api<AdminDashboardData>('/api/admin/dashboard'),
          api<Array<Record<string, unknown>>>('/api/admin/enquiries').catch(() => []),
        ]);
        setDashboard(d);
        setEnquiries(enqs);
      } else if (normalizedSection === 'quizzes') {
        setQuizzes(await api<QuizRow[]>('/api/admin/tests'));
      } else if (normalizedSection === 'users') {
        setUsersList(await api<Array<Record<string, unknown>>>('/api/admin/users'));
      } else if (normalizedSection === 'certificates') {
        const [certs, usrs] = await Promise.all([
          api<Array<Record<string, unknown>>>('/api/admin/certificates'),
          api<Array<Record<string, unknown>>>('/api/admin/users'),
        ]);
        setCertificates(certs);
        setUsersList(usrs);
      } else if (normalizedSection === 'payments') {
        setPayments(await api<Array<Record<string, unknown>>>(`/api/admin/payments?status=${paymentStatusFilter}`));
      } else if (normalizedSection === 'referrals') {
        setReferrals(await api<Record<string, unknown>>('/api/admin/referrals'));
      } else if (normalizedSection === 'redemptions') {
        const [reds, usrs] = await Promise.all([
          api<Array<Record<string, unknown>>>(`/api/admin/redemptions?status=${redemptionFilter}`),
          api<Array<Record<string, unknown>>>('/api/admin/users'),
        ]);
        setRedemptions(reds);
        setUsersList(usrs);
      } else if (normalizedSection === 'settings' || normalizedSection === 'faculty' || normalizedSection === 'batches') {
        const [cmsRes, bts] = await Promise.all([
          api<Record<string, any>>('/api/public/cms'),
          api<Array<Record<string, unknown>>>('/api/admin/batches').catch(() => []),
        ]);
        setCms(cmsRes);
        setBatches(bts);
        if (normalizedSection === 'faculty') setSettingsTab('faculty');
        if (normalizedSection === 'batches') setSettingsTab('batches');
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [normalizedSection, paymentStatusFilter, redemptionFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Real-time Admin auto-sync (background poll every 5s + BroadcastChannel + Supabase Realtime)
  useEffect(() => {
    const unsub = subscribePlatformUpdates(() => {
      loadData(true);
    });
    const t = setInterval(() => {
      loadData(true);
    }, 5000);
    return () => {
      unsub();
      clearInterval(t);
    };
  }, [loadData]);

  // Filtered Courses + Pagination
  const filteredCourses = useMemo(() => {
    const q = courseSearch.trim().toLowerCase();
    return courses.filter((c) => {
      const catOk = courseCatFilter === 'all' || String(c.category_id) === courseCatFilter;
      const statusOk =
        courseStatusFilter === 'all' ||
        (courseStatusFilter === 'published' && Number(c.is_published) === 1) ||
        (courseStatusFilter === 'draft' && Number(c.is_published) === 0) ||
        (courseStatusFilter === 'featured' && Number(c.featured) === 1);
      const qOk =
        !q ||
        String(c.title || '').toLowerCase().includes(q) ||
        String(c.category_name || '').toLowerCase().includes(q);
      return catOk && statusOk && qOk;
    });
  }, [courses, courseSearch, courseCatFilter, courseStatusFilter]);

  const PAGE_SIZE = 8;
  const totalCoursePages = Math.max(1, Math.ceil(filteredCourses.length / PAGE_SIZE));
  const pagedCourses = filteredCourses.slice((coursePage - 1) * PAGE_SIZE, coursePage * PAGE_SIZE);

  // Filtered Users
  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    return usersList.filter((u) => {
      const role = String(u.role || '').toLowerCase();
      const roleOk =
        userRoleFilter === 'all' ||
        (userRoleFilter === 'USER' && role === 'student') ||
        (userRoleFilter === 'ADMIN' && role === 'admin') ||
        (userRoleFilter === 'FACULTY' && role === 'faculty');
      const qOk =
        !q ||
        String(u.full_name || '').toLowerCase().includes(q) ||
        String(u.email || '').toLowerCase().includes(q) ||
        String(u.mobile || '').includes(q);
      return roleOk && qOk;
    });
  }, [usersList, userSearch, userRoleFilter]);

  const toggleCoursePublish = async (c: Record<string, unknown>) => {
    await api(`/api/admin/courses/${c.id}`, {
      method: 'PUT',
      body: JSON.stringify({ is_published: Number(c.is_published) === 1 ? 0 : 1 }),
    });
    notify(Number(c.is_published) === 1 ? 'Course moved to Draft.' : 'Course published to catalog.');
    refreshPublicSite();
    broadcastPlatformUpdate('course');
    loadData(true);
  };

  const duplicateCourse = async (id: unknown) => {
    await api(`/api/admin/courses/${id}/duplicate`, { method: 'POST' });
    notify('Course duplicated as Draft.');
    broadcastPlatformUpdate('course');
    loadData(true);
  };

  const deleteCourse = async (id: unknown) => {
    if (!window.confirm('Delete this course permanently?')) return;
    await api(`/api/admin/courses/${id}`, { method: 'DELETE' });
    notify('Course deleted.');
    refreshPublicSite();
    broadcastPlatformUpdate('course');
    loadData(true);
  };

  const saveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catForm.name.trim()) return;
    const payload = {
      name: catForm.name.trim(),
      slug: catForm.slug.trim(),
      description: catForm.description,
      image: catForm.image,
      icon_name: catForm.icon_name,
      is_active: catForm.is_active ? 1 : 0,
    };
    if (catForm.id) {
      await api(`/api/admin/categories/${catForm.id}`, { method: 'PUT', body: JSON.stringify(payload) });
      notify('Category updated.');
    } else {
      await api('/api/admin/categories', { method: 'POST', body: JSON.stringify(payload) });
      notify('Category created.');
    }
    setCatModalOpen(false);
    refreshPublicSite();
    broadcastPlatformUpdate('category');
    loadData(true);
  };

  const saveCmsSettings = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!cms) return;
    await api('/api/admin/cms', { method: 'PUT', body: JSON.stringify(cms) });
    refreshPublicSite();
    broadcastPlatformUpdate('cms');
    notify('Platform settings & live CMS saved.');
  };

  const titles: Record<AdminSection, { title: string; subtitle: string }> = {
    overview: { title: 'Admin Dashboard', subtitle: 'Real-time platform analytics, enrollments & revenue overview' },
    courses: { title: 'Course Management', subtitle: 'Manage curriculum, pricing, media assets & publication status' },
    quizzes: { title: 'Quiz & Assessment Studio', subtitle: 'Configure mock tests, pricing, certificates & MCQ banks' },
    categories: { title: 'Course Categories', subtitle: 'Organize catalog taxonomy & category imagery' },
    users: { title: 'Users & Access Control', subtitle: 'Students, faculty, admins, roles & wallet credits' },
    certificates: { title: 'Certificates', subtitle: 'Issue, verify, revoke or manage completion credentials' },
    payments: { title: 'Payments & Transactions', subtitle: 'Live payment lifecycle tracking — only Success unlocks enrollment' },
    referrals: { title: 'Referral Program Analytics', subtitle: 'Track clicks, leads, enrollments, revenue & reward earnings' },
    redemptions: { title: 'Reward Redemptions', subtitle: 'Approve, pay out or reject learner referral reward claims' },
    settings: { title: 'Platform Settings & CMS', subtitle: 'Live branding, hero banners, referral reward rules & faculty' },
    faculty: { title: 'Faculty Management', subtitle: 'Manage instructors and course assignments' },
    batches: { title: 'Batches & Schedules', subtitle: 'Coordinate live cohort batches & seat capacity' },
    students: { title: 'Users & Access Control', subtitle: 'Manage enrolled learners' },
    tests: { title: 'Quiz & Assessment Studio', subtitle: 'Configure mock tests & MCQ banks' },
    cms: { title: 'Platform Settings & CMS', subtitle: 'Configure live website copy & rewards' },
  };

  return (
    <DashboardLayout
      title={titles[normalizedSection].title}
      subtitle={titles[normalizedSection].subtitle}
      links={ADMIN_LINKS}
      darkTheme
    >
      {toast && (
        <div className="mb-5 flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/15 px-4 py-3 text-xs font-bold text-emerald-300">
          <span className="inline-flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" /> {toast}
          </span>
          <button type="button" onClick={() => setToast('')} className="cursor-pointer text-emerald-200 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {loading ? (
        <LoadingState message="Syncing platform records..." />
      ) : (
        <>
          {/* 1. OVERVIEW DASHBOARD */}
          {normalizedSection === 'overview' && dashboard && (
            <div className="space-y-6">
              {/* 4 KPI Cards with Real DB Monthly Comparison */}
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div className={`${cardCls} p-5 border-t-2 border-t-[#3B82F6]`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Courses</span>
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/15 text-blue-400">
                      <BookOpen className="h-4 w-4" />
                    </div>
                  </div>
                  <p className="mt-3 font-display text-3xl font-extrabold text-white">{dashboard.metrics.coursesCount}</p>
                  <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-slate-400">
                    <span>+{dashboard.metrics.coursesThisMonth} this month</span>
                    <GrowthBadge pct={dashboard.metrics.totalCoursesChangePct} />
                  </div>
                </div>

                <div className={`${cardCls} p-5 border-t-2 border-t-[#FF7A00]`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Published Courses</span>
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500/15 text-[#FF7A00]">
                      <CheckCircle2 className="h-4 w-4" />
                    </div>
                  </div>
                  <p className="mt-3 font-display text-3xl font-extrabold text-white">
                    {dashboard.metrics.publishedCoursesCount}
                  </p>
                  <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-slate-400">
                    <span>+{dashboard.metrics.publishedThisMonth} this month</span>
                    <GrowthBadge pct={dashboard.metrics.publishedChangePct} />
                  </div>
                </div>

                <div className={`${cardCls} p-5 border-t-2 border-t-[#06B6D4]`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Users</span>
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-400">
                      <Users className="h-4 w-4" />
                    </div>
                  </div>
                  <p className="mt-3 font-display text-3xl font-extrabold text-white">
                    {dashboard.metrics.totalUsersCount ?? dashboard.metrics.studentsCount}
                  </p>
                  <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-slate-400">
                    <span>+{dashboard.metrics.usersThisMonth} this month</span>
                    <GrowthBadge pct={dashboard.metrics.usersChangePct} />
                  </div>
                </div>

                <div className={`${cardCls} p-5 border-t-2 border-t-emerald-500`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Revenue</span>
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
                      <IndianRupee className="h-4 w-4" />
                    </div>
                  </div>
                  <p className="mt-3 font-display text-3xl font-extrabold text-white">
                    ₹{Number(dashboard.metrics.totalRevenue || 0).toLocaleString('en-IN')}
                  </p>
                  <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-slate-400">
                    <span>₹{Number(dashboard.metrics.revenueThisMonth || 0).toLocaleString('en-IN')} this mo</span>
                    <GrowthBadge pct={dashboard.metrics.revenueChangePct} />
                  </div>
                </div>
              </div>

              {/* Real-Time Platform Counters (All live from DB — 0 when empty) */}
              <div className="grid gap-3 grid-cols-2 sm:grid-cols-4 xl:grid-cols-8">
                {[
                  { label: 'Enrollments', value: dashboard.metrics.enrollmentsCount ?? 0, color: 'text-blue-400' },
                  { label: 'Success Pays', value: dashboard.metrics.successfulPaymentsCount ?? 0, color: 'text-emerald-400' },
                  { label: 'Pending Pays', value: dashboard.metrics.pendingPayments ?? 0, color: 'text-amber-400' },
                  { label: 'Failed Pays', value: dashboard.metrics.failedPaymentsCount ?? 0, color: 'text-rose-400' },
                  { label: 'Referrals', value: dashboard.metrics.referralsCount ?? 0, color: 'text-[#FF7A00]' },
                  { label: 'Certificates', value: dashboard.metrics.certificatesCount ?? 0, color: 'text-cyan-400' },
                  { label: 'Quiz Attempts', value: dashboard.metrics.quizAttemptsCount ?? 0, color: 'text-purple-400' },
                  { label: 'Redemptions', value: dashboard.metrics.redemptionRequestsCount ?? 0, color: 'text-slate-200' },
                ].map((stat) => (
                  <div key={stat.label} className={`${cardCls} px-3.5 py-3`}>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{stat.label}</p>
                    <p className={`mt-1 font-display text-xl font-extrabold ${stat.color}`}>{stat.value}</p>
                  </div>
                ))}
              </div>

              {/* Quick Actions */}
              <div className={`${cardCls} p-5`}>
                <h2 className="font-display text-sm font-bold uppercase tracking-wider text-slate-300 mb-3">
                  Quick Actions
                </h2>
                <div className="grid gap-2.5 grid-cols-2 sm:grid-cols-4 lg:grid-cols-8">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingCourse(null);
                      setCourseModalOpen(true);
                    }}
                    className={`${btnPrimary} py-2.5`}
                  >
                    <Plus className="h-3.5 w-3.5" /> Course
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/admin/quizzes')}
                    className={`${btnBlue} py-2.5`}
                  >
                    <ClipboardCheck className="h-3.5 w-3.5" /> Quizzes
                  </button>
                  <button type="button" onClick={() => navigate('/admin/categories')} className={`${btnGhost} py-2.5`}>
                    <FolderKanban className="h-3.5 w-3.5 text-[#FF7A00]" /> Categories
                  </button>
                  <button type="button" onClick={() => navigate('/admin/users')} className={`${btnGhost} py-2.5`}>
                    <Users className="h-3.5 w-3.5 text-cyan-400" /> Users
                  </button>
                  <button type="button" onClick={() => navigate('/admin/certificates')} className={`${btnGhost} py-2.5`}>
                    <Award className="h-3.5 w-3.5 text-amber-400" /> Certificates
                  </button>
                  <button type="button" onClick={() => navigate('/admin/payments')} className={`${btnGhost} py-2.5`}>
                    <CreditCard className="h-3.5 w-3.5 text-emerald-400" /> Payments
                  </button>
                  <button type="button" onClick={() => navigate('/admin/referrals')} className={`${btnGhost} py-2.5`}>
                    <Gift className="h-3.5 w-3.5 text-orange-400" /> Referrals
                  </button>
                  <button type="button" onClick={() => navigate('/admin/settings')} className={`${btnGhost} py-2.5`}>
                    <Settings className="h-3.5 w-3.5 text-slate-300" /> Settings
                  </button>
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-3">
                {/* Course Performance Table */}
                <div className={`${cardCls} lg:col-span-2 p-5 overflow-hidden`}>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-display text-base font-bold text-white">Course Enrollment & Revenue</h2>
                    <Link to="/admin/courses" className="text-xs font-bold text-[#FF7A00] hover:underline">
                      Manage All →
                    </Link>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider">
                          <th className="py-2.5 pr-3">Course</th>
                          <th className="py-2.5 px-3">Status</th>
                          <th className="py-2.5 px-3">Enrollments</th>
                          <th className="py-2.5 pl-3 text-right">Revenue</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/70">
                        {dashboard.coursePerformance.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="py-10 text-center text-slate-400">
                              No course enrollment data available yet. Create a course to start tracking.
                            </td>
                          </tr>
                        ) : (
                          dashboard.coursePerformance.map((cp) => (
                            <tr key={cp.id} className="hover:bg-slate-800/30">
                              <td className="py-3 pr-3 font-semibold text-slate-100">{cp.title}</td>
                              <td className="py-3 px-3">
                                <span
                                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                    cp.is_published
                                      ? 'bg-emerald-500/15 text-emerald-300'
                                      : 'bg-slate-700 text-slate-300'
                                  }`}
                                >
                                  {cp.is_published ? 'Published' : 'Draft'}
                                </span>
                              </td>
                              <td className="py-3 px-3 text-slate-300 font-semibold">{cp.enrollments}</td>
                              <td className="py-3 pl-3 text-right font-bold text-emerald-400">
                                ₹{Number(cp.revenue || 0).toLocaleString('en-IN')}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Revenue by Method + Recent Enquiries */}
                <div className="space-y-6">
                  <div className={`${cardCls} p-5`}>
                    <h2 className="font-display text-base font-bold text-white mb-4">Successful Revenue by Method</h2>
                    <div className="space-y-2.5">
                      {dashboard.revenueByMethod.length === 0 ? (
                        <p className="text-xs text-slate-400">No successful transactions recorded yet.</p>
                      ) : (
                        dashboard.revenueByMethod.map((rm) => (
                          <div
                            key={rm.method}
                            className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/70 px-3.5 py-2.5 text-xs"
                          >
                            <div>
                              <p className="font-bold text-slate-100">{rm.method}</p>
                              <p className="text-[11px] text-slate-400">{rm.txns} successful txns</p>
                            </div>
                            <span className="font-display text-sm font-extrabold text-[#FF7A00]">
                              ₹{Number(rm.total || 0).toLocaleString('en-IN')}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className={`${cardCls} p-5`}>
                    <h2 className="font-display text-base font-bold text-white mb-3">Recent Learner Enquiries</h2>
                    <div className="space-y-2.5 max-h-56 overflow-y-auto">
                      {enquiries.length === 0 ? (
                        <p className="text-xs text-slate-400">No learner enquiries yet.</p>
                      ) : (
                        enquiries.slice(0, 5).map((eq) => (
                          <div key={String(eq.id)} className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 text-xs">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-bold text-slate-100">{String(eq.name)}</span>
                              <span className="rounded-full bg-blue-500/15 px-2 py-0.5 text-[10px] font-bold text-blue-300">
                                {String(eq.status)}
                              </span>
                            </div>
                            <p className="mt-1 text-slate-400 line-clamp-2">{String(eq.message)}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 2. COURSES MANAGEMENT */}
          {normalizedSection === 'courses' && (
            <div className="space-y-5">
              <div className={`${cardCls} p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3`}>
                <div className="flex flex-wrap items-center gap-2.5 flex-1">
                  <div className="relative flex-1 min-w-[200px] max-w-xs">
                    <Search className="h-4 w-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      value={courseSearch}
                      onChange={(e) => {
                        setCourseSearch(e.target.value);
                        setCoursePage(1);
                      }}
                      placeholder="Search courses..."
                      className={`${inputCls} pl-9 py-2 text-xs`}
                    />
                  </div>
                  <select
                    value={courseCatFilter}
                    onChange={(e) => {
                      setCourseCatFilter(e.target.value);
                      setCoursePage(1);
                    }}
                    className={`${inputCls} w-auto py-2 text-xs`}
                  >
                    <option value="all">All Categories</option>
                    {categories.map((cat) => (
                      <option key={String(cat.id)} value={String(cat.id)}>
                        {String(cat.name)}
                      </option>
                    ))}
                  </select>
                  <select
                    value={courseStatusFilter}
                    onChange={(e) => {
                      setCourseStatusFilter(e.target.value);
                      setCoursePage(1);
                    }}
                    className={`${inputCls} w-auto py-2 text-xs`}
                  >
                    <option value="all">All Statuses</option>
                    <option value="published">Published</option>
                    <option value="draft">Draft / Unpublished</option>
                    <option value="featured">Featured</option>
                  </select>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEditingCourse(null);
                    setCourseModalOpen(true);
                  }}
                  className={btnPrimary}
                >
                  <Plus className="h-4 w-4" /> Create New Course
                </button>
              </div>

              <div className={`${cardCls} overflow-hidden`}>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-900/60 text-slate-400 uppercase tracking-wider">
                        <th className="py-3.5 px-4">Course</th>
                        <th className="py-3.5 px-3">Category</th>
                        <th className="py-3.5 px-3">Price</th>
                        <th className="py-3.5 px-3">Enrolled</th>
                        <th className="py-3.5 px-3">Status</th>
                        <th className="py-3.5 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80">
                      {pagedCourses.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-12 text-center text-slate-400">
                            No courses available yet. Create your first course from Course Management.
                          </td>
                        </tr>
                      ) : (
                        pagedCourses.map((c) => (
                        <tr key={String(c.id)} className="hover:bg-slate-800/30">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <img
                                src={String(c.thumbnail_url || '/courses/spoken-english.png')}
                                alt={String(c.title)}
                                className="h-11 w-16 rounded-lg object-cover border border-slate-700 shrink-0"
                              />
                              <div>
                                <div className="flex items-center gap-1.5 font-bold text-slate-100">
                                  <span>{String(c.title)}</span>
                                  {Number(c.featured) === 1 && <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />}
                                </div>
                                <p className="text-[11px] text-slate-400">
                                  {String(c.faculty_name || 'Platform Faculty')} · {Number(c.modules_count || 0)} modules
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-3 text-slate-300">{String(c.category_name || '—')}</td>
                          <td className="py-3 px-3 font-bold text-slate-100">
                            {Number(c.is_free) === 1 ? (
                              <span className="text-emerald-400">Free</span>
                            ) : (
                              <>₹{Number(c.discount_price ?? c.price ?? 0).toLocaleString('en-IN')}</>
                            )}
                          </td>
                          <td className="py-3 px-3 font-semibold text-slate-300">{Number(c.enrollments_count || 0)}</td>
                          <td className="py-3 px-3">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                                Number(c.is_published) === 1
                                  ? 'bg-emerald-500/15 text-emerald-300'
                                  : 'bg-amber-500/15 text-amber-300'
                              }`}
                            >
                              {Number(c.is_published) === 1 ? 'Published' : 'Draft'}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center justify-end gap-1.5">
                              <Link
                                to={`/courses/${c.slug}`}
                                target="_blank"
                                title="View public course page"
                                className="rounded-lg bg-slate-800 p-1.5 text-slate-300 hover:text-white"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                              </Link>
                              <button
                                type="button"
                                title="Edit course"
                                onClick={() => {
                                  setEditingCourse(c as CourseEditorInitial);
                                  setCourseModalOpen(true);
                                }}
                                className="rounded-lg bg-blue-500/15 p-1.5 text-blue-300 hover:bg-blue-500/25 cursor-pointer"
                              >
                                <Edit3 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                title={Number(c.is_published) === 1 ? 'Unpublish' : 'Publish'}
                                onClick={() => toggleCoursePublish(c)}
                                className="rounded-lg bg-orange-500/15 p-1.5 text-[#FF7A00] hover:bg-orange-500/25 cursor-pointer"
                              >
                                {Number(c.is_published) === 1 ? (
                                  <PauseCircle className="h-3.5 w-3.5" />
                                ) : (
                                  <PlayCircle className="h-3.5 w-3.5" />
                                )}
                              </button>
                              <button
                                type="button"
                                title="Duplicate course"
                                onClick={() => duplicateCourse(c.id)}
                                className="rounded-lg bg-slate-800 p-1.5 text-slate-300 hover:text-white cursor-pointer"
                              >
                                <Copy className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                title="Delete course"
                                onClick={() => deleteCourse(c.id)}
                                className="rounded-lg bg-rose-500/15 p-1.5 text-rose-400 hover:bg-rose-500/25 cursor-pointer"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                      )}
                    </tbody>
                  </table>
                </div>

                {totalCoursePages > 1 && (
                  <div className="flex items-center justify-between border-t border-slate-800 px-4 py-3 text-xs text-slate-400">
                    <span>
                      Showing {(coursePage - 1) * PAGE_SIZE + 1}–{Math.min(coursePage * PAGE_SIZE, filteredCourses.length)} of{' '}
                      {filteredCourses.length}
                    </span>
                    <div className="flex gap-1.5">
                      {Array.from({ length: totalCoursePages }, (_, idx) => idx + 1).map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setCoursePage(p)}
                          className={`rounded-lg px-2.5 py-1 font-bold cursor-pointer ${
                            p === coursePage ? 'bg-[#FF7A00] text-white' : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 3. QUIZZES MANAGEMENT */}
          {normalizedSection === 'quizzes' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-400">Create mock tests, manage prices/certificates, and build MCQ banks.</p>
                <button
                  type="button"
                  onClick={() => {
                    setEditingQuiz(null);
                    setQuizModalOpen(true);
                  }}
                  className={btnPrimary}
                >
                  <Plus className="h-4 w-4" /> Create Quiz
                </button>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {quizzes.map((q) => (
                  <div key={q.id} className={`${cardCls} p-5 flex flex-col justify-between gap-4`}>
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="rounded-md bg-blue-500/15 px-2 py-0.5 text-[10px] font-bold uppercase text-blue-300">
                            {q.course_title || 'General Quiz'}
                          </span>
                          <h3 className="mt-2 font-display text-base font-bold text-white">{q.title}</h3>
                        </div>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                            q.is_published ? 'bg-emerald-500/15 text-emerald-300' : 'bg-slate-700 text-slate-300'
                          }`}
                        >
                          {q.is_published ? 'Published' : 'Draft'}
                        </span>
                      </div>
                      <p className="mt-1.5 text-xs text-slate-400 line-clamp-2">{q.description}</p>
                      <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-slate-300">
                        <span className="rounded-lg bg-slate-800/80 px-2.5 py-1">{q.questions_count || 0} Questions</span>
                        <span className="rounded-lg bg-slate-800/80 px-2.5 py-1">{q.duration_minutes} mins</span>
                        <span className="rounded-lg bg-slate-800/80 px-2.5 py-1">{q.total_marks} marks</span>
                        <span className="rounded-lg bg-slate-800/80 px-2.5 py-1">
                          {q.price && q.price > 0 ? `₹${q.price}` : 'Free'}
                        </span>
                        {q.certificate_enabled === 1 && (
                          <span className="rounded-lg bg-amber-500/15 px-2.5 py-1 text-amber-300">Certificate</span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-800 pt-3">
                      <span className="text-[11px] text-slate-400">{q.attempts_count || 0} attempts</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={async () => {
                            await api(`/api/admin/tests/${q.id}`, {
                              method: 'PUT',
                              body: JSON.stringify({ is_published: q.is_published ? 0 : 1 }),
                            });
                            notify(q.is_published ? 'Quiz unpublished.' : 'Quiz published.');
                            loadData();
                          }}
                          className={btnGhost}
                        >
                          {q.is_published ? 'Unpublish' : 'Publish'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingQuiz(q);
                            setQuizModalOpen(true);
                          }}
                          className={btnBlue}
                        >
                          <Edit3 className="h-3.5 w-3.5" /> Edit / Questions
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            if (!window.confirm('Delete this quiz and its questions?')) return;
                            await api(`/api/admin/tests/${q.id}`, { method: 'DELETE' });
                            notify('Quiz deleted.');
                            loadData();
                          }}
                          className="rounded-xl bg-rose-500/15 p-2 text-rose-400 hover:bg-rose-500/25 cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4. CATEGORIES MANAGEMENT */}
          {normalizedSection === 'categories' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-400">Categories automatically organize public course catalog filters.</p>
                <button
                  type="button"
                  onClick={() => {
                    setCatForm({ id: 0, name: '', slug: '', description: '', image: '', icon_name: 'BookOpen', is_active: true });
                    setCatModalOpen(true);
                  }}
                  className={btnPrimary}
                >
                  <Plus className="h-4 w-4" /> Add Category
                </button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {categories.map((cat) => (
                  <div key={String(cat.id)} className={`${cardCls} overflow-hidden flex flex-col`}>
                    {Boolean(cat.image) && (
                      <img src={String(cat.image)} alt={String(cat.name)} className="h-32 w-full object-cover border-b border-slate-800" />
                    )}
                    <div className="p-5 flex-1 flex flex-col justify-between gap-3">
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="font-display font-bold text-white">{String(cat.name)}</h3>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              Number(cat.is_active) === 1
                                ? 'bg-emerald-500/15 text-emerald-300'
                                : 'bg-slate-700 text-slate-300'
                            }`}
                          >
                            {Number(cat.is_active) === 1 ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <p className="text-[11px] font-mono text-[#FF7A00] mt-0.5">/{String(cat.slug)}</p>
                        <p className="mt-2 text-xs text-slate-400 line-clamp-2">{String(cat.description || 'No description')}</p>
                      </div>
                      <div className="flex items-center justify-between border-t border-slate-800 pt-3">
                        <span className="text-xs font-semibold text-slate-300">{Number(cat.courses_count || 0)} courses</span>
                        <div className="flex gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setCatForm({
                                id: Number(cat.id),
                                name: String(cat.name || ''),
                                slug: String(cat.slug || ''),
                                description: String(cat.description || ''),
                                image: String(cat.image || ''),
                                icon_name: String(cat.icon_name || 'BookOpen'),
                                is_active: Number(cat.is_active) === 1,
                              });
                              setCatModalOpen(true);
                            }}
                            className="rounded-lg bg-blue-500/15 p-1.5 text-blue-300 hover:bg-blue-500/25 cursor-pointer"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              if (!window.confirm('Delete this category?')) return;
                              await api(`/api/admin/categories/${cat.id}`, { method: 'DELETE' });
                              notify('Category deleted.');
                              refreshPublicSite();
                              loadData();
                            }}
                            className="rounded-lg bg-rose-500/15 p-1.5 text-rose-400 hover:bg-rose-500/25 cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 5. USERS MANAGEMENT */}
          {normalizedSection === 'users' && (
            <div className="space-y-5">
              <div className={`${cardCls} p-4 flex flex-wrap items-center gap-3`}>
                <div className="relative flex-1 min-w-[220px] max-w-sm">
                  <Search className="h-4 w-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="Search name, email or mobile..."
                    className={`${inputCls} pl-9 py-2 text-xs`}
                  />
                </div>
                <select
                  value={userRoleFilter}
                  onChange={(e) => setUserRoleFilter(e.target.value)}
                  className={`${inputCls} w-auto py-2 text-xs`}
                >
                  <option value="all">All Roles</option>
                  <option value="USER">USER (Students)</option>
                  <option value="FACULTY">FACULTY</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
              </div>

              <div className={`${cardCls} overflow-hidden`}>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-900/60 text-slate-400 uppercase tracking-wider">
                        <th className="py-3.5 px-4">User</th>
                        <th className="py-3.5 px-3">Role</th>
                        <th className="py-3.5 px-3">Credits</th>
                        <th className="py-3.5 px-3">Enrollments</th>
                        <th className="py-3.5 px-3">Status</th>
                        <th className="py-3.5 px-3">Joined</th>
                        <th className="py-3.5 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80">
                      {filteredUsers.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-12 text-center text-slate-400">
                            No users found. Registered learners and instructors will appear here automatically.
                          </td>
                        </tr>
                      ) : (
                      filteredUsers.map((u) => {
                        const roleDisp =
                          u.role === 'admin' ? 'ADMIN' : u.role === 'faculty' ? 'FACULTY' : 'USER';
                        return (
                          <tr key={String(u.id)} className="hover:bg-slate-800/30">
                            <td className="py-3 px-4">
                              <p className="font-bold text-slate-100">{String(u.full_name)}</p>
                              <p className="text-[11px] text-slate-400">
                                {String(u.email)} · {String(u.mobile || '—')}
                              </p>
                            </td>
                            <td className="py-3 px-3">
                              <span
                                className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                                  roleDisp === 'ADMIN'
                                    ? 'bg-[#FF7A00]/20 text-[#FF7A00]'
                                    : roleDisp === 'FACULTY'
                                    ? 'bg-blue-500/20 text-blue-300'
                                    : 'bg-slate-800 text-slate-300'
                                }`}
                              >
                                {roleDisp}
                              </span>
                            </td>
                            <td className="py-3 px-3 font-bold text-emerald-400">
                              ₹{Number(u.credits || 0).toLocaleString('en-IN')}
                            </td>
                            <td className="py-3 px-3 text-slate-300">{Number(u.enrollments_count || 0)}</td>
                            <td className="py-3 px-3">
                              <span
                                className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                  Number(u.is_active) === 1
                                    ? 'bg-emerald-500/15 text-emerald-300'
                                    : 'bg-rose-500/15 text-rose-300'
                                }`}
                              >
                                {Number(u.is_active) === 1 ? 'Active' : 'Disabled'}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-slate-400">
                              {String(u.created_at || '').slice(0, 10)}
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  title="View activity"
                                  onClick={async () => {
                                    const d = await api<Record<string, any>>(`/api/admin/users/${u.id}`);
                                    setViewingUser(d);
                                  }}
                                  className="rounded-lg bg-slate-800 p-1.5 text-slate-300 hover:text-white cursor-pointer"
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  title="Edit role / credits"
                                  onClick={() =>
                                    setEditingUser({
                                      id: u.id,
                                      full_name: u.full_name,
                                      role: roleDisp,
                                      credits: Number(u.credits || 0),
                                      is_active: Number(u.is_active) === 1,
                                    })
                                  }
                                  className="rounded-lg bg-blue-500/15 p-1.5 text-blue-300 hover:bg-blue-500/25 cursor-pointer"
                                >
                                  <Edit3 className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  title="Delete user"
                                  onClick={async () => {
                                    if (!window.confirm(`Delete user "${u.full_name}"?`)) return;
                                    try {
                                      await api(`/api/admin/users/${u.id}`, { method: 'DELETE' });
                                      notify('User deleted.');
                                      loadData();
                                    } catch (err) {
                                      notify((err as Error).message);
                                    }
                                  }}
                                  className="rounded-lg bg-rose-500/15 p-1.5 text-rose-400 hover:bg-rose-500/25 cursor-pointer"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 6. CERTIFICATES MANAGEMENT */}
          {normalizedSection === 'certificates' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-400">Issue official certificates or verify/revoke credentials.</p>
                <button
                  type="button"
                  onClick={() => {
                    setCertForm({
                      student_id: usersList[0] ? String(usersList[0].id) : '',
                      course_id: courses[0] ? String(courses[0].id) : '',
                    });
                    setCertIssueOpen(true);
                  }}
                  className={btnPrimary}
                >
                  <Plus className="h-4 w-4" /> Issue Certificate
                </button>
              </div>

              <div className={`${cardCls} overflow-hidden`}>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-900/60 text-slate-400 uppercase tracking-wider">
                        <th className="py-3.5 px-4">Certificate Code</th>
                        <th className="py-3.5 px-3">Learner</th>
                        <th className="py-3.5 px-3">Course</th>
                        <th className="py-3.5 px-3">Issued</th>
                        <th className="py-3.5 px-3">Status</th>
                        <th className="py-3.5 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80">
                      {certificates.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-12 text-center text-slate-400">
                            0 certificates issued yet. Issue or award completion credentials as students finish courses.
                          </td>
                        </tr>
                      ) : (
                      certificates.map((cert) => (
                        <tr key={String(cert.id)} className="hover:bg-slate-800/30">
                          <td className="py-3 px-4 font-mono font-bold text-[#FF7A00]">{String(cert.certificate_code)}</td>
                          <td className="py-3 px-3 font-semibold text-slate-100">{String(cert.student_name)}</td>
                          <td className="py-3 px-3 text-slate-300">{String(cert.course_title)}</td>
                          <td className="py-3 px-3 text-slate-400">{String(cert.issued_at || '').slice(0, 10)}</td>
                          <td className="py-3 px-3">
                            <span
                              className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                                cert.status === 'valid'
                                  ? 'bg-emerald-500/15 text-emerald-300'
                                  : 'bg-rose-500/15 text-rose-300'
                              }`}
                            >
                              {cert.status === 'valid' ? 'Valid' : 'Revoked'}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center justify-end gap-2">
                              <Link
                                to={`/verify-certificate?code=${cert.certificate_code}`}
                                target="_blank"
                                className={btnGhost}
                              >
                                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" /> Verify
                              </Link>
                              <button
                                type="button"
                                onClick={async () => {
                                  const next = cert.status === 'valid' ? 'revoked' : 'valid';
                                  await api(`/api/admin/certificates/${cert.id}/status`, {
                                    method: 'PATCH',
                                    body: JSON.stringify({ status: next }),
                                  });
                                  notify(`Certificate marked ${next}.`);
                                  loadData();
                                }}
                                className={btnGhost}
                              >
                                {cert.status === 'valid' ? 'Revoke' : 'Restore'}
                              </button>
                              <button
                                type="button"
                                onClick={async () => {
                                  if (!window.confirm('Delete this certificate?')) return;
                                  await api(`/api/admin/certificates/${cert.id}`, { method: 'DELETE' });
                                  notify('Certificate deleted.');
                                  loadData();
                                }}
                                className="rounded-lg bg-rose-500/15 p-1.5 text-rose-400 hover:bg-rose-500/25 cursor-pointer"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 7. PAYMENTS MANAGEMENT */}
          {normalizedSection === 'payments' && (
            <div className="space-y-5">
              <div className={`${cardCls} p-4 flex flex-wrap items-center justify-between gap-3`}>
                <div className="flex flex-wrap gap-1.5">
                  {['all', 'Created', 'Pending', 'Processing', 'Success', 'Failed', 'Cancelled', 'Refunded'].map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setPaymentStatusFilter(st)}
                      className={`rounded-xl px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                        paymentStatusFilter === st
                          ? 'bg-[#FF7A00] text-white'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {st === 'all' ? 'All' : st}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <label className="inline-flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoPollPayments}
                      onChange={(e) => setAutoPollPayments(e.target.checked)}
                      className="accent-[#FF7A00]"
                    />
                    Auto-poll 8s
                  </label>
                  <button type="button" onClick={() => loadData(false)} className={btnGhost}>
                    <RefreshCw className="h-3.5 w-3.5" /> Refresh
                  </button>
                </div>
              </div>

              <div className={`${cardCls} overflow-hidden`}>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-900/60 text-slate-400 uppercase tracking-wider">
                        <th className="py-3.5 px-4">Order / TXN ID</th>
                        <th className="py-3.5 px-3">Learner</th>
                        <th className="py-3.5 px-3">Item / Course</th>
                        <th className="py-3.5 px-3">Method</th>
                        <th className="py-3.5 px-3">Amount</th>
                        <th className="py-3.5 px-3">Status</th>
                        <th className="py-3.5 px-4 text-right">Update Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80">
                      {payments.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-12 text-center text-slate-400">
                            No payments found. Verified transactions will appear here automatically.
                          </td>
                        </tr>
                      ) : (
                      payments.map((p) => (
                        <tr key={String(p.id)} className="hover:bg-slate-800/30">
                          <td className="py-3 px-4">
                            <p className="font-mono font-bold text-slate-100">{String(p.order_ref)}</p>
                            <p className="text-[11px] font-mono text-slate-400">{String(p.gateway_txn_id || 'Pending')}</p>
                          </td>
                          <td className="py-3 px-3">
                            <p className="font-semibold text-slate-100">{String(p.student_name)}</p>
                            <p className="text-[11px] text-slate-400">{String(p.student_email)}</p>
                          </td>
                          <td className="py-3 px-3 text-slate-200">{String(p.item_title)}</td>
                          <td className="py-3 px-3 text-slate-300">{String(p.method)}</td>
                          <td className="py-3 px-3 font-bold text-white">
                            ₹{Number(p.final_amount || 0).toLocaleString('en-IN')}
                          </td>
                          <td className="py-3 px-3">
                            <PaymentStatusBadge status={String(p.status)} label={String(p.display_status || '')} />
                          </td>
                          <td className="py-3 px-4 text-right">
                            <select
                              value={String(p.display_status || 'Pending')}
                              onChange={async (e) => {
                                await api(`/api/admin/payments/${p.id}/status`, {
                                  method: 'PATCH',
                                  body: JSON.stringify({ status: e.target.value }),
                                });
                                notify(`Payment updated to ${e.target.value}.`);
                                loadData();
                              }}
                              className="rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1 text-xs font-semibold text-slate-100"
                            >
                              <option value="Pending">Pending</option>
                              <option value="Processing">Processing</option>
                              <option value="Success">Success</option>
                              <option value="Failed">Failed</option>
                              <option value="Cancelled">Cancelled</option>
                              <option value="Refunded">Refunded</option>
                            </select>
                          </td>
                        </tr>
                      ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 8. REFERRALS ANALYTICS */}
          {normalizedSection === 'referrals' && referrals && (
            <div className="space-y-6">
              {/* 6 Summary Cards */}
              <div className="grid gap-4 grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
                {[
                  { label: 'Total Referrals', value: (referrals.summary as any)?.totalReferrals ?? 0, accent: 'text-white' },
                  { label: 'Total Clicks', value: (referrals.summary as any)?.totalClicks ?? 0, accent: 'text-blue-400' },
                  { label: 'Registered Leads', value: (referrals.summary as any)?.registeredLeads ?? 0, accent: 'text-cyan-400' },
                  {
                    label: 'Enrollments',
                    value: (referrals.summary as any)?.successfulEnrollments ?? 0,
                    accent: 'text-emerald-400',
                  },
                  {
                    label: 'Referral Revenue',
                    value: `₹${Number((referrals.summary as any)?.referralRevenue || 0).toLocaleString('en-IN')}`,
                    accent: 'text-[#FF7A00]',
                  },
                  {
                    label: 'Rewards Generated',
                    value: `₹${Number((referrals.summary as any)?.rewardsGenerated || 0).toLocaleString('en-IN')}`,
                    accent: 'text-amber-400',
                  },
                ].map((m) => (
                  <div key={m.label} className={`${cardCls} p-4`}>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{m.label}</p>
                    <p className={`mt-2 font-display text-2xl font-extrabold ${m.accent}`}>{m.value}</p>
                  </div>
                ))}
              </div>

              <div className={`${cardCls} p-5 space-y-4`}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="font-display text-base font-bold text-white">Course Share & Referral Links</h2>
                  <input
                    value={referralSearch}
                    onChange={(e) => setReferralSearch(e.target.value)}
                    placeholder="Filter course or referral code..."
                    className={`${inputCls} max-w-xs py-2 text-xs`}
                  />
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider">
                        <th className="py-3 pr-3">Code</th>
                        <th className="py-3 px-3">Course</th>
                        <th className="py-3 px-3">Referrer</th>
                        <th className="py-3 px-3">Clicks</th>
                        <th className="py-3 px-3">Enrollments</th>
                        <th className="py-3 px-3">Conv. Rate</th>
                        <th className="py-3 px-3">Status</th>
                        <th className="py-3 pl-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80">
                      {((referrals.courseReferrals as Array<Record<string, unknown>>) || [])
                        .filter((r) => {
                          const q = referralSearch.trim().toLowerCase();
                          return (
                            !q ||
                            String(r.referral_code || '').toLowerCase().includes(q) ||
                            String(r.course_title || '').toLowerCase().includes(q)
                          );
                        })
                        .map((r) => (
                          <tr key={String(r.id)} className="hover:bg-slate-800/30">
                            <td className="py-3 pr-3 font-mono font-bold text-[#FF7A00]">{String(r.referral_code)}</td>
                            <td className="py-3 px-3 font-semibold text-slate-100">{String(r.course_title)}</td>
                            <td className="py-3 px-3 text-slate-300">{String(r.referrer_name)}</td>
                            <td className="py-3 px-3 font-bold text-blue-300">{Number(r.clicks || 0)}</td>
                            <td className="py-3 px-3 font-bold text-emerald-400">{Number(r.enrollments_count || 0)}</td>
                            <td className="py-3 px-3 font-semibold text-slate-200">{Number(r.conversion_rate || 0)}%</td>
                            <td className="py-3 px-3">
                              <span
                                className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                  r.status === 'active'
                                    ? 'bg-emerald-500/15 text-emerald-300'
                                    : 'bg-slate-700 text-slate-300'
                                }`}
                              >
                                {String(r.status)}
                              </span>
                            </td>
                            <td className="py-3 pl-3 text-right">
                              <button
                                type="button"
                                onClick={async () => {
                                  const next = r.status === 'active' ? 'paused' : 'active';
                                  await api(`/api/admin/referrals/${r.id}/status`, {
                                    method: 'PATCH',
                                    body: JSON.stringify({ status: next }),
                                  });
                                  loadData();
                                }}
                                className={btnGhost}
                              >
                                {r.status === 'active' ? 'Pause' : 'Resume'}
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 9. REDEMPTIONS MANAGEMENT */}
          {normalizedSection === 'redemptions' && (
            <div className="space-y-5">
              <div className={`${cardCls} p-4 flex flex-wrap items-center justify-between gap-3`}>
                <div className="flex flex-wrap gap-1.5">
                  {['all', 'Pending', 'Processing', 'Processed', 'Approved', 'Paid', 'Rejected', 'Failed'].map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setRedemptionFilter(st)}
                      className={`rounded-xl px-3 py-1.5 text-xs font-bold capitalize cursor-pointer ${
                        redemptionFilter === st
                          ? 'bg-[#FF7A00] text-white'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setRedemptionForm({
                      user_id: usersList[0] ? String(usersList[0].id) : '',
                      amount: 250,
                      method: 'UPI',
                      account_details: '',
                      notes: '',
                    });
                    setRedemptionModalOpen(true);
                  }}
                  className={btnPrimary}
                >
                  <Plus className="h-4 w-4" /> Log Payout Request
                </button>
              </div>

              <div className={`${cardCls} overflow-hidden`}>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-900/60 text-slate-400 uppercase tracking-wider">
                        <th className="py-3.5 px-4">User</th>
                        <th className="py-3.5 px-3">Amount</th>
                        <th className="py-3.5 px-3">Method & Account</th>
                        <th className="py-3.5 px-3">Status</th>
                        <th className="py-3.5 px-3">Requested</th>
                        <th className="py-3.5 px-4 text-right">Workflow</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80">
                      {redemptions.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-10 text-center text-slate-400">
                            No reward redemption requests matching this filter.
                          </td>
                        </tr>
                      ) : (
                        redemptions.map((red) => (
                          <tr key={String(red.id)} className="hover:bg-slate-800/30">
                            <td className="py-3 px-4">
                              <p className="font-bold text-slate-100">{String(red.user_name)}</p>
                              <p className="text-[11px] text-slate-400">{String(red.user_email)}</p>
                            </td>
                            <td className="py-3 px-3 font-extrabold text-[#FF7A00]">
                              ₹{Number(red.amount || 0).toLocaleString('en-IN')}
                            </td>
                            <td className="py-3 px-3 text-slate-300">
                              <p className="font-semibold">{String(red.method)}</p>
                              <p className="text-[11px] text-slate-400">{String(red.account_details || '—')}</p>
                            </td>
                            <td className="py-3 px-3">
                                <span
                                className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                                  String(red.status).toLowerCase() === 'paid'
                                    ? 'bg-emerald-500/15 text-emerald-300'
                                    : String(red.status).toLowerCase() === 'approved'
                                    ? 'bg-blue-500/15 text-blue-300'
                                    : String(red.status).toLowerCase() === 'rejected'
                                    ? 'bg-rose-500/15 text-rose-300'
                                    : 'bg-amber-500/15 text-amber-300'
                                }`}
                              >
                                {String(red.status)}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-slate-400">{String(red.created_at || '').slice(0, 10)}</td>
                            <td className="py-3 px-4">
                              <div className="flex items-center justify-end gap-1.5">
                                {String(red.status).toLowerCase() === 'pending' && (
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      await api(`/api/admin/redemptions/${red.id}`, {
                                        method: 'PATCH',
                                        body: JSON.stringify({ status: 'Approved' }),
                                      });
                                      notify('Redemption approved.');
                                      loadData();
                                    }}
                                    className={btnBlue}
                                  >
                                    Approve
                                  </button>
                                )}
                                {['pending', 'approved'].includes(String(red.status).toLowerCase()) && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={async () => {
                                        await api(`/api/admin/redemptions/${red.id}`, {
                                          method: 'PATCH',
                                          body: JSON.stringify({ status: 'Paid' }),
                                        });
                                        notify('Marked as Paid.');
                                        loadData();
                                      }}
                                      className={btnPrimary}
                                    >
                                      Mark Paid
                                    </button>
                                    <button
                                      type="button"
                                      onClick={async () => {
                                        await api(`/api/admin/redemptions/${red.id}`, {
                                          method: 'PATCH',
                                          body: JSON.stringify({ status: 'Rejected' }),
                                        });
                                        notify('Redemption rejected.');
                                        loadData();
                                      }}
                                      className="rounded-xl bg-rose-500/15 px-3 py-1.5 text-xs font-bold text-rose-400 hover:bg-rose-500/25 cursor-pointer"
                                    >
                                      Reject
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 10. SETTINGS & CMS */}
          {(normalizedSection === 'settings' || normalizedSection === 'faculty' || normalizedSection === 'batches') && cms && (
            <div className="space-y-6">
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'platform', label: 'Platform & Contact' },
                  { id: 'cms', label: 'Hero & About Media CMS' },
                  { id: 'referral', label: 'Referral Reward Rules' },
                  { id: 'faculty', label: 'Faculty Team' },
                  { id: 'batches', label: 'Batches & Cohorts' },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSettingsTab(t.id as typeof settingsTab)}
                    className={`rounded-xl px-4 py-2 text-xs font-bold cursor-pointer ${
                      settingsTab === t.id ? 'bg-[#FF7A00] text-white' : 'bg-slate-900 border border-slate-800 text-slate-300'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {settingsTab === 'platform' && (
                <form onSubmit={saveCmsSettings} className={`${cardCls} p-6 grid gap-4 sm:grid-cols-2`}>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Platform Name</label>
                    <input
                      value={cms.brand?.name || ''}
                      onChange={(e) => setCms({ ...cms, brand: { ...cms.brand, name: e.target.value } })}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Brand Tagline</label>
                    <input
                      value={cms.brand?.tagline || ''}
                      onChange={(e) => setCms({ ...cms, brand: { ...cms.brand, tagline: e.target.value } })}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Support Email</label>
                    <input
                      value={cms.contact?.email || ''}
                      onChange={(e) => setCms({ ...cms, contact: { ...cms.contact, email: e.target.value } })}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Phone / Helplines</label>
                    <input
                      value={cms.contact?.phone || ''}
                      onChange={(e) => setCms({ ...cms, contact: { ...cms.contact, phone: e.target.value } })}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">WhatsApp Support Number</label>
                    <input
                      value={cms.contact?.whatsapp || ''}
                      onChange={(e) => setCms({ ...cms, contact: { ...cms.contact, whatsapp: e.target.value } })}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Location</label>
                    <input
                      value={cms.contact?.location || ''}
                      onChange={(e) => setCms({ ...cms, contact: { ...cms.contact, location: e.target.value } })}
                      className={inputCls}
                    />
                  </div>
                  <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={async () => {
                        if (!window.confirm('Remove untouched seeded demo records (keeping real user/course data intact)?')) return;
                        const res = await api<{ ok: boolean; removed: Record<string, number> }>('/api/admin/cleanup-demo', {
                          method: 'POST',
                        });
                        notify(
                          `Cleaned demo entries (${res.removed.courses || 0} courses, ${res.removed.users || 0} users, ${res.removed.payments || 0} payments).`
                        );
                        refreshPublicSite();
                        broadcastPlatformUpdate('cleanup');
                        loadData();
                      }}
                      className={btnGhost}
                    >
                      <RefreshCw className="h-3.5 w-3.5 text-amber-400" /> Clean Untouched Demo Data
                    </button>
                    <button type="submit" className={btnPrimary}>
                      <Save className="h-4 w-4" /> Save Platform Settings
                    </button>
                  </div>
                </form>
              )}

              {settingsTab === 'cms' && (
                <form onSubmit={saveCmsSettings} className={`${cardCls} p-6 space-y-5`}>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-400 mb-1">Hero Heading</label>
                      <input
                        value={cms.hero?.heading || ''}
                        onChange={(e) => setCms({ ...cms, hero: { ...cms.hero, heading: e.target.value } })}
                        className={inputCls}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-400 mb-1">Hero Subtext</label>
                      <textarea
                        rows={2}
                        value={cms.hero?.subtext || ''}
                        onChange={(e) => setCms({ ...cms, hero: { ...cms.hero, subtext: e.target.value } })}
                        className={inputCls}
                      />
                    </div>
                    <ImageUploader
                      label="Hero Desktop Banner"
                      value={cms.hero?.desktopBgUrl || ''}
                      onChange={(url) => setCms({ ...cms, hero: { ...cms.hero, desktopBgUrl: url } })}
                      folder="o-learning/cms"
                    />
                    <ImageUploader
                      label="Hero Mobile Banner"
                      value={cms.hero?.mobileBgUrl || ''}
                      onChange={(url) => setCms({ ...cms, hero: { ...cms.hero, mobileBgUrl: url } })}
                      folder="o-learning/cms"
                    />
                    <ImageUploader
                      label="About Section Visual"
                      value={cms.about?.imageUrl || ''}
                      onChange={(url) => setCms({ ...cms, about: { ...cms.about, imageUrl: url } })}
                      folder="o-learning/cms"
                    />
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1">Vision Statement</label>
                        <textarea
                          rows={2}
                          value={cms.about?.vision || ''}
                          onChange={(e) => setCms({ ...cms, about: { ...cms.about, vision: e.target.value } })}
                          className={inputCls}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1">Mission Statement</label>
                        <textarea
                          rows={2}
                          value={cms.about?.mission || ''}
                          onChange={(e) => setCms({ ...cms, about: { ...cms.about, mission: e.target.value } })}
                          className={inputCls}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button type="submit" className={btnPrimary}>
                      <Save className="h-4 w-4" /> Publish Live CMS Changes
                    </button>
                  </div>
                </form>
              )}

              {settingsTab === 'referral' && (
                <form onSubmit={saveCmsSettings} className={`${cardCls} p-6 grid gap-4 sm:grid-cols-2`}>
                  <div className="sm:col-span-2 flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-3">
                    <div>
                      <p className="text-sm font-bold text-white">Enable Course Referral Rewards</p>
                      <p className="text-xs text-slate-400">Apply configured rewards when referred learners complete purchase.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={cms.referral?.enabled !== false}
                      onChange={(e) => setCms({ ...cms, referral: { ...cms.referral, enabled: e.target.checked } })}
                      className="h-5 w-5 accent-[#FF7A00]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Reward Type</label>
                    <select
                      value={cms.referral?.rewardType || 'fixed'}
                      onChange={(e) => setCms({ ...cms, referral: { ...cms.referral, rewardType: e.target.value } })}
                      className={inputCls}
                    >
                      <option value="fixed">Fixed ₹ Bonus</option>
                      <option value="percentage">Percentage Share (%)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Reward Amount (₹ or %)</label>
                    <input
                      type="number"
                      value={Number(cms.referral?.rewardAmount ?? 250)}
                      onChange={(e) =>
                        setCms({ ...cms, referral: { ...cms.referral, rewardAmount: Number(e.target.value) } })
                      }
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Minimum Purchase (₹)</label>
                    <input
                      type="number"
                      value={Number(cms.referral?.minPurchase ?? 0)}
                      onChange={(e) =>
                        setCms({ ...cms, referral: { ...cms.referral, minPurchase: Number(e.target.value) } })
                      }
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Maximum Reward Cap (₹)</label>
                    <input
                      type="number"
                      value={Number(cms.referral?.maxReward ?? 2500)}
                      onChange={(e) =>
                        setCms({ ...cms, referral: { ...cms.referral, maxReward: Number(e.target.value) } })
                      }
                      className={inputCls}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Default Share Message</label>
                    <input
                      value={cms.referral?.shareMessage || ''}
                      onChange={(e) =>
                        setCms({ ...cms, referral: { ...cms.referral, shareMessage: e.target.value } })
                      }
                      className={inputCls}
                    />
                  </div>
                  <div className="sm:col-span-2 flex justify-end">
                    <button type="submit" className={btnPrimary}>
                      <Save className="h-4 w-4" /> Save Referral Configuration
                    </button>
                  </div>
                </form>
              )}

              {settingsTab === 'faculty' && (
                <div className="grid gap-6 lg:grid-cols-3">
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      await api('/api/admin/faculty', { method: 'POST', body: JSON.stringify(facForm) });
                      setFacForm({
                        full_name: '',
                        email: '',
                        mobile: '',
                        password: '',
                        title: 'Senior Instructor',
                        specialization: '',
                      });
                      notify('Faculty account added.');
                      loadData();
                    }}
                    className={`${cardCls} p-5 space-y-3`}
                  >
                    <h3 className="font-display font-bold text-white flex items-center gap-2">
                      <UserCheck className="h-4 w-4 text-[#FF7A00]" /> Add Faculty Member
                    </h3>
                    <input
                      required
                      value={facForm.full_name}
                      onChange={(e) => setFacForm({ ...facForm, full_name: e.target.value })}
                      placeholder="Full Name"
                      className={inputCls}
                    />
                    <input
                      required
                      type="email"
                      value={facForm.email}
                      onChange={(e) => setFacForm({ ...facForm, email: e.target.value })}
                      placeholder="Email"
                      className={inputCls}
                    />
                    <input
                      required
                      value={facForm.mobile}
                      onChange={(e) => setFacForm({ ...facForm, mobile: e.target.value })}
                      placeholder="Mobile"
                      className={inputCls}
                    />
                    <input
                      required
                      type="password"
                      value={facForm.password}
                      onChange={(e) => setFacForm({ ...facForm, password: e.target.value })}
                      placeholder="Temporary Password"
                      className={inputCls}
                    />
                    <input
                      value={facForm.specialization}
                      onChange={(e) => setFacForm({ ...facForm, specialization: e.target.value })}
                      placeholder="Specialization (e.g., Spoken English)"
                      className={inputCls}
                    />
                    <button type="submit" className={`${btnPrimary} w-full`}>
                      Create Faculty
                    </button>
                  </form>

                  <div className={`${cardCls} lg:col-span-2 p-5 grid gap-3 sm:grid-cols-2`}>
                    {faculty.map((f) => (
                      <div key={String(f.id)} className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-xs">
                        <p className="font-bold text-white text-sm">{String(f.full_name)}</p>
                        <p className="text-[#FF7A00] font-semibold">{String(f.title || 'Faculty')}</p>
                        <p className="mt-1 text-slate-400">{String(f.email)}</p>
                        <p className="mt-2 text-slate-300">
                          {Number(f.courses_count || 0)} courses · {Number(f.batches_count || 0)} batches
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {settingsTab === 'batches' && (
                <div className="grid gap-6 lg:grid-cols-3">
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      await api('/api/admin/batches', {
                        method: 'POST',
                        body: JSON.stringify({
                          ...batchForm,
                          course_id: batchForm.course_id || courses[0]?.id,
                          faculty_id: batchForm.faculty_id || faculty[0]?.id,
                        }),
                      });
                      setBatchForm({
                        name: '',
                        course_id: '',
                        faculty_id: '',
                        start_date: '',
                        end_date: '',
                        timings: '7:00 PM - 8:30 PM',
                        total_seats: 60,
                        status: 'upcoming',
                      });
                      notify('Batch scheduled.');
                      loadData();
                    }}
                    className={`${cardCls} p-5 space-y-3`}
                  >
                    <h3 className="font-display font-bold text-white">Schedule Batch</h3>
                    <input
                      required
                      value={batchForm.name}
                      onChange={(e) => setBatchForm({ ...batchForm, name: e.target.value })}
                      placeholder="Batch Name"
                      className={inputCls}
                    />
                    <select
                      value={batchForm.course_id || String(courses[0]?.id || '')}
                      onChange={(e) => setBatchForm({ ...batchForm, course_id: e.target.value })}
                      className={inputCls}
                    >
                      {courses.map((c) => (
                        <option key={String(c.id)} value={String(c.id)}>
                          {String(c.title)}
                        </option>
                      ))}
                    </select>
                    <input
                      required
                      type="date"
                      value={batchForm.start_date}
                      onChange={(e) => setBatchForm({ ...batchForm, start_date: e.target.value })}
                      className={inputCls}
                    />
                    <input
                      required
                      type="date"
                      value={batchForm.end_date}
                      onChange={(e) => setBatchForm({ ...batchForm, end_date: e.target.value })}
                      className={inputCls}
                    />
                    <input
                      value={batchForm.timings}
                      onChange={(e) => setBatchForm({ ...batchForm, timings: e.target.value })}
                      className={inputCls}
                    />
                    <button type="submit" className={`${btnPrimary} w-full`}>
                      Create Batch
                    </button>
                  </form>

                  <div className={`${cardCls} lg:col-span-2 p-5 grid gap-3 sm:grid-cols-2`}>
                    {batches.map((b) => (
                      <div key={String(b.id)} className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white text-sm">{String(b.name)}</span>
                          <span className="rounded-full bg-blue-500/15 px-2 py-0.5 text-[10px] font-bold text-blue-300">
                            {String(b.status)}
                          </span>
                        </div>
                        <p className="mt-1 text-[#FF7A00] font-semibold">{String(b.course_title)}</p>
                        <p className="mt-1 text-slate-400">
                          {String(b.start_date)} → {String(b.end_date)} · {String(b.timings)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* COURSE MODAL */}
      <AdminCourseModal
        open={courseModalOpen}
        initial={editingCourse}
        categories={categories.map((c) => ({ id: Number(c.id), name: String(c.name), slug: String(c.slug) }))}
        faculty={faculty.map((f) => ({ id: Number(f.id), full_name: String(f.full_name) }))}
        onClose={() => setCourseModalOpen(false)}
        onSaved={() => {
          notify('Course saved.');
          refreshPublicSite();
          broadcastPlatformUpdate('course');
          loadData(true);
        }}
      />

      {/* QUIZ MODAL */}
      <AdminQuizModal
        open={quizModalOpen}
        initial={editingQuiz}
        courses={courses.map((c) => ({ id: Number(c.id), title: String(c.title) }))}
        onClose={() => setQuizModalOpen(false)}
        onSaved={() => {
          notify('Quiz saved.');
          refreshPublicSite();
          broadcastPlatformUpdate('quiz');
          loadData(true);
        }}
      />

      {/* CATEGORY MODAL */}
      {catModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-xs">
          <form onSubmit={saveCategory} className="w-full max-w-lg rounded-2xl border border-slate-800 bg-[#0F172A] p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-bold text-white">
                {catForm.id ? 'Edit Category' : 'Add Category'}
              </h3>
              <button type="button" onClick={() => setCatModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>
            <input
              required
              value={catForm.name}
              onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
              placeholder="Category Name"
              className={inputCls}
            />
            <input
              value={catForm.slug}
              onChange={(e) => setCatForm({ ...catForm, slug: e.target.value })}
              placeholder="Slug (auto-generated if empty)"
              className={inputCls}
            />
            <textarea
              rows={2}
              value={catForm.description}
              onChange={(e) => setCatForm({ ...catForm, description: e.target.value })}
              placeholder="Short category description"
              className={inputCls}
            />
            <ImageUploader
              label="Category Cover Image"
              value={catForm.image}
              onChange={(url) => setCatForm({ ...catForm, image: url })}
              folder="o-learning/categories"
            />
            <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-200 cursor-pointer">
              <input
                type="checkbox"
                checked={catForm.is_active}
                onChange={(e) => setCatForm({ ...catForm, is_active: e.target.checked })}
                className="accent-[#FF7A00]"
              />
              Active Category
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setCatModalOpen(false)} className={btnGhost}>
                Cancel
              </button>
              <button type="submit" className={btnPrimary}>
                Save Category
              </button>
            </div>
          </form>
        </div>
      )}

      {/* EDIT USER MODAL */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-xs">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              await api(`/api/admin/users/${editingUser.id}`, {
                method: 'PUT',
                body: JSON.stringify(editingUser),
              });
              setEditingUser(null);
              notify('User updated.');
              loadData();
            }}
            className="w-full max-w-md rounded-2xl border border-slate-800 bg-[#0F172A] p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-bold text-white">Edit User Account</h3>
              <button type="button" onClick={() => setEditingUser(null)} className="text-slate-400 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Full Name</label>
              <input
                value={editingUser.full_name}
                onChange={(e) => setEditingUser({ ...editingUser, full_name: e.target.value })}
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Role</label>
              <select
                value={editingUser.role}
                onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
                className={inputCls}
              >
                <option value="USER">USER (Student)</option>
                <option value="FACULTY">FACULTY</option>
                <option value="ADMIN">ADMIN</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Wallet / Referral Credits (₹)</label>
              <input
                type="number"
                min={0}
                value={editingUser.credits}
                onChange={(e) => setEditingUser({ ...editingUser, credits: Number(e.target.value) })}
                className={inputCls}
              />
            </div>
            <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-200 cursor-pointer">
              <input
                type="checkbox"
                checked={editingUser.is_active}
                onChange={(e) => setEditingUser({ ...editingUser, is_active: e.target.checked })}
                className="accent-[#FF7A00]"
              />
              Account Active
            </label>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setEditingUser(null)} className={btnGhost}>
                Cancel
              </button>
              <button type="submit" className={btnPrimary}>
                Save User
              </button>
            </div>
          </form>
        </div>
      )}

      {/* VIEW USER DETAILS MODAL */}
      {viewingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-xs">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-800 bg-[#0F172A] p-6 space-y-4 max-h-[88vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display text-lg font-bold text-white">{viewingUser.user?.full_name}</h3>
                <p className="text-xs text-slate-400">{viewingUser.user?.email} · Credits ₹{viewingUser.user?.credits || 0}</p>
              </div>
              <button type="button" onClick={() => setViewingUser(null)} className="text-slate-400 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 text-xs">
              <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
                <p className="font-bold text-[#FF7A00] mb-2">Enrollments ({viewingUser.enrollments?.length || 0})</p>
                {(viewingUser.enrollments || []).map((en: any) => (
                  <p key={en.id} className="text-slate-300 py-0.5">
                    • {en.course_title} ({en.progress_percent}%)
                  </p>
                ))}
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
                <p className="font-bold text-blue-400 mb-2">Payments ({viewingUser.payments?.length || 0})</p>
                {(viewingUser.payments || []).map((pm: any) => (
                  <p key={pm.id} className="text-slate-300 py-0.5">
                    • {pm.item_title} — ₹{pm.final_amount} ({pm.status})
                  </p>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ISSUE CERTIFICATE MODAL */}
      {certIssueOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-xs">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              await api('/api/admin/certificates', { method: 'POST', body: JSON.stringify(certForm) });
              setCertIssueOpen(false);
              notify('Certificate issued successfully.');
              loadData();
            }}
            className="w-full max-w-md rounded-2xl border border-slate-800 bg-[#0F172A] p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-bold text-white">Issue Completion Certificate</h3>
              <button type="button" onClick={() => setCertIssueOpen(false)} className="text-slate-400 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Select Learner</label>
              <select
                value={certForm.student_id}
                onChange={(e) => setCertForm({ ...certForm, student_id: e.target.value })}
                className={inputCls}
              >
                {usersList.map((u) => (
                  <option key={String(u.id)} value={String(u.id)}>
                    {String(u.full_name)} ({String(u.email)})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Select Course</label>
              <select
                value={certForm.course_id}
                onChange={(e) => setCertForm({ ...certForm, course_id: e.target.value })}
                className={inputCls}
              >
                {courses.map((c) => (
                  <option key={String(c.id)} value={String(c.id)}>
                    {String(c.title)}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setCertIssueOpen(false)} className={btnGhost}>
                Cancel
              </button>
              <button type="submit" className={btnPrimary}>
                Issue Certificate
              </button>
            </div>
          </form>
        </div>
      )}

      {/* LOG REDEMPTION MODAL */}
      {redemptionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-xs">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              await api('/api/admin/redemptions', { method: 'POST', body: JSON.stringify(redemptionForm) });
              setRedemptionModalOpen(false);
              notify('Payout request logged.');
              loadData();
            }}
            className="w-full max-w-md rounded-2xl border border-slate-800 bg-[#0F172A] p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-bold text-white">Log Referral Payout</h3>
              <button type="button" onClick={() => setRedemptionModalOpen(false)} className="text-slate-400 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>
            <select
              value={redemptionForm.user_id}
              onChange={(e) => setRedemptionForm({ ...redemptionForm, user_id: e.target.value })}
              className={inputCls}
            >
              {usersList.map((u) => (
                <option key={String(u.id)} value={String(u.id)}>
                  {String(u.full_name)} ({String(u.email)})
                </option>
              ))}
            </select>
            <input
              type="number"
              min={1}
              value={redemptionForm.amount}
              onChange={(e) => setRedemptionForm({ ...redemptionForm, amount: Number(e.target.value) })}
              placeholder="Amount (₹)"
              className={inputCls}
            />
            <input
              value={redemptionForm.account_details}
              onChange={(e) => setRedemptionForm({ ...redemptionForm, account_details: e.target.value })}
              placeholder="UPI ID or Bank Reference"
              className={inputCls}
            />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setRedemptionModalOpen(false)} className={btnGhost}>
                Cancel
              </button>
              <button type="submit" className={btnPrimary}>
                Create Request
              </button>
            </div>
          </form>
        </div>
      )}
    </DashboardLayout>
  );
}
