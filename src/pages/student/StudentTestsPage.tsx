import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Award,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileQuestion,
  PlayCircle,
  Trophy,
  XCircle,
} from 'lucide-react';
import { DashboardLayout, STUDENT_LINKS } from '../../components/DashboardLayout';
import { EmptyState, LoadingState } from '../../components/ui/StateViews';
import { api, formatDateTime } from '../../lib/api';
import type { QuestionItem, TestItem } from '../../types';

interface AttemptRecord {
  id: number;
  test_id: number;
  test_title: string;
  score: number;
  total_marks: number;
  correct_count: number;
  wrong_count: number;
  unanswered_count: number;
  percentage: number;
  rank: number;
  submitted_at: string;
}

interface ResultBreakdown {
  question_id: number;
  question_text: string;
  options: string[];
  selected_index: number | null;
  correct_index: number;
  is_correct: boolean;
  explanation: string;
  marks: number;
}

export function StudentTestsPage() {
  const [searchParams] = useSearchParams();
  const [tests, setTests] = useState<TestItem[]>([]);
  const [attempts, setAttempts] = useState<AttemptRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Active Test Runner State
  const [stage, setStage] = useState<'list' | 'instructions' | 'running' | 'result'>('list');
  const [activeTest, setActiveTest] = useState<TestItem | null>(null);
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [currentQ, setCurrentQ] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [resultData, setResultData] = useState<{
    attempt: AttemptRecord;
    breakdown: ResultBreakdown[];
    passed: boolean;
  } | null>(null);

  const timerRef = useRef<number | null>(null);

  const loadList = () => {
    setLoading(true);
    api<{ tests: TestItem[]; attempts: AttemptRecord[] }>('/api/student/tests')
      .then((res) => {
        setTests(res.tests);
        setAttempts(res.attempts);
        const autoStartId = Number(searchParams.get('start'));
        if (autoStartId && stage === 'list') {
          const found = res.tests.find((t) => t.id === autoStartId);
          if (found) prepareTest(found.id);
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadList();
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, []);

  const prepareTest = async (testId: number) => {
    const res = await api<{ test: TestItem; questions: QuestionItem[] }>(
      `/api/student/tests/${testId}/start`
    );
    setActiveTest(res.test);
    setQuestions(res.questions);
    setAnswers({});
    setCurrentQ(0);
    setStage('instructions');
  };

  const beginExam = () => {
    if (!activeTest) return;
    const totalSecs = (activeTest.duration_minutes || 15) * 60;
    setSecondsLeft(totalSecs);
    setStage('running');
  };

  useEffect(() => {
    if (stage !== 'running') return;
    timerRef.current = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) window.clearInterval(timerRef.current);
          handleSubmitExam();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [stage]);

  const handleSubmitExam = async () => {
    if (!activeTest || submitting) return;
    if (timerRef.current) window.clearInterval(timerRef.current);
    setSubmitting(true);
    try {
      const totalSecs = (activeTest.duration_minutes || 15) * 60;
      const res = await api<{
        attempt: AttemptRecord;
        breakdown: ResultBreakdown[];
        passed: boolean;
      }>(`/api/student/tests/${activeTest.id}/submit`, {
        method: 'POST',
        body: JSON.stringify({
          answers,
          time_taken_seconds: Math.max(1, totalSecs - secondsLeft),
        }),
      });
      setResultData(res);
      setStage('result');
      loadList();
    } finally {
      setSubmitting(false);
    }
  };

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <DashboardLayout
      title="Tests & Mock Exams"
      subtitle="Practice timed tests, track scores, and review explanations"
      links={STUDENT_LINKS}
    >
      {/* LIST STAGE */}
      {stage === 'list' && (
        <div className="space-y-8">
          {loading ? (
            <LoadingState message="Loading available tests…" />
          ) : tests.length === 0 ? (
            <EmptyState title="No tests available right now." />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {tests.map((t) => (
                <div key={t.id} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col">
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <span className="px-3 py-1 rounded-full bg-blue-50 text-[#0052CC] text-[11px] font-bold">
                      {t.course_title || 'Mock Test'}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-orange-50 text-[#FF7A00] text-[11px] font-bold">
                      {t.difficulty}
                    </span>
                  </div>
                  <h3 className="font-display font-bold text-base text-slate-900">{t.title}</h3>
                  <p className="text-xs text-slate-500 mt-1 flex-1">{t.description}</p>
                  <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-100 text-xs text-slate-600">
                    <span className="flex items-center gap-1">
                      <FileQuestion className="w-3.5 h-3.5 text-[#0052CC]" /> {t.questions_count || 5} Qs
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-[#FF7A00]" /> {t.duration_minutes}m
                    </span>
                    <span className="flex items-center gap-1">
                      <Award className="w-3.5 h-3.5 text-emerald-600" /> {t.total_marks}M
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => prepareTest(t.id)}
                    className="mt-4 w-full py-2.5 rounded-xl bg-[#FF7A00] hover:bg-[#E66D00] text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <PlayCircle className="w-4 h-4" /> Start Test
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Past Results Table */}
          {attempts.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-5 border-b border-slate-200">
                <h2 className="font-display font-bold text-lg text-[#002B7A]">My Recent Test Results</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                    <tr>
                      <th className="px-5 py-3">Test</th>
                      <th className="px-5 py-3">Score</th>
                      <th className="px-5 py-3">Accuracy</th>
                      <th className="px-5 py-3">Rank</th>
                      <th className="px-5 py-3">Submitted</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {attempts.map((a) => (
                      <tr key={a.id}>
                        <td className="px-5 py-3.5 font-bold text-slate-900">{a.test_title}</td>
                        <td className="px-5 py-3.5 font-bold text-[#0052CC]">
                          {a.score} / {a.total_marks}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold text-xs">
                            {a.percentage}%
                          </span>
                        </td>
                        <td className="px-5 py-3.5 font-bold text-[#FF7A00]">#{a.rank}</td>
                        <td className="px-5 py-3.5 text-slate-500 text-xs">{formatDateTime(a.submitted_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* INSTRUCTIONS STAGE */}
      {stage === 'instructions' && activeTest && (
        <div className="max-w-2xl mx-auto bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-5">
          <span className="px-3 py-1 rounded-full bg-blue-50 text-[#0052CC] text-xs font-bold">
            TEST INSTRUCTIONS
          </span>
          <h2 className="font-display font-extrabold text-2xl text-[#002B7A]">{activeTest.title}</h2>
          <p className="text-sm text-slate-600">{activeTest.description}</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl text-center">
            <div>
              <p className="text-xs text-slate-500">Questions</p>
              <p className="font-bold text-lg text-slate-900">{questions.length}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Duration</p>
              <p className="font-bold text-lg text-slate-900">{activeTest.duration_minutes} mins</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Total Marks</p>
              <p className="font-bold text-lg text-slate-900">{activeTest.total_marks}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Negative Marking</p>
              <p className="font-bold text-lg text-slate-900">-{activeTest.negative_marks}</p>
            </div>
          </div>
          <ul className="text-xs sm:text-sm text-slate-600 space-y-2 list-disc pl-5">
            <li>The timer starts immediately when you click &ldquo;Start Test Now&rdquo;.</li>
            <li>You can jump to any question using the question navigation palette.</li>
            <li>The test will auto-submit automatically when the timer reaches 00:00.</li>
          </ul>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setStage('list')}
              className="px-5 py-3 rounded-xl border border-slate-300 text-sm font-bold text-slate-700 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={beginExam}
              className="flex-1 py-3 rounded-xl bg-[#FF7A00] hover:bg-[#E66D00] text-white text-sm font-bold cursor-pointer shadow-md"
            >
              Start Test Now →
            </button>
          </div>
        </div>
      )}

      {/* RUNNING STAGE */}
      {stage === 'running' && activeTest && questions[currentQ] && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div>
                <p className="text-xs font-bold text-[#0052CC]">
                  Question {currentQ + 1} of {questions.length}
                </p>
                <h3 className="font-display font-bold text-sm text-slate-500">{activeTest.title}</h3>
              </div>
              <div
                className={`px-4 py-2 rounded-xl font-mono font-bold text-sm flex items-center gap-2 ${
                  secondsLeft < 60 ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-[#00338D]'
                }`}
              >
                <Clock className="w-4 h-4" /> {formatTimer(secondsLeft)}
              </div>
            </div>

            <h4 className="font-display font-bold text-lg text-slate-900 leading-snug">
              {questions[currentQ].question_text}
            </h4>

            <div className="space-y-3">
              {questions[currentQ].options.map((opt, idx) => {
                const qid = questions[currentQ].id;
                const selected = answers[qid] === idx;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setAnswers((prev) => ({ ...prev, [qid]: idx }))}
                    className={`w-full text-left p-4 rounded-2xl border text-sm font-medium transition flex items-center gap-3 cursor-pointer ${
                      selected
                        ? 'border-[#0052CC] bg-blue-50 text-[#00338D] font-bold shadow-xs'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <span
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                        selected ? 'bg-[#0052CC] text-white' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {String.fromCharCode(65 + idx)}
                    </span>
                    <span>{opt}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button
                type="button"
                disabled={currentQ === 0}
                onClick={() => setCurrentQ((q) => q - 1)}
                className="inline-flex items-center gap-1 px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" /> Previous
              </button>
              {currentQ < questions.length - 1 ? (
                <button
                  type="button"
                  onClick={() => setCurrentQ((q) => q + 1)}
                  className="inline-flex items-center gap-1 px-5 py-2.5 rounded-xl bg-[#0052CC] text-white text-xs font-bold cursor-pointer"
                >
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleSubmitExam}
                  className="px-6 py-2.5 rounded-xl bg-[#FF7A00] text-white text-xs font-bold cursor-pointer shadow"
                >
                  {submitting ? 'Submitting…' : 'Submit Test'}
                </button>
              )}
            </div>
          </div>

          {/* Question Navigation Palette */}
          <div className="lg:col-span-4 bg-white rounded-3xl p-5 border border-slate-200 shadow-xs h-fit space-y-4">
            <h4 className="font-display font-bold text-sm text-[#002B7A]">Question Palette</h4>
            <div className="grid grid-cols-5 gap-2">
              {questions.map((q, idx) => {
                const answered = answers[q.id] !== undefined;
                const current = idx === currentQ;
                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => setCurrentQ(idx)}
                    className={`h-10 rounded-xl font-bold text-xs transition cursor-pointer ${
                      current
                        ? 'ring-2 ring-[#FF7A00] bg-[#0052CC] text-white'
                        : answered
                        ? 'bg-emerald-500 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              disabled={submitting}
              onClick={handleSubmitExam}
              className="w-full py-3 rounded-xl bg-[#FF7A00] hover:bg-[#E66D00] text-white text-xs font-bold cursor-pointer"
            >
              Finish & Submit Test
            </button>
          </div>
        </div>
      )}

      {/* RESULT STAGE */}
      {stage === 'result' && resultData && (
        <div className="space-y-6 max-w-4xl mx-auto">
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm text-center">
            <div
              className={`w-16 h-16 rounded-2xl mx-auto flex items-center justify-center mb-3 ${
                resultData.passed ? 'bg-emerald-100 text-emerald-600' : 'bg-orange-100 text-[#FF7A00]'
              }`}
            >
              <Trophy className="w-8 h-8" />
            </div>
            <h2 className="font-display font-extrabold text-2xl text-[#002B7A]">
              {resultData.passed ? 'Great Job! Test Passed!' : 'Test Submitted! Keep Practicing'}
            </h2>
            <p className="text-sm text-slate-500 mt-1">{activeTest?.title}</p>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-6">
              <div className="p-3.5 rounded-2xl bg-blue-50">
                <p className="text-[11px] font-semibold text-slate-500">Score</p>
                <p className="font-display font-extrabold text-xl text-[#0052CC]">
                  {resultData.attempt.score}/{resultData.attempt.total_marks}
                </p>
              </div>
              <div className="p-3.5 rounded-2xl bg-emerald-50">
                <p className="text-[11px] font-semibold text-slate-500">Correct</p>
                <p className="font-display font-extrabold text-xl text-emerald-600">
                  {resultData.attempt.correct_count}
                </p>
              </div>
              <div className="p-3.5 rounded-2xl bg-red-50">
                <p className="text-[11px] font-semibold text-slate-500">Wrong</p>
                <p className="font-display font-extrabold text-xl text-red-600">
                  {resultData.attempt.wrong_count}
                </p>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-100">
                <p className="text-[11px] font-semibold text-slate-500">Percentage</p>
                <p className="font-display font-extrabold text-xl text-slate-900">
                  {resultData.attempt.percentage}%
                </p>
              </div>
              <div className="p-3.5 rounded-2xl bg-orange-50">
                <p className="text-[11px] font-semibold text-slate-500">Rank</p>
                <p className="font-display font-extrabold text-xl text-[#FF7A00]">
                  #{resultData.attempt.rank}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setStage('list')}
              className="mt-6 px-6 py-3 rounded-xl bg-[#0052CC] text-white text-sm font-bold cursor-pointer"
            >
              Back to Tests
            </button>
          </div>

          <div className="space-y-3">
            <h3 className="font-display font-bold text-lg text-[#002B7A]">Answer Key & Explanations</h3>
            {resultData.breakdown.map((b, i) => (
              <div key={b.question_id} className="bg-white rounded-2xl p-5 border border-slate-200 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-bold text-sm text-slate-900">
                    Q{i + 1}. {b.question_text}
                  </p>
                  {b.is_correct ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-500 shrink-0" />
                  )}
                </div>
                <p className="text-xs text-slate-600">
                  Your answer:{' '}
                  <strong>
                    {b.selected_index !== null ? b.options[b.selected_index] : 'Not answered'}
                  </strong>{' '}
                  · Correct answer: <strong className="text-emerald-700">{b.options[b.correct_index]}</strong>
                </p>
                {b.explanation && (
                  <p className="text-xs bg-blue-50/70 text-[#00338D] p-3 rounded-xl">{b.explanation}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

