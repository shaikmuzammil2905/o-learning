import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, Users, UserCheck } from 'lucide-react';
import { PublicLayout } from '../../components/PublicLayout';
import { PaymentModal } from '../../components/PaymentModal';
import { EmptyState, LoadingState } from '../../components/ui/StateViews';
import { useAuth } from '../../context/AuthContext';
import { api, formatCurrency } from '../../lib/api';
import type { Batch } from '../../types';

export function BatchesPage() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'upcoming' | 'completed'>('all');
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    api<Batch[]>('/api/public/batches')
      .then(setBatches)
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter === 'all' ? batches : batches.filter((b) => b.status === filter);

  const handleEnrollBatch = async (batch: Batch) => {
    if (!user) {
      navigate('/login?redirect=/batches');
      return;
    }
    const effective = batch.discount_price ?? batch.price ?? 0;
    if (batch.is_free === 1 || effective === 0) {
      await api('/api/student/enroll/free', {
        method: 'POST',
        body: JSON.stringify({ course_id: batch.course_id, batch_id: batch.id }),
      });
      navigate('/student/courses');
      return;
    }
    setSelectedBatch(batch);
  };

  return (
    <PublicLayout>
      <section className="bg-gradient-to-r from-[#00338D] to-[#0052CC] text-white py-10 sm:py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="font-display font-extrabold text-2xl sm:text-4xl">Live Learning Batches</h1>
          <p className="text-sm sm:text-base text-blue-100 mt-2 max-w-2xl">
            Join structured cohort batches led by expert faculty with fixed daily schedules, peer learning, and live doubt sessions.
          </p>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-5">
          {(['all', 'active', 'upcoming', 'completed'] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setFilter(st)}
              className={`px-4 py-2 rounded-full text-xs font-bold capitalize cursor-pointer transition ${
                filter === st
                  ? 'bg-[#0052CC] text-white'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              {st === 'all' ? 'All Batches' : st}
            </button>
          ))}
        </div>

        {loading ? (
          <LoadingState message="Loading batches…" />
        ) : filtered.length === 0 ? (
          <EmptyState title="No batches in this category" description="Check other batch statuses." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((b) => {
              const seatsLeft = Math.max(0, b.total_seats - b.enrolled_seats);
              const effectivePrice = b.is_free === 1 ? 0 : b.discount_price ?? b.price ?? 0;
              return (
                <div
                  key={b.id}
                  className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col"
                >
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-xs font-bold text-[#0052CC] bg-blue-50 px-3 py-1 rounded-full">
                      {b.course_title}
                    </span>
                    <span
                      className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase ${
                        b.status === 'active'
                          ? 'bg-emerald-50 text-emerald-700'
                          : b.status === 'upcoming'
                          ? 'bg-orange-50 text-[#FF7A00]'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {b.status}
                    </span>
                  </div>

                  <h3 className="font-display font-bold text-lg text-[#0F172A]">{b.name}</h3>

                  <div className="mt-4 space-y-2.5 text-xs sm:text-sm text-slate-600 flex-1">
                    <div className="flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-[#0052CC]" />
                      <span>Faculty: <strong>{b.faculty_name}</strong></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-[#FF7A00]" />
                      <span>{b.start_date} to {b.end_date}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-[#0052CC]" />
                      <span>{b.timings}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-emerald-600" />
                      <span>{seatsLeft} seats available (of {b.total_seats})</span>
                    </div>
                  </div>

                  <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                    <span className="font-display font-extrabold text-lg text-[#00338D]">
                      {b.is_free === 1 ? 'FREE' : formatCurrency(effectivePrice)}
                    </span>
                    <button
                      type="button"
                      disabled={b.status === 'completed' || seatsLeft === 0}
                      onClick={() => handleEnrollBatch(b)}
                      className="px-5 py-2.5 rounded-xl bg-[#FF7A00] hover:bg-[#E66D00] text-white text-xs font-bold disabled:opacity-50 cursor-pointer"
                    >
                      {b.status === 'completed' ? 'Batch Completed' : 'Enroll in Batch'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {selectedBatch && (
        <PaymentModal
          open={Boolean(selectedBatch)}
          onClose={() => setSelectedBatch(null)}
          itemType="course"
          itemId={selectedBatch.course_id}
          itemTitle={`${selectedBatch.course_title} (${selectedBatch.name})`}
          amount={selectedBatch.price || 1999}
          discountAmount={Math.max(
            0,
            (selectedBatch.price || 1999) - (selectedBatch.discount_price ?? selectedBatch.price ?? 1999)
          )}
          finalAmount={selectedBatch.discount_price ?? selectedBatch.price ?? 1999}
          batchId={selectedBatch.id}
          onSuccess={() => navigate('/student/courses')}
        />
      )}
    </PublicLayout>
  );
}

