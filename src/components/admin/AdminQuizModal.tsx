import React, { useEffect, useState } from 'react';
import { HelpCircle, Plus, Save, Trash2, X } from 'lucide-react';
import { api } from '../../lib/api';

export interface QuizRow {
  id: number;
  title: string;
  course_id: number | null;
  course_title?: string;
  category_name?: string;
  description: string;
  duration_minutes: number;
  total_marks: number;
  pass_marks: number;
  negative_marks: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  price?: number;
  certificate_enabled?: number;
  expiry_date?: string;
  is_published: number;
  questions_count?: number;
  attempts_count?: number;
}

interface QuestionRow {
  id: number;
  question_text: string;
  options: string[];
  correct_index: number;
  marks: number;
  explanation: string;
}

export const AdminQuizModal: React.FC<{
  open: boolean;
  initial: QuizRow | null;
  courses: Array<{ id: number; title: string }>;
  onClose: () => void;
  onSaved: () => void;
}> = ({ open, initial, courses, onClose, onSaved }) => {
  const [saving, setSaving] = useState(false);
  const [quizId, setQuizId] = useState<number | null>(null);
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [tab, setTab] = useState<'details' | 'questions'>('details');
  const [form, setForm] = useState({
    title: '',
    course_id: '',
    description: '',
    duration_minutes: 20,
    total_marks: 20,
    pass_marks: 8,
    negative_marks: 0,
    difficulty: 'Medium' as 'Easy' | 'Medium' | 'Hard',
    price: 0,
    certificate_enabled: true,
    expiry_date: '',
    is_published: true,
  });

  const [qForm, setQForm] = useState({
    question_text: '',
    opt1: '',
    opt2: '',
    opt3: '',
    opt4: '',
    correct_index: 0,
    marks: 2,
    explanation: '',
  });

  useEffect(() => {
    if (!open) return;
    setTab('details');
    if (initial?.id) {
      setQuizId(initial.id);
      setForm({
        title: initial.title || '',
        course_id: initial.course_id ? String(initial.course_id) : '',
        description: initial.description || '',
        duration_minutes: Number(initial.duration_minutes || 20),
        total_marks: Number(initial.total_marks || 20),
        pass_marks: Number(initial.pass_marks || 8),
        negative_marks: Number(initial.negative_marks || 0),
        difficulty: initial.difficulty || 'Medium',
        price: Number(initial.price || 0),
        certificate_enabled: initial.certificate_enabled !== 0,
        expiry_date: initial.expiry_date || '',
        is_published: initial.is_published !== 0,
      });
      loadQuestions(initial.id);
    } else {
      setQuizId(null);
      setQuestions([]);
      setForm({
        title: '',
        course_id: courses[0]?.id ? String(courses[0].id) : '',
        description: '',
        duration_minutes: 20,
        total_marks: 20,
        pass_marks: 8,
        negative_marks: 0,
        difficulty: 'Medium',
        price: 0,
        certificate_enabled: true,
        expiry_date: '',
        is_published: true,
      });
    }
  }, [open, initial, courses]);

  const loadQuestions = async (id: number) => {
    try {
      const qs = await api<QuestionRow[]>(`/api/admin/tests/${id}/questions`);
      setQuestions(qs);
    } catch {
      setQuestions([]);
    }
  };

  if (!open) return null;

  const saveQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        course_id: form.course_id ? Number(form.course_id) : null,
        is_published: form.is_published ? 1 : 0,
        certificate_enabled: form.certificate_enabled ? 1 : 0,
      };
      if (quizId) {
        await api(`/api/admin/tests/${quizId}`, { method: 'PUT', body: JSON.stringify(payload) });
      } else {
        const created = await api<{ id: number }>('/api/admin/tests', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        setQuizId(created.id);
      }
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const addQuestion = async () => {
    if (!quizId || !qForm.question_text.trim() || !qForm.opt1.trim() || !qForm.opt2.trim()) return;
    const options = [qForm.opt1, qForm.opt2, qForm.opt3, qForm.opt4].map((o) => o.trim()).filter(Boolean);
    await api(`/api/admin/tests/${quizId}/questions`, {
      method: 'POST',
      body: JSON.stringify({
        question_text: qForm.question_text.trim(),
        options,
        correct_index: qForm.correct_index,
        marks: Number(qForm.marks || 2),
        explanation: qForm.explanation,
      }),
    });
    setQForm({
      question_text: '',
      opt1: '',
      opt2: '',
      opt3: '',
      opt4: '',
      correct_index: 0,
      marks: 2,
      explanation: '',
    });
    loadQuestions(quizId);
    onSaved();
  };

  const deleteQuestion = async (qid: number) => {
    await api(`/api/admin/questions/${qid}`, { method: 'DELETE' });
    if (quizId) loadQuestions(quizId);
    onSaved();
  };

  const inputCls =
    'w-full rounded-xl border border-slate-700 bg-slate-900/90 px-3.5 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-[#FF7A00] focus:outline-none';
  const labelCls = 'block text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-3 sm:p-6 backdrop-blur-xs">
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-800 bg-[#0F172A] text-slate-100 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
          <h2 className="font-display text-lg font-bold text-white">
            {quizId ? `Manage Quiz — ${form.title}` : 'Create New Quiz / Mock Test'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-800 hover:text-white cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex gap-2 border-b border-slate-800 bg-slate-900/50 px-5 pt-2.5">
          <button
            type="button"
            onClick={() => setTab('details')}
            className={`border-b-2 px-4 py-2 text-xs font-bold cursor-pointer ${
              tab === 'details' ? 'border-[#FF7A00] text-[#FF7A00]' : 'border-transparent text-slate-400'
            }`}
          >
            Quiz Settings
          </button>
          <button
            type="button"
            onClick={() => setTab('questions')}
            className={`inline-flex items-center gap-1.5 border-b-2 px-4 py-2 text-xs font-bold cursor-pointer ${
              tab === 'questions' ? 'border-[#FF7A00] text-[#FF7A00]' : 'border-transparent text-slate-400'
            }`}
          >
            <HelpCircle className="h-3.5 w-3.5" />
            Questions ({questions.length})
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {tab === 'details' ? (
            <form id="quiz-form" onSubmit={saveQuiz} className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className={labelCls}>Quiz Title *</label>
                <input
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Assigned Course</label>
                <select
                  value={form.course_id}
                  onChange={(e) => setForm({ ...form, course_id: e.target.value })}
                  className={inputCls}
                >
                  <option value="">General Assessment</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Difficulty</label>
                <select
                  value={form.difficulty}
                  onChange={(e) => setForm({ ...form, difficulty: e.target.value as 'Easy' | 'Medium' | 'Hard' })}
                  className={inputCls}
                >
                  <option>Easy</option>
                  <option>Medium</option>
                  <option>Hard</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Duration (Minutes)</label>
                <input
                  type="number"
                  min={1}
                  value={form.duration_minutes}
                  onChange={(e) => setForm({ ...form, duration_minutes: Number(e.target.value) })}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Total Marks</label>
                <input
                  type="number"
                  min={1}
                  value={form.total_marks}
                  onChange={(e) => setForm({ ...form, total_marks: Number(e.target.value) })}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Pass Marks</label>
                <input
                  type="number"
                  min={0}
                  value={form.pass_marks}
                  onChange={(e) => setForm({ ...form, pass_marks: Number(e.target.value) })}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Quiz Price (₹, 0 = Free)</label>
                <input
                  type="number"
                  min={0}
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Expiry Date (Optional)</label>
                <input
                  type="date"
                  value={form.expiry_date}
                  onChange={(e) => setForm({ ...form, expiry_date: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div className="flex flex-col justify-center gap-2 pt-3">
                <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.is_published}
                    onChange={(e) => setForm({ ...form, is_published: e.target.checked })}
                    className="h-4 w-4 accent-[#FF7A00]"
                  />
                  Published & Visible to Students
                </label>
                <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.certificate_enabled}
                    onChange={(e) => setForm({ ...form, certificate_enabled: e.target.checked })}
                    className="h-4 w-4 accent-[#FF7A00]"
                  />
                  Enable Quiz Certificate
                </label>
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>Description</label>
                <textarea
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className={inputCls}
                />
              </div>
            </form>
          ) : !quizId ? (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-200">
              Save Quiz Settings first to unlock MCQ Question management.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#FF7A00]">Add MCQ Question</h4>
                <input
                  value={qForm.question_text}
                  onChange={(e) => setQForm({ ...qForm, question_text: e.target.value })}
                  placeholder="Enter question statement..."
                  className={inputCls}
                />
                <div className="grid gap-2 sm:grid-cols-2">
                  <input
                    value={qForm.opt1}
                    onChange={(e) => setQForm({ ...qForm, opt1: e.target.value })}
                    placeholder="Option A"
                    className={inputCls}
                  />
                  <input
                    value={qForm.opt2}
                    onChange={(e) => setQForm({ ...qForm, opt2: e.target.value })}
                    placeholder="Option B"
                    className={inputCls}
                  />
                  <input
                    value={qForm.opt3}
                    onChange={(e) => setQForm({ ...qForm, opt3: e.target.value })}
                    placeholder="Option C"
                    className={inputCls}
                  />
                  <input
                    value={qForm.opt4}
                    onChange={(e) => setQForm({ ...qForm, opt4: e.target.value })}
                    placeholder="Option D"
                    className={inputCls}
                  />
                </div>
                <div className="grid gap-2 sm:grid-cols-3">
                  <select
                    value={qForm.correct_index}
                    onChange={(e) => setQForm({ ...qForm, correct_index: Number(e.target.value) })}
                    className={inputCls}
                  >
                    <option value={0}>Correct: Option A</option>
                    <option value={1}>Correct: Option B</option>
                    <option value={2}>Correct: Option C</option>
                    <option value={3}>Correct: Option D</option>
                  </select>
                  <input
                    type="number"
                    min={1}
                    value={qForm.marks}
                    onChange={(e) => setQForm({ ...qForm, marks: Number(e.target.value) })}
                    placeholder="Marks"
                    className={inputCls}
                  />
                  <button
                    type="button"
                    onClick={addQuestion}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#FF7A00] px-4 py-2 text-xs font-bold text-white hover:bg-orange-500 cursor-pointer"
                  >
                    <Plus className="h-4 w-4" /> Add Question
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                {questions.map((q, idx) => (
                  <div key={q.id} className="rounded-xl border border-slate-800 bg-slate-900/50 p-3 text-xs">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-bold text-white">
                        Q{idx + 1}. {q.question_text}{' '}
                        <span className="ml-1 text-[11px] font-semibold text-[#FF7A00]">({q.marks} marks)</span>
                      </p>
                      <button
                        type="button"
                        onClick={() => deleteQuestion(q.id)}
                        className="text-rose-400 hover:text-rose-300 cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="mt-2 grid gap-1 sm:grid-cols-2">
                      {q.options.map((opt, i) => (
                        <div
                          key={i}
                          className={`rounded-lg px-2.5 py-1 ${
                            i === q.correct_index
                              ? 'bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30'
                              : 'bg-slate-950/60 text-slate-400'
                          }`}
                        >
                          {String.fromCharCode(65 + i)}. {opt}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-800 bg-slate-900/70 px-5 py-3.5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-700 px-4 py-2 text-xs font-bold text-slate-300 hover:bg-slate-800 cursor-pointer"
          >
            Close
          </button>
          {tab === 'details' && (
            <button
              type="submit"
              form="quiz-form"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-[#FF7A00] px-5 py-2 text-xs font-bold text-white hover:bg-orange-500 cursor-pointer"
            >
              <Save className="h-4 w-4" /> {saving ? 'Saving...' : quizId ? 'Save Quiz' : 'Create Quiz'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
