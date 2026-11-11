import { useEffect, useState } from 'react';
import {
  Check,
  Copy,
  Gift,
  Link2,
  MousePointerClick,
  Share2,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react';
import { DashboardLayout, STUDENT_LINKS } from '../../components/DashboardLayout';
import { CourseShareModal } from '../../components/CourseShareModal';
import { LoadingState } from '../../components/ui/StateViews';
import { useSite } from '../../context/SiteContext';
import { api, formatCurrency, formatDateTime } from '../../lib/api';
import type { Course } from '../../types';

interface CourseShareRecord {
  id: number;
  course_id: number;
  course_title: string;
  course_slug: string;
  short_description: string;
  thumbnail_url: string;
  price: number;
  discount_price: number | null;
  is_free: number;
  referral_code: string;
  clicks: number;
  enrollments_count: number;
  status: string;
  created_at: string;
}

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
  courseShares?: CourseShareRecord[];
  courseStats?: {
    coursesShared: number;
    totalClicks: number;
    successfulEnrollments: number;
  };
  recentEvents?: Array<{
    event_type: string;
    referral_code: string;
    created_at: string;
    course_title: string;
  }>;
}

export function ReferralsPage() {
  const { courses } = useSite();
  const [data, setData] = useState<ReferralData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [shareTarget, setShareTarget] = useState<{ course: Course; presetCode?: string } | null>(null);

  const loadReferrals = () => {
    api<ReferralData>('/api/student/referrals')
      .then(setData)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadReferrals();
  }, []);

  if (loading || !data) {
    return (
      <DashboardLayout title="My Referrals" links={STUDENT_LINKS}>
        <LoadingState message="Loading your referral rewards…" />
      </DashboardLayout>
    );
  }

  const myReferralUrl = `${window.location.origin}/register?ref=${data.referral_code}`;
  const shareText = `Join O-LEARNING PLATFORM ("Learn Today, Lead Tomorrow!") using my referral code ${data.referral_code} and get started! Register here: ${myReferralUrl}`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(data.referral_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(myReferralUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      await navigator.share({ title: 'O-LEARNING PLATFORM Referral', text: shareText, url: myReferralUrl });
    } else {
      handleCopyLink();
    }
  };

  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
  const courseStats = data.courseStats || {
    coursesShared: 0,
    totalClicks: 0,
    successfulEnrollments: 0,
  };
  const courseShares = data.courseShares || [];

  const openShareForRow = (row: CourseShareRecord) => {
    const matched = courses.find((c) => c.id === row.course_id || c.slug === row.course_slug);
    const courseObj: Course = matched || {
      id: row.course_id,
      slug: row.course_slug,
      category_id: null,
      title: row.course_title,
      short_description: row.short_description,
      description: row.short_description,
      thumbnail_url: row.thumbnail_url,
      icon_name: 'BookOpen',
      icon_color: 'orange',
      level: 'All Levels',
      duration: '12 Weeks',
      price: row.price,
      discount_price: row.discount_price,
      is_free: row.is_free,
      faculty_id: null,
      what_you_learn: [],
      faqs: [],
      is_published: 1,
    };
    setShareTarget({ course: courseObj, presetCode: row.referral_code });
  };

  return (
    <DashboardLayout
      title="My Referrals & Rewards"
      subtitle="Share courses & invite friends to earn rewards and track clicks & enrollments"
      links={STUDENT_LINKS}
    >
      <div className="space-y-6">
        {/* Hero Referral Card */}
        <div className="bg-gradient-to-br from-[#00338D] via-[#0052CC] to-[#0B6FF4] text-white rounded-3xl p-6 sm:p-8 shadow-xl">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-orange-300 text-xs font-bold">
              <Gift className="w-4 h-4" /> EARN {formatCurrency(data.config.rewardAmount)} PER REFERRAL
            </span>
            <h2 className="font-display font-extrabold text-2xl sm:text-3xl mt-3">
              {data.config.headline || 'Invite Friends & Earn Rewards!'}
            </h2>
            <p className="text-sm text-blue-100 mt-2">
              Share your personal referral link or any individual course link via WhatsApp, Instagram, or Copy Link.
            </p>

            {/* My Referral Link */}
            <div className="mt-5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-blue-200 mb-1.5">
                My Referral Link
              </p>
              <div className="flex flex-col sm:flex-row gap-2.5">
                <div className="flex-1 bg-white/12 border border-white/25 rounded-2xl px-4 py-2.5 flex items-center justify-between gap-3">
                  <span className="font-mono text-xs sm:text-sm truncate text-white">{myReferralUrl}</span>
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="px-3 py-1.5 rounded-xl bg-white text-[#00338D] text-xs font-bold shrink-0 cursor-pointer hover:bg-blue-50"
                  >
                    {copiedLink ? '✓ Copied' : 'Copy Link'}
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <div className="bg-white text-[#002B7A] px-4 py-2.5 rounded-2xl font-mono font-extrabold text-base tracking-wider flex items-center gap-2.5 shadow-md">
                <span>{data.referral_code}</span>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="p-1 rounded-lg bg-blue-50 text-[#0052CC] hover:bg-blue-100 cursor-pointer"
                  aria-label="Copy referral code"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              <a
                href={whatsappUrl}
                target="_blank"
                rel="noreferrer"
                className="px-5 py-3 rounded-2xl bg-[#25D366] hover:bg-[#1FB858] text-white font-bold text-sm inline-flex items-center gap-2 shadow-lg"
              >
                Share on WhatsApp
              </a>

              <button
                type="button"
                onClick={handleNativeShare}
                className="px-5 py-3 rounded-2xl bg-[#FF7A00] hover:bg-[#E66D00] text-white font-bold text-sm inline-flex items-center gap-2 cursor-pointer shadow-lg"
              >
                <Share2 className="w-4 h-4" /> Share Link
              </button>
            </div>
          </div>
        </div>

        {/* Course Sharing + Signup Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-blue-50 text-[#0052CC] flex items-center justify-center shrink-0">
              <Link2 className="w-5 h-5" />
            </div>
            <div>
              <p className="font-display font-extrabold text-2xl text-slate-900">
                {courseStats.coursesShared}
              </p>
              <p className="text-xs font-semibold text-slate-500">Courses Shared</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200 flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <MousePointerClick className="w-5 h-5" />
            </div>
            <div>
              <p className="font-display font-extrabold text-2xl text-slate-900">
                {courseStats.totalClicks}
              </p>
              <p className="text-xs font-semibold text-slate-500">Total Clicks</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200 flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <p className="font-display font-extrabold text-2xl text-slate-900">
                {courseStats.successfulEnrollments + data.stats.successfulReferrals}
              </p>
              <p className="text-xs font-semibold text-slate-500">Successful Enrollments</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200 flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-orange-50 text-[#FF7A00] flex items-center justify-center shrink-0">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <p className="font-display font-extrabold text-2xl text-slate-900">
                {formatCurrency(data.stats.rewardsEarned)}
              </p>
              <p className="text-xs font-semibold text-slate-500">Rewards Earned</p>
            </div>
          </div>
        </div>

        {/* Course Referral Activity with Share Again */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="font-display font-bold text-base text-[#002B7A]">
                Course Referral Activity
              </h3>
              <p className="text-xs text-slate-500">Track clicks &amp; enrollments on courses you shared</p>
            </div>
          </div>

          {courseShares.length === 0 ? (
            <div className="p-6 text-center space-y-3">
              <p className="text-sm text-slate-500">
                You haven&apos;t generated a course referral link yet. Pick any course below to start sharing!
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {courseShares.map((row) => (
                <div key={row.id} className="p-4 sm:px-5 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <img
                      src={row.thumbnail_url}
                      alt={row.course_title}
                      className="w-16 aspect-[16/9] rounded-xl object-cover bg-blue-50 shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="font-bold text-sm text-slate-900 truncate">{row.course_title}</p>
                      <p className="text-xs font-mono text-[#0052CC]">
                        Code: {row.referral_code}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs">
                    <div className="text-center">
                      <p className="text-slate-400">Clicks</p>
                      <p className="font-bold text-slate-900 text-sm">{row.clicks}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-slate-400">Enrollments</p>
                      <p className="font-bold text-emerald-600 text-sm">{row.enrollments_count}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => openShareForRow(row)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#FF7A00] hover:bg-[#E66D00] text-white font-bold text-xs cursor-pointer"
                    >
                      <Share2 className="w-3.5 h-3.5" /> Share Again
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Share Any Course */}
        {courses.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <h3 className="font-display font-bold text-base text-[#002B7A] mb-3">
              Share a Course Now
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {courses.slice(0, 8).map((c) => (
                <div
                  key={c.id}
                  className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-2"
                >
                  <span className="text-xs font-bold text-slate-800 truncate">{c.title}</span>
                  <button
                    type="button"
                    onClick={() => setShareTarget({ course: c })}
                    className="px-2.5 py-1.5 rounded-lg bg-[#0052CC] text-white text-[11px] font-bold shrink-0 cursor-pointer"
                  >
                    Share
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Signup Referral History */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-200 flex items-center gap-2">
            <Users className="w-4 h-4 text-[#0052CC]" />
            <h3 className="font-display font-bold text-base text-[#002B7A]">Friend Signup Referrals</h3>
          </div>
          {data.referrals.length === 0 ? (
            <p className="p-6 text-sm text-slate-500 text-center">
              No friend signups yet. Share your referral link above!
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

      {shareTarget && (
        <CourseShareModal
          course={shareTarget.course}
          open={Boolean(shareTarget)}
          presetReferralCode={shareTarget.presetCode}
          onClose={() => {
            setShareTarget(null);
            loadReferrals();
          }}
        />
      )}
    </DashboardLayout>
  );
}
