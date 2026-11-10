import { useEffect, useState } from 'react';
import {
  BarChart3,
  BookOpen,
  ClipboardCheck,
  LayoutDashboard,
  Plus,
  Radio,
  Users,
} from 'lucide-react';
import { DashboardLayout, type SidebarLink } from '../../components/DashboardLayout';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/StateViews';
import { api, formatDateTime } from '../../lib/api';

interface FacultyDashboard {
  courses: Array<{ id: number; title: string; slug: string; duration: string; level: string }>;
  students: Array<{
    id: number;
    full_name: string;
    email: string;
    course_title: string;
    progress_percent: number;
    enrolled_at: string;
  }>;
  liveClasses: Array<{
    id: number;
    title: string;
    course_id: number;
    course_title: string;
    scheduled_at: string;
    duration_minutes: number;
    meeting_url: string;
    status: string;
    recording_url: string;
  }>;
  tests: Array<{
    id: number;
    title: string;
    course_title: string;
    duration_minutes: number;
    total_marks: number;
    questions_count: number;
    attempts_count: number;
  }>;
  performance: Array<{
    id: number;
    student_name: string;
    test_title: string;
    score: number;
    total_marks: number;
    percentage: number;
    submitted_at: string;
  }>;
  permissions: {
    can_manage_lessons: boolean;
    can_schedule_live: boolean;
    can_manage_tests: boolean;
    can_upload_materials: boolean;
  };
}

