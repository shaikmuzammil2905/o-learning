import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Check,
  Copy,
  ExternalLink,
  Instagram,
  Link2,
  Loader2,
  MessageCircle,
  Share2,
  X,
} from 'lucide-react';
import type { Course } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  buildCourseShareMessage,
  formatCoursePriceLabel,
  generateCourseReferralCode,
  generateReferralLink,
  trackReferralEvent,
} from '../lib/referral';

interface CourseShareModalProps {
  course: Course;
  open: boolean;
  onClose: () => void;
  presetReferralCode?: string;
}

export function CourseShareModal({
  course,
  open,
  onClose,
  presetReferralCode,
}: CourseShareModalProps) {
  const { user } = useAuth();
  const [referralCode, setReferralCode] = useState(presetReferralCode || '');
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [instagramNotice, setInstagramNotice] = useState(false);

  const supportsNativeShare =
    typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  useEffect(() => {
    if (!open) return;
    setCopied(false);
    setInstagramNotice(false);

    if (presetReferralCode) {
      setReferralCode(presetReferralCode);
      trackReferralEvent(course.id, presetReferralCode, 'share_clicked');
      return;
    }

    let cancelled = false;
    setGenerating(true);
    generateCourseReferralCode(course, user?.referral_code)
      .then((code) => {
        if (cancelled) return;
        setReferralCode(code);
        trackReferralEvent(course.id, code, 'share_clicked');
      })
      .finally(() => {
        if (!cancelled) setGenerating(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, course.id, course.slug, presetReferralCode, user?.referral_code]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const fallbackCode = user?.referral_code ? `${user.referral_code}-${course.id}` : `OL-${course.id}SHARE`;
  const activeCode = referralCode || fallbackCode;
  const referralLink = generateReferralLink(course, activeCode);
  const shareMessage = buildCourseShareMessage(course, referralLink);
  const priceLabel = formatCoursePriceLabel(course);
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareMessage)}`;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = referralLink;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
  };

  const handleCopyLink = async () => {
    await copyToClipboard();
    setCopied(true);
    setInstagramNotice(false);
    trackReferralEvent(course.id, activeCode, 'referral_link_copied');
    setTimeout(() => setCopied(false), 3000);
  };

  const handleWhatsApp = () => {
    trackReferralEvent(course.id, activeCode, 'whatsapp_share');
  };

  const handleInstagram = async () => {
    await copyToClipboard();
    setInstagramNotice(true);
    setCopied(false);
    trackReferralEvent(course.id, activeCode, 'instagram_share');
  };

  const handleNativeShare = async () => {
    if (!supportsNativeShare) return;
    try {
      await navigator.share({
        title: `${course.title} — O-Learning Platform`,
        text: shareMessage,
        url: referralLink,
      });
      trackReferralEvent(course.id, activeCode, 'native_share');
    } catch {
      // User cancelled share sheet; ignore gracefully
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-xs sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-course-title"
    >
      <div
        className="w-full sm:max-w-[465px] bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col animate-[fadeIn_0.18s_ease-out]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Drag Pill */}
        <div className="sm:hidden flex justify-center pt-2.5 pb-1">
          <span className="w-10 h-1 rounded-full bg-slate-300" />
        </div>

        {/* Header */}
        <div className="px-5 pt-3 pb-3 sm:px-6 sm:pt-5 border-b border-slate-100 flex items-start justify-between gap-3">
          <div>
            <h3 id="share-course-title" className="font-display font-extrabold text-lg sm:text-xl text-[#002B7A]">
              Share this course
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Invite your friends to explore this course
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close share modal"
            className="p-2 rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 space-y-4 overflow-y-auto pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          {/* Course Summary Preview */}
          <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
            <img
              src={course.thumbnail_url}
              alt={course.title}
              className="w-24 aspect-[16/9] rounded-xl object-cover shrink-0 bg-blue-50"
            />
            <div className="min-w-0 flex-1">
              <h4 className="font-display font-bold text-sm text-[#0F172A] truncate">
                {course.title}
              </h4>
              <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5 leading-snug">
                {course.short_description}
              </p>
              <p className="font-display font-extrabold text-sm text-[#0052CC] mt-1">
                {priceLabel}
              </p>
            </div>
          </div>

          {/* Share Options */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2.5">
              Share with
            </p>
            <div className="grid grid-cols-1 gap-2.5">
              {/* WhatsApp */}
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noreferrer"
                onClick={handleWhatsApp}
                className="w-full py-3 px-4 rounded-2xl bg-[#25D366] hover:bg-[#1FB858] text-white font-bold text-sm flex items-center justify-between shadow-sm transition"
              >
                <span className="inline-flex items-center gap-2.5">
                  <MessageCircle className="w-5 h-5 fill-white" />
                  Share on WhatsApp
                </span>
                <ExternalLink className="w-4 h-4 opacity-90" />
              </a>

              {/* Instagram */}
              <button
                type="button"
                onClick={handleInstagram}
                className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#F77737] hover:opacity-95 text-white font-bold text-sm flex items-center justify-between shadow-sm transition cursor-pointer"
              >
                <span className="inline-flex items-center gap-2.5">
                  <Instagram className="w-5 h-5" />
                  Share to Instagram
                </span>
                <span className="text-[11px] font-semibold bg-white/20 px-2 py-0.5 rounded-full">
                  Copy &amp; Open
                </span>
              </button>

              {/* Copy Link */}
              <button
                type="button"
                onClick={handleCopyLink}
                className="w-full py-3 px-4 rounded-2xl bg-[#0052CC] hover:bg-[#003EB3] text-white font-bold text-sm flex items-center justify-between shadow-sm transition cursor-pointer"
              >
                <span className="inline-flex items-center gap-2.5">
                  {copied ? <Check className="w-5 h-5 text-emerald-300" /> : <Link2 className="w-5 h-5" />}
                  {copied ? 'Course link copied!' : 'Copy Link'}
                </span>
                <Copy className="w-4 h-4 opacity-90" />
              </button>

              {/* Native Share (Web Share API feature-detected) */}
              {supportsNativeShare && (
                <button
                  type="button"
                  onClick={handleNativeShare}
                  className="w-full py-3 px-4 rounded-2xl bg-orange-50 hover:bg-orange-100 border border-orange-200 text-[#E66D00] font-bold text-sm flex items-center justify-between transition cursor-pointer"
                >
                  <span className="inline-flex items-center gap-2.5">
                    <Share2 className="w-5 h-5" />
                    More ways to share
                  </span>
                  <span className="text-xs font-semibold">Device Sheet →</span>
                </button>
              )}
            </div>
          </div>

          {/* Feedback Notices */}
          {copied && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>✓ Referral link copied successfully</span>
            </div>
          )}

          {instagramNotice && (
            <div className="p-3.5 rounded-xl bg-fuchsia-50 border border-fuchsia-200 text-fuchsia-900 text-xs space-y-2">
              <p className="font-bold">
                Course link copied. Open Instagram and share it in your Story, DM or profile.
              </p>
              <a
                href="https://www.instagram.com/"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-fuchsia-600 text-white font-bold text-[11px]"
              >
                Open Instagram <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}

          {/* Generated Referral Link Box */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Your referral link
              </p>
              {generating && (
                <span className="inline-flex items-center gap-1 text-[11px] text-[#0052CC] font-semibold">
                  <Loader2 className="w-3 h-3 animate-spin" /> Generating…
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 p-1.5 pl-3 rounded-xl bg-slate-100 border border-slate-200">
              <input
                type="text"
                readOnly
                value={referralLink}
                aria-label="Generated course referral link"
                onClick={(e) => (e.target as HTMLInputElement).select()}
                className="flex-1 min-w-0 bg-transparent text-xs font-mono text-slate-700 outline-none truncate"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className="px-3 py-2 rounded-lg bg-white border border-slate-200 hover:bg-blue-50 text-[#0052CC] text-xs font-bold shrink-0 cursor-pointer transition"
              >
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

