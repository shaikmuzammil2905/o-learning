import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Award,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  PlayCircle,
} from 'lucide-react';
import { DashboardLayout, STUDENT_LINKS } from '../../components/DashboardLayout';
import { ErrorState, LoadingState } from '../../components/ui/StateViews';
import { api } from '../../lib/api';
import type { Certificate, Course, CourseModule, Lesson } from '../../types';

interface LearnData {
  course: Course;
  enrollment: {
    id: number;
    progress_percent: number;
    status: string;
    completed_lessons: number[];
  };
  modules: CourseModule[];
  certificate: Certificate | null;
}

export function CourseLearningPage() {
  const { courseId } = useParams();
  const [data, setData] = useState<LearnData | null>(null);
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    setError('');
    api<LearnData>(`/api/student/learn/${courseId}`)
      .then((res) => {
        setData(res);
        const allLessons = res.modules.flatMap((m) => m.lessons);
        if (allLessons.length > 0 && !activeLesson) {
          const firstIncomplete = allLessons.find(
            (l) => !res.enrollment?.completed_lessons?.includes(l.id)
          );
          setActiveLesson(firstIncomplete || allLessons[0]);
        }
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Unable to open course player.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [courseId]);

  if (loading) {
    return (
      <DashboardLayout title="Course Player" links={STUDENT_LINKS}>
        <LoadingState message="Loading lessons…" />
      </DashboardLayout>
    );
  }

  if (error || !data) {
    return (
      <DashboardLayout title="Course Player" links={STUDENT_LINKS}>
        <ErrorState message={error} onRetry={load} />
      </DashboardLayout>
    );
  }

  const allLessons = data.modules.flatMap((m) => m.lessons);
  const currentIdx = activeLesson ? allLessons.findIndex((l) => l.id === activeLesson.id) : 0;
  const completedSet = new Set(data.enrollment?.completed_lessons || []);
  const isCompleted = activeLesson ? completedSet.has(activeLesson.id) : false;

  const toggleLessonComplete = async () => {
    if (!activeLesson) return;
    setSaving(true);
    try {
      const res = await api<{
        completed_lessons: number[];
        progress_percent: number;
        status: string;
        certificate: Certificate | null;
      }>(`/api/student/learn/${data.course.id}/lessons/${activeLesson.id}/complete`, {
        method: 'POST',
        body: JSON.stringify({ completed: !isCompleted }),
      });
      setData((prev) =>
        prev
          ? {
              ...prev,
              enrollment: {
                ...prev.enrollment,
                completed_lessons: res.completed_lessons,
                progress_percent: res.progress_percent,
                status: res.status,
              },
              certificate: res.certificate || prev.certificate,
            }
          : prev
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout
      title={data.course.title}
      subtitle={`Progress: ${data.enrollment?.progress_percent || 0}% completed`}
      links={STUDENT_LINKS}
    >
      {/* Certificate Unlocked Banner */}
      {data.certificate && (
        <div className="mb-5 p-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white flex flex-wrap items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-3">
            <Award className="w-7 h-7 text-amber-300 shrink-0" />
            <div>
              <p className="font-bold text-sm">Course Completed! Certificate Issued ({data.certificate.certificate_code})</p>
              <p className="text-xs text-emerald-100">View or download your official O-LEARNING PLATFORM certificate anytime.</p>
            </div>
          </div>
          <Link
            to="/student/certificates"
            className="px-4 py-2 rounded-xl bg-white text-emerald-700 text-xs font-bold shadow"
          >
            View Certificate →
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main Lesson Player */}
        <div className="lg:col-span-8 space-y-5">
          {activeLesson ? (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
              {activeLesson.lesson_type === 'video' && activeLesson.video_url ? (
                <div className="bg-slate-950 aspect-video">
                  <video
                    key={activeLesson.id}
                    src={activeLesson.video_url}
                    controls
                    className="w-full h-full"
                    poster={data.course.thumbnail_url}
                  />
                </div>
              ) : (
                <div className="bg-gradient-to-br from-[#00338D] to-[#0052CC] text-white p-8 sm:p-10">
                  <span className="px-3 py-1 rounded-full bg-white/15 text-xs font-bold uppercase">
                    {activeLesson.lesson_type}
                  </span>
                  <h2 className="font-display font-bold text-2xl mt-3">{activeLesson.title}</h2>
                  <p className="text-sm text-blue-100 mt-2">{activeLesson.duration_minutes} mins estimated</p>
                </div>
              )}

              <div className="p-6 space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="font-display font-bold text-xl text-[#0F172A]">
                      {activeLesson.title}
                    </h2>
                    <p className="text-xs text-slate-500 mt-1 capitalize">
                      {activeLesson.lesson_type} · {activeLesson.duration_minutes} Minutes
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={saving}
                    onClick={toggleLessonComplete}
                    className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                      isCompleted
                        ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                        : 'bg-[#FF7A00] hover:bg-[#E66D00] text-white shadow-sm'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {isCompleted ? 'Completed' : 'Mark as Complete'}
                  </button>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-sm text-slate-700 leading-relaxed">
                  {activeLesson.content_text || 'Follow along with the instructor and review the key concepts below.'}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
                  <a
                    href={activeLesson.material_url || `/api/public/materials/${data.course.id}/${activeLesson.id}`}
                    download
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-50 text-[#0052CC] text-xs font-bold hover:bg-blue-100 transition"
                  >
                    <Download className="w-4 h-4" /> Download Study Material
                  </a>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={currentIdx <= 0}
                      onClick={() => setActiveLesson(allLessons[currentIdx - 1])}
                      className="inline-flex items-center gap-1 px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 disabled:opacity-40 cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" /> Previous
                    </button>
                    <button
                      type="button"
                      disabled={currentIdx >= allLessons.length - 1}
                      onClick={() => setActiveLesson(allLessons[currentIdx + 1])}
                      className="inline-flex items-center gap-1 px-4 py-2.5 rounded-xl bg-[#0052CC] text-white text-xs font-bold disabled:opacity-40 cursor-pointer"
                    >
                      Next Lesson <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* Course Curriculum Sidebar */}
        <div className="lg:col-span-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-200">
              <div className="flex items-center justify-between text-xs font-bold mb-2">
                <span className="text-[#002B7A]">Course Progress</span>
                <span className="text-[#0052CC]">{data.enrollment?.progress_percent || 0}%</span>
              </div>
              <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#0052CC] to-[#FF7A00] transition-all"
                  style={{ width: `${data.enrollment?.progress_percent || 0}%` }}
                />
              </div>
            </div>

            <div className="divide-y divide-slate-200 max-h-[600px] overflow-y-auto">
              {data.modules.map((mod) => (
                <div key={mod.id} className="p-4">
                  <h4 className="font-display font-bold text-xs uppercase tracking-wider text-slate-500 mb-2.5">
                    {mod.title}
                  </h4>
                  <div className="space-y-1.5">
                    {mod.lessons.map((lesson) => {
                      const active = activeLesson?.id === lesson.id;
                      const done = completedSet.has(lesson.id);
                      return (
                        <button
                          key={lesson.id}
                          type="button"
                          onClick={() => setActiveLesson(lesson)}
                          className={`w-full text-left p-3 rounded-xl flex items-start gap-2.5 transition cursor-pointer ${
                            active
                              ? 'bg-blue-50 border border-[#0052CC]/30 text-[#00338D]'
                              : 'hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          {done ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                          ) : lesson.lesson_type === 'video' ? (
                            <PlayCircle className="w-4 h-4 text-[#0052CC] shrink-0 mt-0.5" />
                          ) : (
                            <FileText className="w-4 h-4 text-[#FF7A00] shrink-0 mt-0.5" />
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold leading-snug">{lesson.title}</p>
                            <p className="text-[11px] text-slate-400 mt-0.5 capitalize">
                              {lesson.lesson_type} · {lesson.duration_minutes}m
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