export function FacultyPortal({ section = 'overview' }: { section?: string }) {
  const [tab, setTab] = useState(section);
  const [data, setData] = useState<FacultyDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Lesson creation state
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const [curriculum, setCurriculum] = useState<{
    modules: Array<{ id: number; title: string }>;
    lessons: Array<{ id: number; module_id: number; title: string; lesson_type: string; duration_minutes: number }>;
  } | null>(null);
  const [lessonForm, setLessonForm] = useState({
    module_id: '',
    title: '',
    lesson_type: 'video',
    video_url: '',
    material_url: '',
    duration_minutes: '25',
    content_text: '',
  });

  // Live class creation
  const [liveForm, setLiveForm] = useState({
    title: '',
    course_id: '',
    scheduled_at: '',
    duration_minutes: '60',
    meeting_url: 'https://meet.jit.si/olearning-live-room',
    status: 'upcoming',
    description: '',
  });

  // Test creation
  const [testForm, setTestForm] = useState({
    title: '',
    course_id: '',
    duration_minutes: '20',
    total_marks: '10',
    pass_marks: '5',
    difficulty: 'Medium',
  });
  const [qForm, setQForm] = useState({
    test_id: '',
    question_text: '',
    opt0: '',
    opt1: '',
    opt2: '',
    opt3: '',
    correct_index: '0',
    marks: '2',
  });

  const load = () => {
    setLoading(true);
    api<FacultyDashboard>('/api/faculty/dashboard')
      .then((res) => {
        setData(res);
        if (res.courses.length > 0 && !selectedCourseId) {
          setSelectedCourseId(res.courses[0].id);
        }
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Unable to load faculty portal.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!selectedCourseId) return;
    api<{ modules: Array<{ id: number; title: string }>; lessons: Array<{ id: number; module_id: number; title: string; lesson_type: string; duration_minutes: number }> }>(
      `/api/faculty/courses/${selectedCourseId}/curriculum`
    )
      .then((res) => {
        setCurriculum(res);
        if (res.modules.length > 0) {
          setLessonForm((f) => ({ ...f, module_id: String(res.modules[0].id) }));
        }
      })
      .catch(() => {});
  }, [selectedCourseId]);

  const facultyLinks: SidebarLink[] = [
    { to: '/faculty', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/faculty/courses', label: 'Assigned Courses', icon: BookOpen },
    { to: '/faculty/students', label: 'Students & Performance', icon: Users },
    { to: '/faculty/live', label: 'Live Classes', icon: Radio },
    { to: '/faculty/tests', label: 'Tests & Questions', icon: ClipboardCheck },
  ];

  // Sync URL section if prop changes
  useEffect(() => {
    setTab(section);
  }, [section]);

  const handleAddLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourseId) return;
    await api(`/api/faculty/courses/${selectedCourseId}/lessons`, {
      method: 'POST',
      body: JSON.stringify({
        ...lessonForm,
        duration_minutes: Number(lessonForm.duration_minutes) || 25,
      }),
    });
    setLessonForm((f) => ({ ...f, title: '', video_url: '', material_url: '', content_text: '' }));
    const updated = await api<typeof curriculum>(`/api/faculty/courses/${selectedCourseId}/curriculum`);
    setCurriculum(updated);
  };

  const handleAddLive = async (e: React.FormEvent) => {
    e.preventDefault();
    await api('/api/faculty/live-classes', {
      method: 'POST',
      body: JSON.stringify(liveForm),
    });
    setLiveForm((f) => ({ ...f, title: '', description: '' }));
    load();
  };

  const handleToggleLiveStatus = async (id: number, status: string) => {
    await api(`/api/faculty/live-classes/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
    load();
  };

  const handleCreateTest = async (e: React.FormEvent) => {
    e.preventDefault();
    await api('/api/faculty/tests', { method: 'POST', body: JSON.stringify(testForm) });
    setTestForm((f) => ({ ...f, title: '' }));
    load();
  };

  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qForm.test_id) return;
    await api(`/api/faculty/tests/${qForm.test_id}/questions`, {
      method: 'POST',
      body: JSON.stringify({
        question_text: qForm.question_text,
        options: [qForm.opt0, qForm.opt1, qForm.opt2, qForm.opt3].filter(Boolean),
        correct_index: Number(qForm.correct_index),
        marks: Number(qForm.marks),
      }),
    });
    setQForm((f) => ({ ...f, question_text: '', opt0: '', opt1: '', opt2: '', opt3: '' }));
    load();
  };

  return (
    <DashboardLayout
      title="Faculty Portal"
      subtitle="Manage assigned courses, live sessions, study materials, and student performance"
      links={facultyLinks}
    >
      {loading ? (
        <LoadingState message="Loading faculty workspace…" />
      ) : error || !data ? (
        <ErrorState message={error} onRetry={load} />
      ) : (
        <div className="space-y-6">
          {/* OVERVIEW */}
          {tab === 'overview' && (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Assigned Courses', value: data.courses.length, icon: BookOpen },
                  { label: 'Enrolled Students', value: data.students.length, icon: Users },
                  { label: 'Live Sessions', value: data.liveClasses.length, icon: Radio },
                  { label: 'Published Tests', value: data.tests.length, icon: BarChart3 },
                ].map((c) => {
                  const Icon = c.icon;
                  return (
                    <div key={c.label} className="bg-white rounded-2xl p-5 border border-slate-200 flex items-center gap-3.5">
                      <div className="w-11 h-11 rounded-xl bg-blue-50 text-[#0052CC] flex items-center justify-center">
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-display font-extrabold text-2xl text-slate-900">{c.value}</p>
                        <p className="text-xs text-slate-500 font-semibold">{c.label}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-6">
                <h2 className="font-display font-bold text-lg text-[#002B7A] mb-4">Your Assigned Courses</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {data.courses.map((c) => (
                    <div key={c.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                      <div>
                        <h3 className="font-bold text-slate-900">{c.title}</h3>
                        <p className="text-xs text-slate-500">{c.duration} · {c.level}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCourseId(c.id);
                          setTab('courses');
                        }}
                        className="px-4 py-2 rounded-xl bg-[#0052CC] text-white text-xs font-bold cursor-pointer"
                      >
                        Manage Content
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* COURSES & LESSONS */}
          {tab === 'courses' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-7 bg-white rounded-2xl p-6 border border-slate-200 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="font-display font-bold text-lg text-[#002B7A]">Course Curriculum & Materials</h2>
                  <select
                    value={selectedCourseId || ''}
                    onChange={(e) => setSelectedCourseId(Number(e.target.value))}
                    className="px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-bold bg-white"
                  >
                    {data.courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title}
                      </option>
                    ))}
                  </select>
                </div>
                {curriculum?.modules.map((m) => (
                  <div key={m.id} className="rounded-xl border border-slate-200 overflow-hidden">
                    <div className="bg-slate-50 px-4 py-2.5 font-bold text-xs text-[#00338D]">{m.title}</div>
                    <div className="divide-y divide-slate-100">
                      {curriculum.lessons
                        .filter((l) => l.module_id === m.id)
                        .map((l) => (
                          <div key={l.id} className="px-4 py-2.5 flex items-center justify-between text-xs">
                            <span className="font-semibold text-slate-800">{l.title}</span>
                            <span className="text-slate-500 capitalize">
                              {l.lesson_type} · {l.duration_minutes}m
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="lg:col-span-5 bg-white rounded-2xl p-6 border border-slate-200 h-fit">
                <h3 className="font-display font-bold text-base text-[#002B7A] mb-4 flex items-center gap-2">
                  <Plus className="w-4 h-4 text-[#FF7A00]" /> Add Recorded Lesson / Material
                </h3>
                {!data.permissions.can_manage_lessons ? (
                  <p className="text-xs text-slate-500">Lesson creation is restricted by Admin permissions.</p>
                ) : (
                  <form onSubmit={handleAddLesson} className="space-y-3">
                    <select
                      required
                      value={lessonForm.module_id}
                      onChange={(e) => setLessonForm({ ...lessonForm, module_id: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs bg-white"
                    >
                      {curriculum?.modules.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.title}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      required
                      value={lessonForm.title}
                      onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })}
                      placeholder="Lesson title"
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        value={lessonForm.lesson_type}
                        onChange={(e) => setLessonForm({ ...lessonForm, lesson_type: e.target.value })}
                        className="px-3 py-2.5 rounded-xl border border-slate-300 text-xs bg-white"
                      >
                        <option value="video">Recorded Video</option>
                        <option value="material">PDF / Notes</option>
                        <option value="assignment">Assignment</option>
                      </select>
                      <input
                        type="number"
                        value={lessonForm.duration_minutes}
                        onChange={(e) => setLessonForm({ ...lessonForm, duration_minutes: e.target.value })}
                        placeholder="Duration (mins)"
                        className="px-3 py-2.5 rounded-xl border border-slate-300 text-xs"
                      />
                    </div>
                    <input
                      type="url"
                      value={lessonForm.video_url}
                      onChange={(e) => setLessonForm({ ...lessonForm, video_url: e.target.value })}
                      placeholder="Video URL (MP4 / Stream link)"
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs"
                    />
                    <textarea
                      rows={3}
                      value={lessonForm.content_text}
                      onChange={(e) => setLessonForm({ ...lessonForm, content_text: e.target.value })}
                      placeholder="Lesson summary & notes…"
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs"
                    />
                    <button
                      type="submit"
                      className="w-full py-2.5 rounded-xl bg-[#0052CC] text-white text-xs font-bold cursor-pointer"
                    >
                      Save Lesson
                    </button>
                  </form>
                )}
              </div>
            </div>
          )}

          {/* STUDENTS & PERFORMANCE */}
          {tab === 'students' && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div className="p-5 border-b border-slate-200">
                  <h2 className="font-display font-bold text-lg text-[#002B7A]">Enrolled Students Progress</h2>
                </div>
                {data.students.length === 0 ? (
                  <div className="p-6">
                    <EmptyState title="No enrolled students yet" />
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs sm:text-sm">
                      <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                        <tr>
                          <th className="px-5 py-3">Student</th>
                          <th className="px-5 py-3">Course</th>
                          <th className="px-5 py-3">Progress</th>
                          <th className="px-5 py-3">Enrolled On</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {data.students.map((s, i) => (
                          <tr key={`${s.id}-${i}`}>
                            <td className="px-5 py-3.5 font-bold text-slate-900">
                              {s.full_name}
                              <div className="text-[11px] font-normal text-slate-500">{s.email}</div>
                            </td>
                            <td className="px-5 py-3.5 text-slate-700">{s.course_title}</td>
                            <td className="px-5 py-3.5 font-bold text-[#0052CC]">{s.progress_percent}%</td>
                            <td className="px-5 py-3.5 text-xs text-slate-500">{formatDateTime(s.enrolled_at)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div className="p-5 border-b border-slate-200">
                  <h2 className="font-display font-bold text-lg text-[#002B7A]">Student Test Performance</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                      <tr>
                        <th className="px-5 py-3">Student</th>
                        <th className="px-5 py-3">Test</th>
                        <th className="px-5 py-3">Score</th>
                        <th className="px-5 py-3">Percentage</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {data.performance.map((p) => (
                        <tr key={p.id}>
                          <td className="px-5 py-3 font-bold text-slate-900">{p.student_name}</td>
                          <td className="px-5 py-3 text-slate-700">{p.test_title}</td>
                          <td className="px-5 py-3 font-bold text-[#0052CC]">
                            {p.score}/{p.total_marks}
                          </td>
                          <td className="px-5 py-3 font-bold text-emerald-600">{p.percentage}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* LIVE CLASSES */}
          {tab === 'live' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-7 space-y-3">
                {data.liveClasses.map((lc) => (
                  <div key={lc.id} className="bg-white rounded-2xl p-5 border border-slate-200 flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <span className="text-[11px] font-bold text-[#0052CC]">{lc.course_title}</span>
                      <h3 className="font-bold text-base text-slate-900">{lc.title}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">{formatDateTime(lc.scheduled_at)} · {lc.duration_minutes}m</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={lc.status}
                        onChange={(e) => handleToggleLiveStatus(lc.id, e.target.value)}
                        className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-bold bg-white"
                      >
                        <option value="live">LIVE NOW</option>
                        <option value="upcoming">Upcoming</option>
                        <option value="completed">Completed</option>
                      </select>
                      <a
                        href={lc.meeting_url}
                        target="_blank"
                        rel="noreferrer"
                        className="px-4 py-2 rounded-xl bg-[#FF7A00] text-white text-xs font-bold"
                      >
                        Launch
                      </a>
                    </div>
                  </div>
                ))}
              </div>

              <div className="lg:col-span-5 bg-white rounded-2xl p-6 border border-slate-200 h-fit">
                <h3 className="font-display font-bold text-base text-[#002B7A] mb-4">Schedule Live Class</h3>
                <form onSubmit={handleAddLive} className="space-y-3">
                  <input
                    type="text"
                    required
                    value={liveForm.title}
                    onChange={(e) => setLiveForm({ ...liveForm, title: e.target.value })}
                    placeholder="Session Title"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs"
                  />
                  <select
                    required
                    value={liveForm.course_id}
                    onChange={(e) => setLiveForm({ ...liveForm, course_id: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs bg-white"
                  >
                    <option value="">Select Course</option>
                    {data.courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title}
                      </option>
                    ))}
                  </select>
                  <input
                    type="datetime-local"
                    required
                    value={liveForm.scheduled_at}
                    onChange={(e) => setLiveForm({ ...liveForm, scheduled_at: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs"
                  />
                  <input
                    type="url"
                    required
                    value={liveForm.meeting_url}
                    onChange={(e) => setLiveForm({ ...liveForm, meeting_url: e.target.value })}
                    placeholder="Meeting URL"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs"
                  />
                  <button type="submit" className="w-full py-2.5 rounded-xl bg-[#0052CC] text-white text-xs font-bold cursor-pointer">
                    Schedule Live Session
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* TESTS & QUESTIONS */}
          {tab === 'tests' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-6 space-y-4">
                <div className="bg-white rounded-2xl p-6 border border-slate-200 space-y-3">
                  <h3 className="font-display font-bold text-base text-[#002B7A]">Create Test</h3>
                  <form onSubmit={handleCreateTest} className="space-y-3">
                    <input
                      type="text"
                      required
                      value={testForm.title}
                      onChange={(e) => setTestForm({ ...testForm, title: e.target.value })}
                      placeholder="Test title"
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        value={testForm.course_id}
                        onChange={(e) => setTestForm({ ...testForm, course_id: e.target.value })}
                        className="px-3 py-2.5 rounded-xl border border-slate-300 text-xs bg-white"
                      >
                        <option value="">General Test</option>
                        {data.courses.map((c) => (
                          <option key={c.id} value={c.id}>{c.title}</option>
                        ))}
                      </select>
                      <select
                        value={testForm.difficulty}
                        onChange={(e) => setTestForm({ ...testForm, difficulty: e.target.value })}
                        className="px-3 py-2.5 rounded-xl border border-slate-300 text-xs bg-white"
                      >
                        <option>Easy</option>
                        <option>Medium</option>
                        <option>Hard</option>
                      </select>
                    </div>
                    <button type="submit" className="w-full py-2.5 rounded-xl bg-[#0052CC] text-white text-xs font-bold cursor-pointer">
                      Create Test
                    </button>
                  </form>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-slate-200 space-y-2.5">
                  <h3 className="font-display font-bold text-base text-[#002B7A]">Existing Tests</h3>
                  {data.tests.map((t) => (
                    <div key={t.id} className="p-3 rounded-xl bg-slate-50 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-bold text-slate-900">{t.title}</p>
                        <p className="text-slate-500">{t.questions_count} Qs · {t.attempts_count} Attempts</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setQForm((f) => ({ ...f, test_id: String(t.id) }))}
                        className="px-3 py-1.5 rounded-lg bg-blue-50 text-[#0052CC] font-bold cursor-pointer"
                      >
                        + Add Q
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="lg:col-span-6 bg-white rounded-2xl p-6 border border-slate-200 h-fit">
                <h3 className="font-display font-bold text-base text-[#002B7A] mb-4">Add Question to Test</h3>
                <form onSubmit={handleAddQuestion} className="space-y-3">
                  <select
                    required
                    value={qForm.test_id}
                    onChange={(e) => setQForm({ ...qForm, test_id: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs bg-white"
                  >
                    <option value="">Select Test</option>
                    {data.tests.map((t) => (
                      <option key={t.id} value={t.id}>{t.title}</option>
                    ))}
                  </select>
                  <textarea
                    required
                    rows={2}
                    value={qForm.question_text}
                    onChange={(e) => setQForm({ ...qForm, question_text: e.target.value })}
                    placeholder="Question text…"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input required placeholder="Option A" value={qForm.opt0} onChange={(e) => setQForm({ ...qForm, opt0: e.target.value })} className="px-3 py-2 rounded-xl border border-slate-300 text-xs" />
                    <input required placeholder="Option B" value={qForm.opt1} onChange={(e) => setQForm({ ...qForm, opt1: e.target.value })} className="px-3 py-2 rounded-xl border border-slate-300 text-xs" />
                    <input placeholder="Option C" value={qForm.opt2} onChange={(e) => setQForm({ ...qForm, opt2: e.target.value })} className="px-3 py-2 rounded-xl border border-slate-300 text-xs" />
                    <input placeholder="Option D" value={qForm.opt3} onChange={(e) => setQForm({ ...qForm, opt3: e.target.value })} className="px-3 py-2 rounded-xl border border-slate-300 text-xs" />
                  </div>
                  <select
                    value={qForm.correct_index}
                    onChange={(e) => setQForm({ ...qForm, correct_index: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs bg-white"
                  >
                    <option value="0">Correct: Option A</option>
                    <option value="1">Correct: Option B</option>
                    <option value="2">Correct: Option C</option>
                    <option value="3">Correct: Option D</option>
                  </select>
                  <button type="submit" className="w-full py-2.5 rounded-xl bg-[#FF7A00] text-white text-xs font-bold cursor-pointer">
                    Add Question
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      )}
    </DashboardLayout>
  );
}

