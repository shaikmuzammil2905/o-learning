import { useEffect, useState, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Award,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  FileCheck2,
  FileText,
  Lock,
  PlayCircle,
  Printer,
  Sparkles,
  Volume2,
  X,
} from 'lucide-react';
import { DashboardLayout, STUDENT_LINKS } from '../../components/DashboardLayout';
import { ErrorState, LoadingState } from '../../components/ui/StateViews';
import { api } from '../../lib/api';
import type { Certificate, Course, CourseModule, Lesson } from '../../types';

export interface NoteItem {
  id: number;
  course_id: number;
  title: string;
  description: string;
  file_url: string;
  file_size_text: string;
  file_size_bytes: number;
  is_published: number;
  created_at?: string;
}

interface LearnData {
  course: Course;
  enrollment: {
    id: number;
    progress_percent: number;
    status: string;
    completed_lessons: number[];
  };
  modules: CourseModule[];
  notes?: NoteItem[];
  certificate: Certificate | null;
}

export function CourseLearningPage() {
  const { courseId } = useParams();
  const [data, setData] = useState<LearnData | null>(null);
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [previewNote, setPreviewNote] = useState<NoteItem | null>(null);
  const [downloadMsg, setDownloadMsg] = useState('');
  const videoRef = useRef<HTMLVideoElement | null>(null);

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

          {/* COURSE NOTES SECTION (Requirement 1: Course Completion & PDF Notes Download System) */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-display font-bold text-lg text-[#002B7A]">
                    Course Notes & PDF Handbooks
                  </h3>
                  {data.enrollment?.progress_percent === 100 ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                      <FileCheck2 className="w-3.5 h-3.5" /> PDF Download Unlocked
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[11px] font-bold">
                      <Lock className="w-3.5 h-3.5" /> Unlocks at 100% Progress
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Official printable study notes, formula sheets and handbook. Available for download upon completing 100% of this course.
                </p>
              </div>

              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 text-[#0052CC]" /> Print / Export
              </button>
            </div>

            {downloadMsg && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 font-medium">
                {downloadMsg}
              </div>
            )}

            {/* List of Notes */}
            <div className="space-y-3">
              {(data.notes && data.notes.length > 0
                ? data.notes
                : [
                    {
                      id: 1,
                      course_id: data.course.id,
                      title: `${data.course.title} — Official Course Handbook & Formula Sheet`,
                      description:
                        'Complete reference guide covering all core chapters, key definitions, cheat sheets, and practical examples.',
                      file_url: `/api/public/materials/${data.course.id}/1`,
                      file_size_text: '3.2 MB',
                      file_size_bytes: 3355443,
                      is_published: 1,
                    },
                    {
                      id: 2,
                      course_id: data.course.id,
                      title: `${data.course.title} — High-Yield Revision Capsule & Question Bank`,
                      description:
                        'Exam-focused summary notes and solved question walkthroughs for rapid concept revision.',
                      file_url: `/api/public/materials/${data.course.id}/2`,
                      file_size_text: '1.8 MB',
                      file_size_bytes: 1887436,
                      is_published: 1,
                    },
                  ]
              ).map((note) => {
                const isUnlocked = data.enrollment?.progress_percent === 100;
                return (
                  <div
                    key={note.id}
                    className="p-4 rounded-2xl border border-slate-200/90 bg-slate-50/50 hover:bg-white hover:border-[#0052CC]/40 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="min-w-0 flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-100/70 text-[#0052CC] flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-[#0F172A] leading-snug">
                          {note.title}
                        </h4>
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                          {note.description}
                        </p>
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-1 font-medium">
                          <span>PDF Format</span>
                          <span>•</span>
                          <span>{note.file_size_text || '2.4 MB'}</span>
                          <span>•</span>
                          <span>O-Learning Official</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <button
                        type="button"
                        onClick={() => setPreviewNote(note)}
                        className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer transition"
                      >
                        <Eye className="w-3.5 h-3.5 text-[#0052CC]" /> Preview
                      </button>

                      {isUnlocked ? (
                        <a
                          href={`/api/student/learn/${data.course.id}/notes/${note.id}/download`}
                          download
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer transition"
                        >
                          <Download className="w-3.5 h-3.5" /> Download PDF
                        </a>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setDownloadMsg(
                              `Complete 100% of the lessons in this course to unlock "${note.title}". Current progress: ${data.enrollment?.progress_percent || 0}%`
                            );
                            setTimeout(() => setDownloadMsg(''), 6000);
                          }}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-200 text-slate-500 text-xs font-bold cursor-not-allowed"
                          title="Complete 100% of the course to unlock"
                        >
                          <Lock className="w-3.5 h-3.5" /> Locked (100% req.)
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
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

      {/* NOTE PREVIEW MODAL */}
      {previewNote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-display font-bold text-lg text-[#002B7A]">
                  {previewNote.title}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Official O-LEARNING Study Notes · {previewNote.file_size_text || '2.4 MB'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewNote(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-sm text-slate-700 space-y-3 font-sans leading-relaxed">
              <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs">
                <p className="font-bold text-[#0052CC]">Document Overview:</p>
                <p className="text-slate-600 mt-1">{previewNote.description}</p>
                <p className="text-slate-400 mt-1">Publisher: O-LEARNING PLATFORM · Location: India</p>
              </div>

              <div className="space-y-2 text-xs text-slate-600">
                <h4 className="font-bold text-slate-800 text-sm">Key Chapter Modules & Takeaways:</h4>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Comprehensive foundational theory and practical application rules.</li>
                  <li>Worked examples, common interview / exam pitfalls, and solution methods.</li>
                  <li>Formula summaries, quick reference diagrams, and syntax cheatsheets.</li>
                  <li>Self-assessment mock questions with detailed explanations.</li>
                </ul>
              </div>

              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-800">
                <p className="font-bold">Full PDF Download:</p>
                <p className="mt-0.5">
                  {data.enrollment?.progress_percent === 100
                    ? 'Your course progress is 100%. Click Download PDF below to save the complete document.'
                    : `Currently locked. You have completed ${data.enrollment?.progress_percent || 0}% of the course. Complete 100% of all lessons to unlock the full official download.`}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setPreviewNote(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Close Preview
              </button>
              {data.enrollment?.progress_percent === 100 ? (
                <a
                  href={`/api/student/learn/${data.course.id}/notes/${previewNote.id}/download`}
                  download
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
                >
                  Download PDF
                </a>
              ) : (
                <button
                  type="button"
                  disabled
                  className="px-5 py-2 rounded-xl bg-slate-200 text-slate-500 text-xs font-bold cursor-not-allowed"
                >
                  Locked (Complete 100%)
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

