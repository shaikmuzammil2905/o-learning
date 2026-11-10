import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Play } from 'lucide-react';
import { DashboardLayout, STUDENT_LINKS } from '../../components/DashboardLayout';
import { EmptyState, LoadingState } from '../../components/ui/StateViews';
import { api } from '../../lib/api';

interface EnrolledCourse {
  id: number;
  course_id: number;
  title: string;
  slug: string;
  short_description: string;
  thumbnail_url: string;
  duration: string;
  level: string;
  faculty_name: string;
  progress_percent: number;
  status: 'active' | 'completed' | 'upcoming';
  modules_count: number;
  lessons_count: number;
}

export function MyCoursesPage() {
  const [courses, setCourses] = useState<EnrolledCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'all' | 'active' | 'completed' | 'upcoming'>('all');

  useEffect(() => {
    api<EnrolledCourse[]>('/api/student/courses')
      .then(setCourses)
      .finally(() => setLoading(false));
  }, []);

  const filtered =
    tab === 'all'
      ? courses
      : tab === 'completed'
      ? courses.filter((c) => c.status === 'completed' || c.progress_percent >= 100)
      : tab === 'upcoming'
      ? courses.filter((c) => c.status === 'upcoming')
      : courses.filter((c) => c.status === 'active' && c.progress_percent < 100);

  return (
    <DashboardLayout title="My Courses" subtitle="Track your enrolled programs & continue learning" links={STUDENT_LINKS}>
      <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-4">
        {(
          [
            { id: 'all', label: 'All Enrolled' },
            { id: 'active', label: 'In Progress' },
            { id: 'completed', label: 'Completed' },
            { id: 'upcoming', label: 'Upcoming' },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-full text-xs font-bold cursor-pointer shrink-0 ${
              tab === t.id ? 'bg-[#0052CC] text-white' : 'bg-white border border-slate-200 text-slate-600'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingState message="Loading your courses…" />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No courses in this section"
          description="Enroll in any of our courses to start learning."
          action={
            <Link to="/courses" className="px-5 py-2.5 rounded-xl bg-[#FF7A00] text-white text-xs font-bold">
              Browse Courses
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((c) => (
            <div key={c.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs flex flex-col">
              <img src={c.thumbnail_url} alt={c.title} className="w-full aspect-[16/9] object-cover bg-blue-50" />
              <div className="p-5 flex-1 flex flex-col">
                <span className="text-[11px] font-bold text-[#0052CC]">{c.faculty_name}</span>
                <h3 className="font-display font-bold text-lg text-slate-900 mt-1">{c.title}</h3>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2 flex-1">{c.short_description}</p>

                <div className="mt-4">
                  <div className="flex justify-between text-xs font-bold mb-1">
                    <span className="text-slate-500">Completion</span>
                    <span className="text-[#0052CC]">{c.progress_percent}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#0052CC] to-[#FF7A00]"
                      style={{ width: `${c.progress_percent}%` }}
                    />
                  </div>
                </div>

                <Link
                  to={`/student/learn/${c.slug}`}
                  className="mt-4 w-full py-3 rounded-xl bg-[#0052CC] hover:bg-[#003EB3] text-white text-xs font-bold flex items-center justify-center gap-1.5"
                >
                  <Play className="w-3.5 h-3.5 fill-white" />
                  {c.progress_percent >= 100 ? 'Review Course' : 'Continue Learning'}
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
