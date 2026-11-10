import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Award, Clock, FileQuestion, PlayCircle } from 'lucide-react';
import { PublicLayout } from '../../components/PublicLayout';
import { EmptyState, LoadingState } from '../../components/ui/StateViews';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import type { TestItem } from '../../types';

export function TestsPage() {
  const [tests, setTests] = useState<TestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    api<TestItem[]>('/api/public/tests')
      .then(setTests)
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
          <h1 className="font-display font-extrabold text-2xl sm:text-4xl">
            Practice Tests & Mock Exams
          </h1>
          <p className="text-sm sm:text-base text-blue-100 mt-2 max-w-2xl">
            Timed exam simulations with instant scoring, negative marking support, detailed answer explanations, and live student rankings.
          </p>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-9">
        {loading ? (
          <LoadingState message="Loading available tests…" />
        ) : tests.length === 0 ? (
          <EmptyState title="No tests available right now." description="Check back soon for new mock exams." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tests.map((test) => (
              <div
                key={test.id}
                className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs hover:shadow-lg transition flex flex-col"
              >
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

                <button
                  type="button"
                  onClick={() => handleStartTest(test.id)}
                  className="mt-5 w-full py-3 rounded-xl bg-[#FF7A00] hover:bg-[#E66D00] text-white font-bold text-sm flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <PlayCircle className="w-4 h-4" /> Start Test
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </PublicLayout>
  );
}

