import { useEffect, useState } from 'react';
import { Check, Copy, Gift, Share2, Users, Wallet } from 'lucide-react';
import { DashboardLayout, STUDENT_LINKS } from '../../components/DashboardLayout';
import { LoadingState } from '../../components/ui/StateViews';
import { api, formatCurrency, formatDateTime } from '../../lib/api';

interface ReferralData {
  referral_code: string;
  stats: {
    totalReferrals: number;
    successfulReferrals: number;
    rewardsEarned: number;
  };
  config: {
    rewardAmount: number;
    discountPercent: number;
    headline: string;
  };
  referrals: Array<{
    id: number;
    referred_name: string;
    status: string;
    reward_amount: number;
    created_at: string;
  }>;
}

export function ReferralsPage() {
  const [data, setData] = useState<ReferralData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api<ReferralData>('/api/student/referrals')
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading || !data) {
    return (
      <DashboardLayout title="Refer & Earn" links={STUDENT_LINKS}>
        <LoadingState message="Loading your referral rewards…" />
      </DashboardLayout>
    );
  }

  const shareText = `Join O-LEARNING PLATFORM ("Learn Today, Lead Tomorrow!") using my referral code ${data.referral_code} and get started! Register here: ${window.location.origin}/register?ref=${data.referral_code}`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(data.referral_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      await navigator.share({ title: 'O-LEARNING PLATFORM Referral', text: shareText });
    } else {
      handleCopy();
    }
  };

  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;

  return (
    <DashboardLayout
      title="Refer & Earn Rewards"
      subtitle="Invite friends and earn rewards for every successful student signup"
      links={STUDENT_LINKS}
    >
      <div className="space-y-6">
        {/* Hero Referral Card */}
        <div className="bg-gradient-to-br from-[#00338D] via-[#0052CC] to-[#0B6FF4] text-white rounded-3xl p-6 sm:p-8 shadow-xl">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-orange-300 text-xs font-bold">
              <Gift className="w-4 h-4" /> EARN {formatCurrency(data.config.rewardAmount)} PER REFERRAL
            </span>
            <h2 className="font-display font-extrabold text-2xl sm:text-3xl mt-3">
              {data.config.headline || 'Invite Friends & Earn Rewards!'}
            </h2>
            <p className="text-sm text-blue-100 mt-2">
              Share your unique referral code via WhatsApp or link. Earn {formatCurrency(data.config.rewardAmount)} when your friend joins!
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <div className="bg-white text-[#002B7A] px-5 py-3 rounded-2xl font-mono font-extrabold text-lg tracking-wider flex items-center gap-3 shadow-md">
                <span>{data.referral_code}</span>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="p-1.5 rounded-lg bg-blue-50 text-[#0052CC] hover:bg-blue-100 cursor-pointer"
                  aria-label="Copy referral code"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              <a
                href={whatsappUrl}
                target="_blank"
                rel="noreferrer"
                className="px-5 py-3.5 rounded-2xl bg-[#25D366] hover:bg-[#1FB858] text-white font-bold text-sm inline-flex items-center gap-2 shadow-lg"
              >
                Share on WhatsApp
              </a>

              <button
                type="button"
                onClick={handleNativeShare}
                className="px-5 py-3.5 rounded-2xl bg-[#FF7A00] hover:bg-[#E66D00] text-white font-bold text-sm inline-flex items-center gap-2 cursor-pointer shadow-lg"
              >
                <Share2 className="w-4 h-4" /> Share Link
              </button>
            </div>
          </div>
        </div>

        {/* 3 Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#0052CC] flex items-center justify-center">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="font-display font-extrabold text-2xl text-slate-900">
                {data.stats.totalReferrals}
              </p>
              <p className="text-xs font-semibold text-slate-500">Total Referrals</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-slate-200 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Check className="w-6 h-6" />
            </div>
            <div>
              <p className="font-display font-extrabold text-2xl text-slate-900">
                {data.stats.successfulReferrals}
              </p>
              <p className="text-xs font-semibold text-slate-500">Successful Referrals</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-slate-200 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-orange-50 text-[#FF7A00] flex items-center justify-center">
              <Wallet className="w-6 h-6" />
            </div>
            <div>
              <p className="font-display font-extrabold text-2xl text-slate-900">
                {formatCurrency(data.stats.rewardsEarned)}
              </p>
              <p className="text-xs font-semibold text-slate-500">Rewards Earned</p>
            </div>
          </div>
        </div>

        {/* Referral History */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-200">
            <h3 className="font-display font-bold text-base text-[#002B7A]">Referral History</h3>
          </div>
          {data.referrals.length === 0 ? (
            <p className="p-6 text-sm text-slate-500 text-center">
              No referrals yet. Share your code above to start earning!
            </p>
          ) : (
            <div className="divide-y divide-slate-100">
              {data.referrals.map((r) => (
                <div key={r.id} className="px-5 py-4 flex items-center justify-between text-sm">
                  <div>
                    <p className="font-bold text-slate-900">{r.referred_name}</p>
                    <p className="text-xs text-slate-500">{formatDateTime(r.created_at)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-emerald-600">+{formatCurrency(r.reward_amount)}</p>
                    <span className="text-[11px] uppercase font-bold text-slate-400">{r.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
