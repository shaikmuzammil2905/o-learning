import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Award,
  Bell,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  CreditCard,
  Gift,
  Play,
  Radio,
  Sparkles,
  User as UserIcon,
} from 'lucide-react';
import { DashboardLayout, STUDENT_LINKS } from '../../components/DashboardLayout';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/StateViews';
import { useAuth } from '../../context/AuthContext';
import { api, formatDateTime } from '../../lib/api';
import type { LiveClass } from '../../types';

interface DashboardData {
  summary: {
    myCourses: number;
    inProgress: number;
    completed: number;
    certificates: number;
  };
  enrollments: Array<{
    id: number;
    course_id: number;
    title: string;
    slug: string;
    thumbnail_url: string;
    progress_percent: number;
    status: string;
    modules_count: number;
    lessons_count: number;
    faculty_name: string;
  }>;
  liveClasses: LiveClass[];
  activeSubscription: { plan_name: string; expires_at: string } | null;
  notifications: Array<{ id: number; title: string; message: string; is_read: number; created_at: string }>;
}

export function StudentDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    setError('');
    api<DashboardData>('/api/student/dashboard')
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : 'Unable to load dashboard.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <DashboardLayout
      title={`Welcome, ${user?.full_name?.split(' ')[0] || 'Student'}!`}
      subtitle="Learn Today, Lead Tomorrow! · Your personal learning hub"
      links={STUDENT_LINKS}
    >
      {loading ? (
        <LoadingState message="Loading your courses and progress…" />
      ) : error || !data ? (
        <ErrorState message={error} onRetry={load} />
      ) : (
        <div className="space-y-6">
          {/* Active Subscription Banner */}
          {data.activeSubscription && (
            <div className="rounded-2xl bg-gradient-to-r from-[#0038A8] to-[#0052CC] text-white p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 shadow-md">
              <div className="flex items-center gap-3">
                <Sparkles className="w-6 h-6 text-[#FF9B3D]" />
                <div>
                  <p className="font-bold text-sm">{data.activeSubscription.plan_name} Active</p>
                  <p className="text-xs text-blue-100">
                    Valid until {new Date(data.activeSubscription.expires_at).toLocaleDateString('en-IN')}
                  </p>
                </div>
              </div>
              <Link
                to="/courses"
                className="px-4 py-2 rounded-xl bg-[#FF7A00] text-white text-xs font-bold"
              >
                Explore Courses
              </Link>
            </div>
          )}

          {/* 4 Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'My Courses', value: data.summary.myCourses, icon: BookOpen, color: 'bg-blue-50 text-[#0052CC]' },
              { label: 'In Progress', value: data.summary.inProgress, icon: Clock, color: 'bg-orange-50 text-[#FF7A00]' },
              { label: 'Completed', value: data.summary.completed, icon: CheckCircle2, color: 'bg-emerald-50 text-emerald-600' },
              { label: 'Certificates', value: data.summary.certificates, icon: Award, color: 'bg-indigo-50 text-indigo-600' },
            ].map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.label}
                  className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs flex items-center gap-3.5"
                >
                  <div className={`w-11 h-11 rounded-xl ${card.color} flex items-center justify-center shrink-0`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-display font-extrabold text-2xl text-slate-900 leading-none">
                      {card.value}
                    </p>
                    <p className="text-xs font-semibold text-slate-500 mt-1">{card.label}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Access Tiles */}
          <div>
            <h2 className="font-display font-bold text-base text-[#002B7A] mb-3">Quick Access</h2>
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-3">
              {[
                { to: '/student/courses', label: 'My Courses', icon: BookOpen },
                { to: '/student/live', label: 'Live Classes', icon: Radio },
                { to: '/student/tests', label: 'Tests', icon: ClipboardCheck },
                { to: '/student/payments', label: 'Payments', icon: CreditCard },
                { to: '/student/certificates', label: 'Certificates', icon: Award },
                { to: '/student/referrals', label: 'Referrals', icon: Gift },
                { to: '/student/profile', label: 'Profile', icon: UserIcon },
              ].map((q) => {
                const Icon = q.icon;
                return (
                  <Link
                    key={q.to}
                    to={q.to}
                    className="bg-white rounded-2xl p-3.5 border border-slate-200/80 shadow-xs hover:border-[#0052CC] hover:shadow-md transition flex flex-col items-center text-center gap-2"
                  >
                    <span className="w-10 h-10 rounded-xl bg-blue-50 text-[#0052CC] flex items-center justify-center">
                      <Icon className="w-5 h-5" />
                    </span>
                    <span className="text-xs font-bold text-slate-700">{q.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* CONTINUE LEARNING */}
            <div className="lg:col-span-8 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-display font-bold text-lg text-[#002B7A]">Continue Learning</h2>
                <Link to="/courses" className="text-xs font-bold text-[#0052CC] hover:underline">
                  Browse More Courses →
                </Link>
              </div>

              {data.enrollments.length === 0 ? (
                <EmptyState
                  title="No courses enrolled yet."
                  description="Explore our 8+ career and competitive exam courses to start your learning journey."
                  action={
                    <Link
                      to="/courses"
                      className="px-5 py-2.5 rounded-xl bg-[#FF7A00] text-white text-xs font-bold"
                    >
                      Explore Courses
                    </Link>
                  }
                />
              ) : (
                <div className="space-y-3.5">
                  {data.enrollments.map((enr) => (
                    <div
                      key={enr.id}
                      className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center gap-4"
                    >
                      <img
                        src={enr.thumbnail_url}
                        alt={enr.title}
                        className="w-full sm:w-36 aspect-[16/9] rounded-xl object-cover shrink-0 bg-blue-50"
                      />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-display font-bold text-base text-slate-900 truncate">
                          {enr.title}
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {enr.modules_count} Modules · {enr.lessons_count} Lessons · {enr.faculty_name}
                        </p>
                        <div className="mt-3">
                          <div className="flex items-center justify-between text-xs font-bold mb-1">
                            <span className="text-slate-600">Progress</span>
                            <span className="text-[#0052CC]">{enr.progress_percent}%</span>
                          </div>
                          <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-[#0052CC] to-[#FF7A00] rounded-full transition-all"
                              style={{ width: `${enr.progress_percent}%` }}
                            />
                          </div>
                        </div>
                      </div>
                      <Link
                        to={`/student/learn/${enr.slug}`}
                        className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#0052CC] hover:bg-[#003EB3] text-white text-xs font-bold shrink-0"
                      >
                        <Play className="w-3.5 h-3.5 fill-white" /> Continue
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Live Classes & Notifications */}
            <div className="lg:col-span-4 space-y-5">
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-display font-bold text-base text-[#002B7A]">Live Classes</h3>
                  <Link to="/student/live" className="text-xs font-bold text-[#0052CC]">
                    View All
                  </Link>
                </div>
                {data.liveClasses.length === 0 ? (
                  <p className="text-xs text-slate-500 py-4 text-center">No live classes scheduled.</p>
                ) : (
                  <div className="space-y-3">
                    {data.liveClasses.slice(0, 3).map((lc) => (
                      <div key={lc.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-bold text-[#0052CC] truncate">
                            {lc.course_title}
                          </span>
                          {lc.status === 'live' ? (
                            <span className="px-2 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-bold animate-pulse">
                              LIVE
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-blue-100 text-[#0052CC] text-[10px] font-bold">
                              UPCOMING
                            </span>
                          )}
                        </div>
                        <p className="font-bold text-xs text-slate-900 mt-1">{lc.title}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {formatDateTime(lc.scheduled_at)}
                        </p>
                        <a
                          href={lc.meeting_url}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2.5 inline-flex items-center justify-center w-full py-2 rounded-lg bg-[#FF7A00] text-white text-xs font-bold"
                        >
                          {lc.status === 'live' ? 'Join Live Class' : 'Open Class Link'}
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
                <h3 className="font-display font-bold text-base text-[#002B7A] flex items-center gap-2 mb-3">
                  <Bell className="w-4 h-4 text-[#FF7A00]" /> Notifications
                </h3>
                {data.notifications.length === 0 ? (
                  <p className="text-xs text-slate-500">All caught up!</p>
                ) : (
                  <div className="space-y-2.5">
                    {data.notifications.slice(0, 4).map((n) => (
                      <div key={n.id} className="text-xs p-2.5 rounded-xl bg-blue-50/60 border border-blue-100">
                        <p className="font-bold text-slate-800">{n.title}</p>
                        <p className="text-slate-600 mt-0.5">{n.message}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

