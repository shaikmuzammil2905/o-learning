import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Award, CheckCircle2, Clock, FileQuestion, Info, PlayCircle, X } from 'lucide-react';
import { PublicLayout } from '../../components/PublicLayout';
import { EmptyState, LoadingState } from '../../components/ui/StateViews';
import { RevealOnScroll } from '../../components/ui/Animations';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import type { TestItem } from '../../types';

export function TestsPage() {
  const [tests, setTests] = useState<TestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewTest, setPreviewTest] = useState<TestItem | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    api<TestItem[]>('/api/public/tests')
      .then(setTests)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleStartTest = (testId: number) => {
    if (!user) {
      navigate(`/login?redirect=/student/tests?start=${testId}`);
      return;
    }
    navigate(`/student/tests?start=${testId}`);
  };

  return (
    <PublicLayout>
      <section className="bg-gradient-to-r from-[#00338D] to-[#0052CC] text-white py-10 sm:py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <RevealOnScroll>
            <h1 className="font-display font-extrabold text-2xl sm:text-4xl">
              Practice Tests & Mock Exams
            </h1>
            <p className="text-sm sm:text-base text-blue-100 mt-2 max-w-2xl">
              Timed exam simulations with instant scoring, negative marking support, detailed answer explanations, and live student rankings.
            </p>
          </RevealOnScroll>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-9">
        {loading ? (
          <LoadingState message="Loading available tests…" />
        ) : tests.length === 0 ? (
          <EmptyState title="No tests available right now." description="Check back soon for new mock exams." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tests.map((test, idx) => (
              <RevealOnScroll key={test.id} delay={idx * 75}>
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs hover:shadow-2xl hover:-translate-y-1.5 transition-all duration-300 flex flex-col h-full">
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="px-3 py-1 rounded-full bg-blue-50 text-[#0052CC] text-[11px] font-bold">
                      {test.course_title || 'General Mock'}
                    </span>
                    <span
                      className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                        test.difficulty === 'Easy'
                          ? 'bg-emerald-50 text-emerald-700'
                          : test.difficulty === 'Hard'
                          ? 'bg-red-50 text-red-700'
                          : 'bg-orange-50 text-[#FF7A00]'
                      }`}
                    >
                      {test.difficulty}
                    </span>
                  </div>

                  <h3 className="font-display font-bold text-lg text-[#0F172A]">{test.title}</h3>
                  <p className="text-xs sm:text-sm text-slate-600 mt-2 flex-1">{test.description}</p>

                  <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-slate-100 text-xs text-slate-600">
                    <div className="flex items-center gap-1.5">
                      <FileQuestion className="w-4 h-4 text-[#0052CC]" />
                      <span>{test.questions_count || 5} Qs</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-[#FF7A00]" />
                      <span>{test.duration_minutes} min</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Award className="w-4 h-4 text-emerald-600" />
                      <span>{test.total_marks} Marks</span>
                    </div>
                  </div>

                  <div className="mt-5 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setPreviewTest(test)}
                      className="px-3.5 py-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Info className="w-3.5 h-3.5 text-[#0052CC]" /> Rules
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStartTest(test.id)}
                      className="flex-1 py-3 rounded-xl bg-[#FF7A00] hover:bg-[#E66D00] text-white font-bold text-sm flex items-center justify-center gap-2 transition cursor-pointer shadow-sm"
                    >
                      <PlayCircle className="w-4 h-4" /> Start Test
                    </button>
                  </div>
                </div>
              </RevealOnScroll>
            ))}
          </div>
        )}
      </section>

      {/* Interactive Test Rules & Preview Popup */}
      {previewTest && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4"
          onClick={() => setPreviewTest(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="px-3 py-1 rounded-full bg-blue-50 text-[#0052CC] text-xs font-bold">
                {previewTest.course_title || 'Mock Assessment'}
              </span>
              <button
                onClick={() => setPreviewTest(null)}
                className="p-1.5 rounded-full hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <h3 className="font-display font-extrabold text-xl text-[#002B7A]">{previewTest.title}</h3>
            <p className="text-xs sm:text-sm text-slate-600 mt-2">{previewTest.description}</p>

            <div className="grid grid-cols-3 gap-2.5 my-4 p-3.5 rounded-2xl bg-slate-50 text-center text-xs">
              <div>
                <p className="text-slate-400">Questions</p>
                <p className="font-bold text-slate-900 text-sm">{previewTest.questions_count || 5}</p>
              </div>
              <div>
                <p className="text-slate-400">Duration</p>
                <p className="font-bold text-slate-900 text-sm">{previewTest.duration_minutes}m</p>
              </div>
              <div>
                <p className="text-slate-400">Pass Marks</p>
                <p className="font-bold text-emerald-600 text-sm">{previewTest.pass_marks}/{previewTest.total_marks}</p>
              </div>
            </div>

            <ul className="space-y-2 text-xs text-slate-700 mb-5">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                Live countdown timer with automatic submission at 00:00
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                Negative marking: {previewTest.negative_marks > 0 ? `-${previewTest.negative_marks} per wrong answer` : 'None'}
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                Instant scorecard, rank & detailed answer explanations
              </li>
            </ul>

            <button
              type="button"
              onClick={() => handleStartTest(previewTest.id)}
              className="w-full py-3 rounded-xl bg-[#FF7A00] hover:bg-[#E66D00] text-white font-bold text-sm cursor-pointer shadow-md"
            >
              Start This Test Now →
            </button>
          </div>
        </div>
      )}
    </PublicLayout>
  );
}
