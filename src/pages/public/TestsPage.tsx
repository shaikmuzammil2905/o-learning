import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Award, CheckCircle2, Clock, FileQuestion, Info, PlayCircle, ShieldCheck, Trophy, X } from 'lucide-react';
import { PublicLayout } from '../../components/PublicLayout';
import { EmptyState } from '../../components/ui/StateViews';
import { RevealOnScroll } from '../../components/ui/Animations';
import { useAuth } from '../../context/AuthContext';
import { useSite } from '../../context/SiteContext';
import type { TestItem } from '../../types';

export function TestsPage() {
  const { tests } = useSite();
  const [previewTest, setPreviewTest] = useState<TestItem | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();

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
        {tests.length === 0 ? (
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

      {/* Enriched Interactive Test Rules & Preview Popup */}
      {previewTest && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4"
          onClick={() => setPreviewTest(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-blue-50 text-[#0052CC] text-xs font-bold">
                  {previewTest.course_title || 'Mock Assessment'}
                </span>
                <span className="px-2.5 py-1 rounded-full bg-orange-50 text-[#FF7A00] text-xs font-bold">
                  {previewTest.difficulty} Level
                </span>
              </div>
              <button
                onClick={() => setPreviewTest(null)}
                className="p-1.5 rounded-full hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <h3 className="font-display font-extrabold text-2xl text-[#002B7A]">{previewTest.title}</h3>
            <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed">{previewTest.description}</p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 my-4 p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-center text-xs">
              <div>
                <p className="text-slate-400">Questions</p>
                <p className="font-bold text-slate-900 text-sm">{previewTest.questions_count || 5} MCQs</p>
              </div>
              <div>
                <p className="text-slate-400">Duration</p>
                <p className="font-bold text-slate-900 text-sm">{previewTest.duration_minutes} mins</p>
              </div>
              <div>
                <p className="text-slate-400">Pass Cut-off</p>
                <p className="font-bold text-emerald-600 text-sm">{previewTest.pass_marks}/{previewTest.total_marks}</p>
              </div>
              <div>
                <p className="text-slate-400">Negative</p>
                <p className="font-bold text-red-600 text-sm">
                  {previewTest.negative_marks > 0 ? `-${previewTest.negative_marks}` : 'None'}
                </p>
              </div>
            </div>

            <div className="space-y-2.5 mb-5">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Exam Guidelines & Analytics</p>
              {[
                'Real-time countdown clock with automatic submission when time expires.',
                'Interactive question palette lets you jump between answered & unanswered items.',
                'Instant accuracy percentage, peer rank calculation, and full solution explanations.',
                'Multiple attempts permitted so you can track improvement over time.',
              ].map((g) => (
                <div key={g} className="flex items-start gap-2 text-xs sm:text-sm text-slate-700">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>{g}</span>
                </div>
              ))}
            </div>

            <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-100 flex items-center gap-3 text-xs text-[#00338D] mb-5">
              <Trophy className="w-5 h-5 text-[#FF7A00] shrink-0" />
              <span>Score {previewTest.pass_marks}+ marks to pass and boost your Student Leaderboard rank.</span>
            </div>

            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => handleStartTest(previewTest.id)}
                className="flex-1 py-3 rounded-xl bg-[#FF7A00] hover:bg-[#E66D00] text-white font-bold text-sm cursor-pointer shadow-md inline-flex items-center justify-center gap-2"
              >
                <ShieldCheck className="w-4 h-4" /> Start This Test Now →
              </button>
              <button
                type="button"
                onClick={() => setPreviewTest(null)}
                className="px-4 py-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </PublicLayout>
  );
}
