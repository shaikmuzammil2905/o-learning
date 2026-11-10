import { useEffect, useState } from 'react';
import {
  Award,
  BarChart3,
  BookOpen,
  Calendar,
  CheckCircle2,
  ClipboardCheck,
  CreditCard,
  Gift,
  Globe,
  IndianRupee,
  LayoutDashboard,
  Mail,
  Plus,
  Radio,
  Search,
  Sparkles,
  Trash2,
  UserCheck,
  Users,
} from 'lucide-react';
import { DashboardLayout, type SidebarLink } from '../../components/DashboardLayout';
import { CertificateView } from '../../components/CertificateView';
import { ErrorState, LoadingState } from '../../components/ui/StateViews';
import { useSite } from '../../context/SiteContext';
import { api, formatCurrency, formatDateTime } from '../../lib/api';
import type { Certificate, CmsSettings } from '../../types';

const ADMIN_LINKS: SidebarLink[] = [
  { to: '/admin', label: 'Analytics Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/courses', label: 'Courses & Categories', icon: BookOpen },
  { to: '/admin/students', label: 'Students', icon: Users },
  { to: '/admin/faculty', label: 'Faculty', icon: UserCheck },
  { to: '/admin/batches', label: 'Batches & Live', icon: Calendar },
  { to: '/admin/tests', label: 'Tests & Questions', icon: ClipboardCheck },
  { to: '/admin/payments', label: 'Payments & Plans', icon: CreditCard },
  { to: '/admin/certificates', label: 'Referrals & Certs', icon: Award },
  { to: '/admin/cms', label: 'Website CMS & Inbox', icon: Globe },
];

