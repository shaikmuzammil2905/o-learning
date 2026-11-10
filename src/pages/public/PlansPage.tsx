import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Sparkles } from 'lucide-react';
import { PublicLayout } from '../../components/PublicLayout';
import { PaymentModal } from '../../components/PaymentModal';
import { LoadingState } from '../../components/ui/StateViews';
import { useSite } from '../../context/SiteContext';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency } from '../../lib/api';
import type { SubscriptionPlan } from '../../types';

export function PlansPage() {
  const { plans, loading } = useSite();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);

  const handleSubscribe = (plan: SubscriptionPlan) => {
    if (!user) {
      navigate('/login?redirect=/plans');
      return;
    }
    setSelectedPlan(plan);
  };

  return (
    <PublicLayout>
      <section className="bg-gradient-to-r from-[#00338D] to-[#0052CC] text-white py-10 sm:py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-orange-300 text-xs font-bold mb-3">
            <Sparkles className="w-3.5 h-3.5" /> AFFORDABLE SUBSCRIPTIONS
          </span>
          <h1 className="font-display font-extrabold text-2xl sm:text-4xl">
            Subscription Plans Built for Every Learner
          </h1>
          <p className="text-sm sm:text-base text-blue-100 mt-2 max-w-2xl mx-auto">
            Unlock live classes, recorded lectures, mock tests, and verified certificates with one simple plan.
          </p>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {loading ? (
          <LoadingState message="Loading subscription plans…" />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`rounded-3xl p-7 flex flex-col ${
                  plan.is_popular
                    ? 'bg-gradient-to-b from-[#0038A8] to-[#0052CC] text-white shadow-2xl border-2 border-[#FF7A00]'
                    : 'bg-white border border-slate-200 shadow-sm'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <h2 className="font-display font-bold text-xl">{plan.name}</h2>
                  {plan.badge && (
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold ${
                        plan.is_popular ? 'bg-[#FF7A00] text-white' : 'bg-blue-50 text-[#0052CC]'
                      }`}
                    >
                      {plan.badge}
                    </span>
                  )}
                </div>

                <div className="mt-5 flex items-baseline gap-1.5">
                  <span className="font-display font-extrabold text-4xl">
                    {formatCurrency(plan.price)}
                  </span>
                  <span className={`text-sm ${plan.is_popular ? 'text-blue-100' : 'text-slate-500'}`}>
                    / {plan.duration_months} Months
                  </span>
                </div>

                <ul className="mt-6 space-y-3 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm">
                      <Check
                        className={`w-4 h-4 shrink-0 mt-0.5 ${
                          plan.is_popular ? 'text-[#FF9B3D]' : 'text-emerald-500'
                        }`}
                      />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <button
                  type="button"
                  onClick={() => handleSubscribe(plan)}
                  className={`mt-7 w-full py-3.5 rounded-xl font-bold text-sm transition cursor-pointer ${
                    plan.is_popular
                      ? 'bg-[#FF7A00] hover:bg-[#E66D00] text-white shadow-lg shadow-orange-600/25'
                      : 'bg-[#0052CC] hover:bg-[#003EB3] text-white'
                  }`}
                >
                  Subscribe Now
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {selectedPlan && (
        <PaymentModal
          open={Boolean(selectedPlan)}
          onClose={() => setSelectedPlan(null)}
          itemType="subscription"
          itemId={selectedPlan.id}
          itemTitle={`${selectedPlan.name} (${selectedPlan.duration_months} Months)`}
          amount={selectedPlan.price}
          discountAmount={0}
          finalAmount={selectedPlan.price}
          onSuccess={() => navigate('/student/payments')}
        />
      )}
    </PublicLayout>
  );
}