export function AdminPortal({ section = 'overview' }: { section?: string }) {
  const { refreshSite, cms } = useSite();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  // Overview state
  const [dash, setDash] = useState<{
    metrics: Record<string, number>;
    coursePerformance: Array<{ id: number; title: string; enrollments: number; avg_progress: number }>;
    recentPayments: Array<{ id: number; order_ref: string; student_name: string; item_title: string; final_amount: number; status: string; method: string }>;
    recentActivity: Array<{ ts: string; student_name: string; course_title: string; progress_percent: number }>;
    revenueByMethod: Array<{ method: string; count: number; total: number }>;
  } | null>(null);

  // Domain states
  const [courses, setCourses] = useState<Array<Record<string, any>>>([]);
  const [categories, setCategories] = useState<Array<Record<string, any>>>([]);
  const [students, setStudents] = useState<Array<Record<string, any>>>([]);
  const [facultyList, setFacultyList] = useState<Array<Record<string, any>>>([]);
  const [batches, setBatches] = useState<Array<Record<string, any>>>([]);
  const [liveClasses, setLiveClasses] = useState<Array<Record<string, any>>>([]);
  const [tests, setTests] = useState<Array<Record<string, any>>>([]);
  const [payments, setPayments] = useState<Array<Record<string, any>>>([]);
  const [plans, setPlans] = useState<Array<Record<string, any>>>([]);
  const [referrals, setReferrals] = useState<Array<Record<string, any>>>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [enquiries, setEnquiries] = useState<Array<Record<string, any>>>([]);

  // Filters / Selection
  const [studentSearch, setStudentSearch] = useState('');
  const [studentDetail, setStudentDetail] = useState<any>(null);
  const [payFilter, setPayFilter] = useState('all');
  const [previewCert, setPreviewCert] = useState<Certificate | null>(null);

  // Forms
  const [newCourse, setNewCourse] = useState({
    title: '',
    short_description: '',
    price: '1999',
    discount_price: '999',
    duration: '12 Weeks',
    level: 'Beginner to Advanced',
    category_id: '',
    faculty_id: '',
  });
  const [editingCourse, setEditingCourse] = useState<any>(null);
  const [newCatName, setNewCatName] = useState('');

  const [newFaculty, setNewFaculty] = useState({
    full_name: '',
    email: '',
    mobile: '',
    password: '',
    title: 'Senior Instructor',
    specialization: '',
  });

  const [newBatch, setNewBatch] = useState({
    name: '',
    course_id: '',
    faculty_id: '',
    start_date: '2026-12-01',
    end_date: '2027-03-01',
    timings: 'Mon-Fri · 7:00 PM IST',
    total_seats: '60',
    status: 'upcoming',
  });

  const [newLive, setNewLive] = useState({
    title: '',
    course_id: '',
    faculty_id: '',
    scheduled_at: '',
    duration_minutes: '60',
    meeting_url: 'https://meet.jit.si/olearning-live',
    status: 'upcoming',
  });

  const [newTest, setNewTest] = useState({
    title: '',
    course_id: '',
    duration_minutes: '20',
    total_marks: '10',
    pass_marks: '5',
    negative_marks: '0',
    difficulty: 'Medium',
  });
  const [selectedTestId, setSelectedTestId] = useState<number | null>(null);
  const [testQuestions, setTestQuestions] = useState<Array<Record<string, any>>>([]);
  const [newQuestion, setNewQuestion] = useState({
    question_text: '',
    opt0: '',
    opt1: '',
    opt2: '',
    opt3: '',
    correct_index: '0',
    marks: '2',
  });

  const [newPlan, setNewPlan] = useState({
    name: '',
    price: '1499',
    duration_months: '3',
    badge: 'New',
    featuresText: 'Live Classes, Recorded Videos, Practice Tests',
  });

  const [cmsDraft, setCmsDraft] = useState<CmsSettings>(cms);

  useEffect(() => {
    setCmsDraft(cms);
  }, [cms]);

  const notify = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const loadSection = async () => {
    setLoading(true);
    setError('');
    try {
      if (section === 'overview') {
        const d = await api<typeof dash>('/api/admin/dashboard');
        setDash(d);
      } else if (section === 'courses') {
        const [c, cat, fac] = await Promise.all([
          api<any[]>('/api/admin/courses'),
          api<any[]>('/api/admin/categories'),
          api<any[]>('/api/admin/faculty'),
        ]);
        setCourses(c);
        setCategories(cat);
        setFacultyList(fac);
      } else if (section === 'students') {
        const s = await api<any[]>(`/api/admin/students?search=${encodeURIComponent(studentSearch)}`);
        setStudents(s);
      } else if (section === 'faculty') {
        const f = await api<any[]>('/api/admin/faculty');
        setFacultyList(f);
      } else if (section === 'batches') {
        const [b, lc, c, f] = await Promise.all([
          api<any[]>('/api/admin/batches'),
          api<any[]>('/api/admin/live-classes'),
          api<any[]>('/api/admin/courses'),
          api<any[]>('/api/admin/faculty'),
        ]);
        setBatches(b);
        setLiveClasses(lc);
        setCourses(c);
        setFacultyList(f);
      } else if (section === 'tests') {
        const [t, c] = await Promise.all([api<any[]>('/api/admin/tests'), api<any[]>('/api/admin/courses')]);
        setTests(t);
        setCourses(c);
      } else if (section === 'payments') {
        const [p, pl] = await Promise.all([
          api<any[]>(`/api/admin/payments?status=${payFilter}`),
          api<any[]>('/api/admin/plans'),
        ]);
        setPayments(p);
        setPlans(pl);
      } else if (section === 'certificates') {
        const [r, certs] = await Promise.all([
          api<any[]>('/api/admin/referrals'),
          api<Certificate[]>('/api/admin/certificates'),
        ]);
        setReferrals(r);
        setCertificates(certs);
      } else if (section === 'cms') {
        const enq = await api<any[]>('/api/admin/enquiries');
        setEnquiries(enq);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load admin data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSection();
  }, [section, payFilter]);

  return (
    <DashboardLayout
      title="Admin Management Portal"
      subtitle="Full control over courses, faculty, students, batches, tests, payments, and live website CMS"
      links={ADMIN_LINKS}
    >
      {toast && (
        <div className="mb-4 p-3.5 rounded-2xl bg-emerald-600 text-white text-xs font-bold flex items-center gap-2 shadow-lg">
          <CheckCircle2 className="w-4 h-4" /> {toast}
        </div>
      )}

      {loading ? (
        <LoadingState message="Loading admin data…" />
      ) : error ? (
        <ErrorState message={error} onRetry={loadSection} />
      ) : (
        <div className="space-y-6">
          {/* ==================== 1. ANALYTICS DASHBOARD ==================== */}
          {section === 'overview' && dash && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Total Students', value: dash.metrics.totalStudents, icon: Users },
                  { label: 'Active Courses', value: dash.metrics.activeCourses, icon: BookOpen },
                  { label: 'Total Revenue', value: formatCurrency(dash.metrics.totalRevenue), icon: IndianRupee },
                  { label: "Today's Enrollments", value: dash.metrics.todaysEnrollments, icon: BarChart3 },
                  { label: 'Active Subscriptions', value: dash.metrics.activeSubscriptions, icon: Sparkles },
                  { label: 'Live Classes', value: dash.metrics.liveClassesCount, icon: Radio },
                  { label: 'Pending Payments', value: dash.metrics.pendingPayments, icon: CreditCard },
                ].map((m) => {
                  const Icon = m.icon;
                  return (
                    <div key={m.label} className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 flex items-center gap-3.5 shadow-xs">
                      <div className="w-11 h-11 rounded-xl bg-blue-50 text-[#0052CC] flex items-center justify-center shrink-0">
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-display font-extrabold text-xl sm:text-2xl text-slate-900 truncate">
                          {m.value}
                        </p>
                        <p className="text-xs font-semibold text-slate-500 truncate">{m.label}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-7 bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
                  <h2 className="font-display font-bold text-base text-[#002B7A] mb-4">
                    Course Performance (Enrollments & Avg Completion)
                  </h2>
                  <div className="space-y-3.5">
                    {dash.coursePerformance.map((cp) => (
                      <div key={cp.id}>
                        <div className="flex justify-between text-xs font-bold mb-1">
                          <span className="text-slate-800 truncate">{cp.title}</span>
                          <span className="text-[#0052CC] shrink-0">
                            {cp.enrollments} enrolled · {cp.avg_progress}% avg
                          </span>
                        </div>
                        <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-[#0052CC] to-[#FF7A00] rounded-full"
                            style={{ width: `${Math.max(8, Math.min(100, cp.enrollments * 20))}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="lg:col-span-5 bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-5">
                  <div>
                    <h2 className="font-display font-bold text-base text-[#002B7A] mb-3">
                      Revenue by Payment Method
                    </h2>
                    <div className="space-y-2.5">
                      {dash.revenueByMethod.map((r) => (
                        <div key={r.method} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 text-xs">
                          <span className="font-bold text-slate-800">
                            {r.method} ({r.count} txns)
                          </span>
                          <span className="font-extrabold text-[#0052CC]">{formatCurrency(r.total)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-display font-bold text-sm text-[#002B7A] mb-2">Recent Student Activity</h3>
                    <div className="space-y-2">
                      {dash.recentActivity.slice(0, 4).map((a, i) => (
                        <div key={i} className="text-xs p-2.5 rounded-xl bg-blue-50/50 flex justify-between gap-2">
                          <span className="truncate">
                            <strong>{a.student_name}</strong> enrolled in {a.course_title}
                          </span>
                          <span className="text-[#FF7A00] font-bold shrink-0">{a.progress_percent}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ==================== 2. COURSES & CATEGORIES ==================== */}
          {section === 'courses' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Create / Edit Course Form */}
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (editingCourse) {
                      await api(`/api/admin/courses/${editingCourse.id}`, {
                        method: 'PUT',
                        body: JSON.stringify(editingCourse),
                      });
                      setEditingCourse(null);
                      notify('Course updated! Public website refreshed.');
                    } else {
                      await api('/api/admin/courses', {
                        method: 'POST',
                        body: JSON.stringify(newCourse),
                      });
                      setNewCourse({
                        title: '',
                        short_description: '',
                        price: '1999',
                        discount_price: '999',
                        duration: '12 Weeks',
                        level: 'Beginner to Advanced',
                        category_id: '',
                        faculty_id: '',
                      });
                      notify('New course published!');
                    }
                    await refreshSite();
                    loadSection();
                  }}
                  className="lg:col-span-5 bg-white rounded-2xl p-6 border border-slate-200 space-y-3 h-fit"
                >
                  <h2 className="font-display font-bold text-base text-[#002B7A] flex items-center gap-2">
                    <Plus className="w-4 h-4 text-[#FF7A00]" />
                    {editingCourse ? `Edit Course: ${editingCourse.title}` : 'Add New Course'}
                  </h2>
                  <input
                    required
                    placeholder="Course Title"
                    value={editingCourse ? editingCourse.title : newCourse.title}
                    onChange={(e) =>
                      editingCourse
                        ? setEditingCourse({ ...editingCourse, title: e.target.value })
                        : setNewCourse({ ...newCourse, title: e.target.value })
                    }
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs"
                  />
                  <textarea
                    required
                    rows={2}
                    placeholder="Short Description"
                    value={editingCourse ? editingCourse.short_description : newCourse.short_description}
                    onChange={(e) =>
                      editingCourse
                        ? setEditingCourse({ ...editingCourse, short_description: e.target.value })
                        : setNewCourse({ ...newCourse, short_description: e.target.value })
                    }
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      placeholder="Price (₹)"
                      value={editingCourse ? editingCourse.price : newCourse.price}
                      onChange={(e) =>
                        editingCourse
                          ? setEditingCourse({ ...editingCourse, price: e.target.value })
                          : setNewCourse({ ...newCourse, price: e.target.value })
                      }
                      className="px-3 py-2.5 rounded-xl border border-slate-300 text-xs"
                    />
                    <input
                      type="number"
                      placeholder="Discount Price (₹)"
                      value={editingCourse ? (editingCourse.discount_price ?? '') : newCourse.discount_price}
                      onChange={(e) =>
                        editingCourse
                          ? setEditingCourse({ ...editingCourse, discount_price: e.target.value })
                          : setNewCourse({ ...newCourse, discount_price: e.target.value })
                      }
                      className="px-3 py-2.5 rounded-xl border border-slate-300 text-xs"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      placeholder="Duration (e.g. 12 Weeks)"
                      value={editingCourse ? editingCourse.duration : newCourse.duration}
                      onChange={(e) =>
                        editingCourse
                          ? setEditingCourse({ ...editingCourse, duration: e.target.value })
                          : setNewCourse({ ...newCourse, duration: e.target.value })
                      }
                      className="px-3 py-2.5 rounded-xl border border-slate-300 text-xs"
                    />
                    <select
                      value={editingCourse ? (editingCourse.faculty_id ?? '') : newCourse.faculty_id}
                      onChange={(e) =>
                        editingCourse
                          ? setEditingCourse({ ...editingCourse, faculty_id: e.target.value })
                          : setNewCourse({ ...newCourse, faculty_id: e.target.value })
                      }
                      className="px-3 py-2.5 rounded-xl border border-slate-300 text-xs bg-white"
                    >
                      <option value="">Assign Faculty</option>
                      {facultyList.map((f) => (
                        <option key={f.id} value={f.id}>{f.full_name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <button type="submit" className="flex-1 py-2.5 rounded-xl bg-[#0052CC] text-white text-xs font-bold cursor-pointer">
                      {editingCourse ? 'Save Course Changes' : 'Create Course'}
                    </button>
                    {editingCourse && (
                      <button
                        type="button"
                        onClick={() => setEditingCourse(null)}
                        className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-bold cursor-pointer"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </form>

                {/* Courses Table */}
                <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 overflow-hidden">
                  <div className="p-5 border-b border-slate-200 flex items-center justify-between">
                    <h2 className="font-display font-bold text-base text-[#002B7A]">All Courses ({courses.length})</h2>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {courses.map((c) => (
                      <div key={c.id} className="p-4 flex flex-wrap items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-sm text-slate-900 truncate">{c.title}</p>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                c.is_published ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                              }`}
                            >
                              {c.is_published ? 'Published' : 'Draft'}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {c.is_free ? 'FREE' : formatCurrency(c.discount_price ?? c.price)} · {c.faculty_name || 'Unassigned'} · {c.enrolled_count} enrolled
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingCourse(c)}
                            className="px-3 py-1.5 rounded-lg bg-blue-50 text-[#0052CC] text-xs font-bold cursor-pointer"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              await api(`/api/admin/courses/${c.id}`, {
                                method: 'PUT',
                                body: JSON.stringify({ is_published: !c.is_published }),
                              });
                              await refreshSite();
                              loadSection();
                            }}
                            className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold cursor-pointer"
                          >
                            {c.is_published ? 'Unpublish' : 'Publish'}
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              await api(`/api/admin/courses/${c.id}`, { method: 'DELETE' });
                              await refreshSite();
                              loadSection();
                            }}
                            className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 cursor-pointer"
                            aria-label="Delete course"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Categories Bar */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200 flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-[#002B7A] mr-2">Categories:</span>
                  {categories.map((cat) => (
                    <span key={cat.id} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-xs font-semibold">
                      {cat.name}
                      <button
                        type="button"
                        onClick={async () => {
                          await api(`/api/admin/categories/${cat.id}`, { method: 'DELETE' });
                          await refreshSite();
                          loadSection();
                        }}
                        className="text-red-500 hover:text-red-700 cursor-pointer"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!newCatName.trim()) return;
                    await api('/api/admin/categories', { method: 'POST', body: JSON.stringify({ name: newCatName }) });
                    setNewCatName('');
                    await refreshSite();
                    loadSection();
                  }}
                  className="flex gap-2"
                >
                  <input
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    placeholder="New category…"
                    className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs"
                  />
                  <button type="submit" className="px-4 py-1.5 rounded-xl bg-[#FF7A00] text-white text-xs font-bold cursor-pointer">
                    Add
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* ==================== 3. STUDENTS MANAGEMENT ==================== */}
          {section === 'students' && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && loadSection()}
                    placeholder="Search student by name, email, or mobile…"
                    className="w-full pl-10 pr-20 py-2.5 rounded-xl bg-white border border-slate-200 text-xs"
                  />
                  <button
                    type="button"
                    onClick={loadSection}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1 rounded-lg bg-[#0052CC] text-white text-xs font-bold cursor-pointer"
                  >
                    Search
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                      <tr>
                        <th className="px-5 py-3">Student</th>
                        <th className="px-5 py-3">Mobile</th>
                        <th className="px-5 py-3">Courses</th>
                        <th className="px-5 py-3">Spent</th>
                        <th className="px-5 py-3">Status</th>
                        <th className="px-5 py-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {students.map((s) => (
                        <tr key={s.id}>
                          <td className="px-5 py-3.5 font-bold text-slate-900">
                            {s.full_name}
                            <div className="text-[11px] font-normal text-slate-500">{s.email}</div>
                          </td>
                          <td className="px-5 py-3.5 text-slate-600">{s.mobile}</td>
                          <td className="px-5 py-3.5 font-bold text-[#0052CC]">{s.enrollments_count}</td>
                          <td className="px-5 py-3.5 font-bold text-slate-800">{formatCurrency(s.total_spent)}</td>
                          <td className="px-5 py-3.5">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                                s.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                              }`}
                            >
                              {s.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 flex gap-2">
                            <button
                              type="button"
                              onClick={async () => setStudentDetail(await api(`/api/admin/students/${s.id}`))}
                              className="px-3 py-1 rounded-lg bg-blue-50 text-[#0052CC] text-xs font-bold cursor-pointer"
                            >
                              View
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                await api(`/api/admin/students/${s.id}/status`, {
                                  method: 'PATCH',
                                  body: JSON.stringify({ is_active: !s.is_active }),
                                });
                                loadSection();
                              }}
                              className="px-3 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold cursor-pointer"
                            >
                              {s.is_active ? 'Deactivate' : 'Activate'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {studentDetail && (
                <div className="bg-white rounded-2xl p-6 border border-[#0052CC]/30 space-y-3">
                  <div className="flex justify-between items-center">
                    <h3 className="font-display font-bold text-base text-[#002B7A]">
                      {studentDetail.student.full_name} — Profile Summary
                    </h3>
                    <button onClick={() => setStudentDetail(null)} className="text-xs font-bold text-slate-500 cursor-pointer">
                      Close ×
                    </button>
                  </div>
                  <p className="text-xs text-slate-600">
                    Enrollments: {studentDetail.enrollments.length} · Payments: {studentDetail.payments.length} · Certificates: {studentDetail.certificates.length}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ==================== 4. FACULTY MANAGEMENT ==================== */}
          {section === 'faculty' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  await api('/api/admin/faculty', { method: 'POST', body: JSON.stringify(newFaculty) });
                  setNewFaculty({ full_name: '', email: '', mobile: '', password: '', title: 'Senior Instructor', specialization: '' });
                  notify('Faculty member added!');
                  loadSection();
                }}
                className="lg:col-span-4 bg-white rounded-2xl p-6 border border-slate-200 space-y-3 h-fit"
              >
                <h2 className="font-display font-bold text-base text-[#002B7A]">Add Faculty Member</h2>
                <input required placeholder="Full Name" value={newFaculty.full_name} onChange={(e) => setNewFaculty({ ...newFaculty, full_name: e.target.value })} className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs" />
                <input required type="email" placeholder="Email" value={newFaculty.email} onChange={(e) => setNewFaculty({ ...newFaculty, email: e.target.value })} className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs" />
                <input required placeholder="Mobile" value={newFaculty.mobile} onChange={(e) => setNewFaculty({ ...newFaculty, mobile: e.target.value })} className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs" />
                <input required type="password" placeholder="Temporary Password" value={newFaculty.password} onChange={(e) => setNewFaculty({ ...newFaculty, password: e.target.value })} className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs" />
                <input placeholder="Title / Designation" value={newFaculty.title} onChange={(e) => setNewFaculty({ ...newFaculty, title: e.target.value })} className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs" />
                <input placeholder="Specialization" value={newFaculty.specialization} onChange={(e) => setNewFaculty({ ...newFaculty, specialization: e.target.value })} className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs" />
                <button type="submit" className="w-full py-2.5 rounded-xl bg-[#0052CC] text-white text-xs font-bold cursor-pointer">
                  Create Faculty Account
                </button>
              </form>

              <div className="lg:col-span-8 space-y-3">
                {facultyList.map((f) => (
                  <div key={f.id} className="bg-white rounded-2xl p-5 border border-slate-200 flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <h3 className="font-bold text-base text-slate-900">{f.full_name}</h3>
                      <p className="text-xs font-semibold text-[#FF7A00]">{f.title}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {f.email} · {f.courses_count} Courses · {f.batches_count} Batches
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        await api(`/api/admin/faculty/${f.id}`, {
                          method: 'PUT',
                          body: JSON.stringify({ is_active: !f.is_active }),
                        });
                        loadSection();
                      }}
                      className={`px-4 py-2 rounded-xl text-xs font-bold cursor-pointer ${
                        f.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                      }`}
                    >
                      {f.is_active ? 'Active (Click to Pause)' : 'Inactive (Activate)'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ==================== 5. BATCHES & LIVE CLASSES ==================== */}
          {section === 'batches' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    await api('/api/admin/batches', { method: 'POST', body: JSON.stringify(newBatch) });
                    setNewBatch({ ...newBatch, name: '' });
                    notify('Batch created!');
                    loadSection();
                  }}
                  className="bg-white rounded-2xl p-6 border border-slate-200 space-y-3"
                >
                  <h2 className="font-display font-bold text-base text-[#002B7A]">Create Batch</h2>
                  <input required placeholder="Batch Name" value={newBatch.name} onChange={(e) => setNewBatch({ ...newBatch, name: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs" />
                  <div className="grid grid-cols-2 gap-2">
                    <select required value={newBatch.course_id} onChange={(e) => setNewBatch({ ...newBatch, course_id: e.target.value })} className="px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white">
                      <option value="">Select Course</option>
                      {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                    </select>
                    <select value={newBatch.faculty_id} onChange={(e) => setNewBatch({ ...newBatch, faculty_id: e.target.value })} className="px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white">
                      <option value="">Select Faculty</option>
                      {facultyList.map((f) => <option key={f.id} value={f.id}>{f.full_name}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input type="date" value={newBatch.start_date} onChange={(e) => setNewBatch({ ...newBatch, start_date: e.target.value })} className="px-3 py-2 rounded-xl border border-slate-300 text-xs" />
                    <input type="date" value={newBatch.end_date} onChange={(e) => setNewBatch({ ...newBatch, end_date: e.target.value })} className="px-3 py-2 rounded-xl border border-slate-300 text-xs" />
                  </div>
                  <input placeholder="Timings" value={newBatch.timings} onChange={(e) => setNewBatch({ ...newBatch, timings: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs" />
                  <button type="submit" className="w-full py-2.5 rounded-xl bg-[#0052CC] text-white text-xs font-bold cursor-pointer">Add Batch</button>
                </form>

                <div className="bg-white rounded-2xl p-5 border border-slate-200 space-y-2.5">
                  <h3 className="font-bold text-sm text-[#002B7A]">All Batches ({batches.length})</h3>
                  {batches.map((b) => (
                    <div key={b.id} className="p-3 rounded-xl bg-slate-50 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-bold text-slate-900">{b.name}</p>
                        <p className="text-slate-500">{b.course_title} · {b.timings}</p>
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          await api(`/api/admin/batches/${b.id}`, { method: 'DELETE' });
                          loadSection();
                        }}
                        className="text-red-500 font-bold cursor-pointer"
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    await api('/api/admin/live-classes', { method: 'POST', body: JSON.stringify(newLive) });
                    setNewLive({ ...newLive, title: '' });
                    notify('Live class scheduled!');
                    loadSection();
                  }}
                  className="bg-white rounded-2xl p-6 border border-slate-200 space-y-3"
                >
                  <h2 className="font-display font-bold text-base text-[#002B7A]">Schedule Live Class</h2>
                  <input required placeholder="Live Class Title" value={newLive.title} onChange={(e) => setNewLive({ ...newLive, title: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs" />
                  <div className="grid grid-cols-2 gap-2">
                    <select required value={newLive.course_id} onChange={(e) => setNewLive({ ...newLive, course_id: e.target.value })} className="px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white">
                      <option value="">Select Course</option>
                      {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                    </select>
                    <input type="datetime-local" required value={newLive.scheduled_at} onChange={(e) => setNewLive({ ...newLive, scheduled_at: e.target.value })} className="px-3 py-2 rounded-xl border border-slate-300 text-xs" />
                  </div>
                  <input required placeholder="Meeting URL" value={newLive.meeting_url} onChange={(e) => setNewLive({ ...newLive, meeting_url: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs" />
                  <button type="submit" className="w-full py-2.5 rounded-xl bg-[#FF7A00] text-white text-xs font-bold cursor-pointer">Publish Live Class</button>
                </form>

                <div className="bg-white rounded-2xl p-5 border border-slate-200 space-y-2.5">
                  <h3 className="font-bold text-sm text-[#002B7A]">Live Classes ({liveClasses.length})</h3>
                  {liveClasses.map((lc) => (
                    <div key={lc.id} className="p-3 rounded-xl bg-slate-50 flex items-center justify-between text-xs gap-2">
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 truncate">{lc.title}</p>
                        <p className="text-slate-500">{lc.course_title} · {formatDateTime(lc.scheduled_at)}</p>
                      </div>
                      <select
                        value={lc.status}
                        onChange={async (e) => {
                          await api(`/api/admin/live-classes/${lc.id}`, {
                            method: 'PUT',
                            body: JSON.stringify({ status: e.target.value }),
                          });
                          loadSection();
                        }}
                        className="px-2 py-1 rounded-lg border border-slate-300 text-[11px] font-bold bg-white"
                      >
                        <option value="live">LIVE</option>
                        <option value="upcoming">Upcoming</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ==================== 6. TESTS & QUESTIONS ==================== */}
          {section === 'tests' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-5 space-y-4">
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    await api('/api/admin/tests', { method: 'POST', body: JSON.stringify(newTest) });
                    setNewTest({ ...newTest, title: '' });
                    notify('Test created!');
                    loadSection();
                  }}
                  className="bg-white rounded-2xl p-6 border border-slate-200 space-y-3"
                >
                  <h2 className="font-display font-bold text-base text-[#002B7A]">Create Test</h2>
                  <input required placeholder="Test Title" value={newTest.title} onChange={(e) => setNewTest({ ...newTest, title: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs" />
                  <select value={newTest.course_id} onChange={(e) => setNewTest({ ...newTest, course_id: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white">
                    <option value="">General Mock Test</option>
                    {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                  </select>
                  <div className="grid grid-cols-3 gap-2">
                    <input type="number" placeholder="Mins" value={newTest.duration_minutes} onChange={(e) => setNewTest({ ...newTest, duration_minutes: e.target.value })} className="px-3 py-2 rounded-xl border border-slate-300 text-xs" />
                    <input type="number" placeholder="Marks" value={newTest.total_marks} onChange={(e) => setNewTest({ ...newTest, total_marks: e.target.value })} className="px-3 py-2 rounded-xl border border-slate-300 text-xs" />
                    <input type="number" step="0.25" placeholder="-ve" value={newTest.negative_marks} onChange={(e) => setNewTest({ ...newTest, negative_marks: e.target.value })} className="px-3 py-2 rounded-xl border border-slate-300 text-xs" />
                  </div>
                  <button type="submit" className="w-full py-2.5 rounded-xl bg-[#0052CC] text-white text-xs font-bold cursor-pointer">Create Test</button>
                </form>

                <div className="bg-white rounded-2xl p-5 border border-slate-200 space-y-2.5">
                  <h3 className="font-bold text-sm text-[#002B7A]">All Tests</h3>
                  {tests.map((t) => (
                    <div key={t.id} className="p-3 rounded-xl bg-slate-50 flex items-center justify-between text-xs gap-2">
                      <div>
                        <p className="font-bold text-slate-900">{t.title}</p>
                        <p className="text-slate-500">{t.questions_count} Qs · {t.is_published ? 'Published' : 'Hidden'}</p>
                      </div>
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={async () => {
                            setSelectedTestId(t.id);
                            setTestQuestions(await api(`/api/admin/tests/${t.id}/questions`));
                          }}
                          className="px-2.5 py-1 rounded-lg bg-blue-50 text-[#0052CC] font-bold cursor-pointer"
                        >
                          Questions
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            await api(`/api/admin/tests/${t.id}`, {
                              method: 'PUT',
                              body: JSON.stringify({ is_published: !t.is_published }),
                            });
                            loadSection();
                          }}
                          className="px-2.5 py-1 rounded-lg bg-slate-200 text-slate-700 font-bold cursor-pointer"
                        >
                          {t.is_published ? 'Hide' : 'Show'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="lg:col-span-7 bg-white rounded-2xl p-6 border border-slate-200 space-y-4">
                <h2 className="font-display font-bold text-base text-[#002B7A]">
                  {selectedTestId ? `Manage Questions (Test #${selectedTestId})` : 'Select a Test to Manage Questions'}
                </h2>
                {selectedTestId && (
                  <>
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        await api(`/api/admin/tests/${selectedTestId}/questions`, {
                          method: 'POST',
                          body: JSON.stringify({
                            question_text: newQuestion.question_text,
                            options: [newQuestion.opt0, newQuestion.opt1, newQuestion.opt2, newQuestion.opt3].filter(Boolean),
                            correct_index: Number(newQuestion.correct_index),
                            marks: Number(newQuestion.marks),
                          }),
                        });
                        setNewQuestion({ question_text: '', opt0: '', opt1: '', opt2: '', opt3: '', correct_index: '0', marks: '2' });
                        setTestQuestions(await api(`/api/admin/tests/${selectedTestId}/questions`));
                        loadSection();
                      }}
                      className="space-y-2.5 p-4 rounded-2xl bg-slate-50 border border-slate-200"
                    >
                      <input required placeholder="Question text" value={newQuestion.question_text} onChange={(e) => setNewQuestion({ ...newQuestion, question_text: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white" />
                      <div className="grid grid-cols-2 gap-2">
                        <input required placeholder="Option A" value={newQuestion.opt0} onChange={(e) => setNewQuestion({ ...newQuestion, opt0: e.target.value })} className="px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white" />
                        <input required placeholder="Option B" value={newQuestion.opt1} onChange={(e) => setNewQuestion({ ...newQuestion, opt1: e.target.value })} className="px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white" />
                        <input placeholder="Option C" value={newQuestion.opt2} onChange={(e) => setNewQuestion({ ...newQuestion, opt2: e.target.value })} className="px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white" />
                        <input placeholder="Option D" value={newQuestion.opt3} onChange={(e) => setNewQuestion({ ...newQuestion, opt3: e.target.value })} className="px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white" />
                      </div>
                      <div className="flex gap-2">
                        <select value={newQuestion.correct_index} onChange={(e) => setNewQuestion({ ...newQuestion, correct_index: e.target.value })} className="px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white">
                          <option value="0">Correct: A</option>
                          <option value="1">Correct: B</option>
                          <option value="2">Correct: C</option>
                          <option value="3">Correct: D</option>
                        </select>
                        <button type="submit" className="px-5 py-2 rounded-xl bg-[#FF7A00] text-white text-xs font-bold cursor-pointer">Add Question</button>
                      </div>
                    </form>

                    <div className="space-y-2">
                      {testQuestions.map((q, idx) => (
                        <div key={q.id} className="p-3 rounded-xl border border-slate-200 text-xs flex justify-between gap-2">
                          <div>
                            <p className="font-bold">Q{idx + 1}. {q.question_text}</p>
                            <p className="text-emerald-700 mt-1">Ans: {q.options[q.correct_index]}</p>
                          </div>
                          <button
                            type="button"
                            onClick={async () => {
                              await api(`/api/admin/questions/${q.id}`, { method: 'DELETE' });
                              setTestQuestions(await api(`/api/admin/tests/${selectedTestId}/questions`));
                            }}
                            className="text-red-500 font-bold cursor-pointer"
                          >
                            Delete
                          </button>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* ==================== 7. PAYMENTS & SUBSCRIPTION PLANS ==================== */}
          {section === 'payments' && (
            <div className="space-y-6">
              {/* Subscription Plans Management */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    await api('/api/admin/plans', {
                      method: 'POST',
                      body: JSON.stringify({
                        name: newPlan.name,
                        price: Number(newPlan.price),
                        duration_months: Number(newPlan.duration_months),
                        badge: newPlan.badge,
                        features: newPlan.featuresText.split(',').map((s) => s.trim()).filter(Boolean),
                      }),
                    });
                    setNewPlan({ ...newPlan, name: '' });
                    await refreshSite();
                    notify('Subscription plan added & live!');
                    loadSection();
                  }}
                  className="lg:col-span-4 bg-white rounded-2xl p-6 border border-slate-200 space-y-3 h-fit"
                >
                  <h2 className="font-display font-bold text-base text-[#002B7A]">Add Subscription Plan</h2>
                  <input required placeholder="Plan Name" value={newPlan.name} onChange={(e) => setNewPlan({ ...newPlan, name: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs" />
                  <div className="grid grid-cols-2 gap-2">
                    <input type="number" required placeholder="Price ₹" value={newPlan.price} onChange={(e) => setNewPlan({ ...newPlan, price: e.target.value })} className="px-3 py-2 rounded-xl border border-slate-300 text-xs" />
                    <input type="number" required placeholder="Months" value={newPlan.duration_months} onChange={(e) => setNewPlan({ ...newPlan, duration_months: e.target.value })} className="px-3 py-2 rounded-xl border border-slate-300 text-xs" />
                  </div>
                  <textarea rows={2} placeholder="Features (comma separated)" value={newPlan.featuresText} onChange={(e) => setNewPlan({ ...newPlan, featuresText: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs" />
                  <button type="submit" className="w-full py-2.5 rounded-xl bg-[#0052CC] text-white text-xs font-bold cursor-pointer">Save Plan</button>
                </form>

                <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {plans.map((p) => (
                    <div key={p.id} className="bg-white rounded-2xl p-5 border border-slate-200 space-y-3">
                      <div className="flex justify-between items-center">
                        <h3 className="font-bold text-slate-900">{p.name}</h3>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${p.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                          {p.is_active ? 'Active' : 'Paused'}
                        </span>
                      </div>
                      <p className="font-display font-extrabold text-2xl text-[#0052CC]">
                        {formatCurrency(p.price)} <span className="text-xs font-normal text-slate-500">/ {p.duration_months}m</span>
                      </p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={async () => {
                            const nextPrice = window.prompt('Enter new price (₹):', String(p.price));
                            if (!nextPrice) return;
                            await api(`/api/admin/plans/${p.id}`, {
                              method: 'PUT',
                              body: JSON.stringify({ price: Number(nextPrice) }),
                            });
                            await refreshSite();
                            notify('Plan price updated!');
                            loadSection();
                          }}
                          className="flex-1 py-1.5 rounded-lg bg-blue-50 text-[#0052CC] text-xs font-bold cursor-pointer"
                        >
                          Edit Price
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            await api(`/api/admin/plans/${p.id}`, {
                              method: 'PUT',
                              body: JSON.stringify({ is_active: !p.is_active }),
                            });
                            await refreshSite();
                            loadSection();
                          }}
                          className="px-3 py-1.5 rounded-lg bg-slate-100 text-xs font-bold cursor-pointer"
                        >
                          {p.is_active ? 'Pause' : 'Enable'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payments Table */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div className="p-5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                  <h2 className="font-display font-bold text-base text-[#002B7A]">Payment Records</h2>
                  <div className="flex gap-1.5 flex-wrap">
                    {['all', 'successful', 'pending', 'failed', 'refunded'].map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setPayFilter(st)}
                        className={`px-3 py-1 rounded-full text-xs font-bold capitalize cursor-pointer ${
                          payFilter === st ? 'bg-[#0052CC] text-white' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                      <tr>
                        <th className="px-5 py-3">Order</th>
                        <th className="px-5 py-3">Student</th>
                        <th className="px-5 py-3">Item</th>
                        <th className="px-5 py-3">Amount</th>
                        <th className="px-5 py-3">Method</th>
                        <th className="px-5 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {payments.map((p) => (
                        <tr key={p.id}>
                          <td className="px-5 py-3 font-mono text-xs">{p.order_ref}</td>
                          <td className="px-5 py-3 font-bold">{p.student_name}</td>
                          <td className="px-5 py-3">{p.item_title}</td>
                          <td className="px-5 py-3 font-bold text-[#00338D]">{formatCurrency(p.final_amount)}</td>
                          <td className="px-5 py-3">{p.method}</td>
                          <td className="px-5 py-3">
                            <select
                              value={p.status}
                              onChange={async (e) => {
                                await api(`/api/admin/payments/${p.id}/status`, {
                                  method: 'PATCH',
                                  body: JSON.stringify({ status: e.target.value }),
                                });
                                loadSection();
                              }}
                              className="px-2 py-1 rounded-lg border border-slate-300 text-xs font-bold bg-white"
                            >
                              <option value="successful">Successful</option>
                              <option value="pending">Pending</option>
                              <option value="processing">Processing</option>
                              <option value="failed">Failed</option>
                              <option value="refunded">Refunded</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ==================== 8. REFERRALS & CERTIFICATES ==================== */}
          {section === 'certificates' && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div className="p-5 border-b border-slate-200">
                  <h2 className="font-display font-bold text-base text-[#002B7A]">
                    Issued Certificates ({certificates.length})
                  </h2>
                </div>
                <div className="divide-y divide-slate-100">
                  {certificates.length === 0 ? (
                    <p className="p-5 text-xs text-slate-500">No certificates issued yet.</p>
                  ) : (
                    certificates.map((cert) => (
                      <div key={cert.id} className="p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
                        <div>
                          <p className="font-mono font-bold text-[#0052CC]">{cert.certificate_code}</p>
                          <p className="font-bold text-sm text-slate-900">
                            {cert.student_name} — {cert.course_title}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setPreviewCert(cert)}
                            className="px-3 py-1.5 rounded-lg bg-blue-50 text-[#0052CC] font-bold cursor-pointer"
                          >
                            View / Download
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              await api(`/api/admin/certificates/${cert.id}/status`, {
                                method: 'PATCH',
                                body: JSON.stringify({ status: cert.status === 'valid' ? 'revoked' : 'valid' }),
                              });
                              loadSection();
                            }}
                            className={`px-3 py-1.5 rounded-lg font-bold cursor-pointer ${
                              cert.status === 'valid' ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-700'
                            }`}
                          >
                            {cert.status === 'valid' ? 'Revoke' : 'Restore'}
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {previewCert && <CertificateView certificate={previewCert} onClose={() => setPreviewCert(null)} />}

              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div className="p-5 border-b border-slate-200 flex items-center gap-2">
                  <Gift className="w-5 h-5 text-[#FF7A00]" />
                  <h2 className="font-display font-bold text-base text-[#002B7A]">
                    Referral Tracking ({referrals.length})
                  </h2>
                </div>
                <div className="divide-y divide-slate-100">
                  {referrals.map((r) => (
                    <div key={r.id} className="px-5 py-3.5 flex items-center justify-between text-xs">
                      <span>
                        <strong>{r.referrer_name}</strong> referred <strong>{r.referred_name}</strong> ({r.referral_code})
                      </span>
                      <span className="font-bold text-emerald-600">{formatCurrency(r.reward_amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ==================== 9. WEBSITE CMS & CONTACT ENQUIRIES ==================== */}
          {section === 'cms' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  await api('/api/admin/cms', {
                    method: 'PUT',
                    body: JSON.stringify(cmsDraft),
                  });
                  await refreshSite();
                  notify('Website CMS updated! Changes are live across the public website.');
                }}
                className="lg:col-span-7 bg-white rounded-2xl p-6 border border-slate-200 space-y-4"
              >
                <h2 className="font-display font-bold text-lg text-[#002B7A]">
                  Dynamic Website CMS Controls
                </h2>

                <div className="space-y-3">
                  <p className="text-xs font-bold uppercase text-slate-400">Hero Section & Tagline</p>
                  <input
                    value={cmsDraft.brand.tagline}
                    onChange={(e) => setCmsDraft({ ...cmsDraft, brand: { ...cmsDraft.brand, tagline: e.target.value } })}
                    placeholder="Tagline"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs"
                  />
                  <input
                    value={cmsDraft.hero.heading}
                    onChange={(e) => setCmsDraft({ ...cmsDraft, hero: { ...cmsDraft.hero, heading: e.target.value } })}
                    placeholder="Hero Heading"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs"
                  />
                  <textarea
                    rows={2}
                    value={cmsDraft.hero.subtext}
                    onChange={(e) => setCmsDraft({ ...cmsDraft, hero: { ...cmsDraft.hero, subtext: e.target.value } })}
                    placeholder="Hero Supporting Text"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      value={cmsDraft.hero.primaryCtaLabel}
                      onChange={(e) => setCmsDraft({ ...cmsDraft, hero: { ...cmsDraft.hero, primaryCtaLabel: e.target.value } })}
                      placeholder="Primary CTA Label"
                      className="px-3.5 py-2 rounded-xl border border-slate-300 text-xs"
                    />
                    <input
                      value={cmsDraft.hero.secondaryCtaLabel}
                      onChange={(e) => setCmsDraft({ ...cmsDraft, hero: { ...cmsDraft.hero, secondaryCtaLabel: e.target.value } })}
                      placeholder="Secondary CTA Label"
                      className="px-3.5 py-2 rounded-xl border border-slate-300 text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-3 pt-3 border-t border-slate-200">
                  <p className="text-xs font-bold uppercase text-slate-400">Trust Statistics</p>
                  <div className="grid grid-cols-2 gap-2">
                    {cmsDraft.stats.map((st, idx) => (
                      <div key={idx} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                        <input
                          value={st.value}
                          onChange={(e) => {
                            const next = [...cmsDraft.stats];
                            next[idx] = { ...next[idx], value: e.target.value };
                            setCmsDraft({ ...cmsDraft, stats: next });
                          }}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-bold bg-white"
                        />
                        <input
                          value={st.label}
                          onChange={(e) => {
                            const next = [...cmsDraft.stats];
                            next[idx] = { ...next[idx], label: e.target.value };
                            setCmsDraft({ ...cmsDraft, stats: next });
                          }}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-[11px] bg-white"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-3 pt-3 border-t border-slate-200">
                  <p className="text-xs font-bold uppercase text-slate-400">Contact & Referral Reward</p>
                  <div className="grid grid-cols-2 gap-2">
                    <input value={cmsDraft.contact.phone} onChange={(e) => setCmsDraft({ ...cmsDraft, contact: { ...cmsDraft.contact, phone: e.target.value } })} placeholder="Phone" className="px-3 py-2 rounded-xl border border-slate-300 text-xs" />
                    <input value={cmsDraft.contact.whatsapp} onChange={(e) => setCmsDraft({ ...cmsDraft, contact: { ...cmsDraft.contact, whatsapp: e.target.value } })} placeholder="WhatsApp" className="px-3 py-2 rounded-xl border border-slate-300 text-xs" />
                    <input value={cmsDraft.contact.email} onChange={(e) => setCmsDraft({ ...cmsDraft, contact: { ...cmsDraft.contact, email: e.target.value } })} placeholder="Email" className="px-3 py-2 rounded-xl border border-slate-300 text-xs" />
                    <input
                      type="number"
                      value={cmsDraft.referral.rewardAmount}
                      onChange={(e) => setCmsDraft({ ...cmsDraft, referral: { ...cmsDraft.referral, rewardAmount: Number(e.target.value) } })}
                      placeholder="Referral Reward ₹"
                      className="px-3 py-2 rounded-xl border border-slate-300 text-xs"
                    />
                  </div>
                </div>

                <button type="submit" className="w-full py-3 rounded-xl bg-[#0052CC] text-white font-bold text-sm cursor-pointer">
                  Save & Publish CMS Changes
                </button>
              </form>

              {/* Contact Enquiries Inbox */}
              <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 overflow-hidden h-fit">
                <div className="p-5 border-b border-slate-200 flex items-center gap-2">
                  <Mail className="w-5 h-5 text-[#FF7A00]" />
                  <h2 className="font-display font-bold text-base text-[#002B7A]">
                    Contact Enquiries ({enquiries.length})
                  </h2>
                </div>
                <div className="divide-y divide-slate-100 max-h-[620px] overflow-y-auto">
                  {enquiries.map((enq) => (
                    <div key={enq.id} className="p-4 space-y-2 text-xs">
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <p className="font-bold text-sm text-slate-900">{enq.name}</p>
                          <p className="text-slate-500">
                            {enq.mobile} · {enq.email}
                          </p>
                        </div>
                        <select
                          value={enq.status}
                          onChange={async (e) => {
                            await api(`/api/admin/enquiries/${enq.id}`, {
                              method: 'PATCH',
                              body: JSON.stringify({ status: e.target.value }),
                            });
                            loadSection();
                          }}
                          className="px-2 py-1 rounded-lg border border-slate-300 text-[11px] font-bold bg-white"
                        >
                          <option value="new">New</option>
                          <option value="in_progress">In Progress</option>
                          <option value="resolved">Resolved</option>
                        </select>
                      </div>
                      <p className="font-semibold text-[#0052CC]">{enq.subject}</p>
                      <p className="text-slate-600">{enq.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </DashboardLayout>
  );
}
