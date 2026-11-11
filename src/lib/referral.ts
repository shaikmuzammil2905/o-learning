import { api, formatCurrency } from './api';
import type { Course } from '../types';

export type ReferralEventType =
  | 'share_clicked'
  | 'referral_link_generated'
  | 'referral_link_copied'
  | 'whatsapp_share'
  | 'instagram_share'
  | 'native_share'
  | 'referral_visit';

const STORAGE_KEY = 'olearn_course_referral';
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export function getCourseEffectivePrice(course: Pick<Course, 'is_free' | 'price' | 'discount_price'>): number {
  if (course.is_free === 1) return 0;
  return course.discount_price ?? course.price;
}

export function formatCoursePriceLabel(course: Pick<Course, 'is_free' | 'price' | 'discount_price'>): string {
  const effective = getCourseEffectivePrice(course);
  return effective === 0 ? 'Free' : formatCurrency(effective);
}

export function generateReferralLink(course: Pick<Course, 'slug'>, referralCode: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://o-learning.vercel.app';
  const cleanCode = referralCode.trim();
  return `${origin}/courses/${course.slug}?ref=${encodeURIComponent(cleanCode)}`;
}

export function buildCourseShareMessage(
  course: Pick<Course, 'title' | 'short_description' | 'is_free' | 'price' | 'discount_price'>,
  referralLink: string
): string {
  const feeLabel = formatCoursePriceLabel(course);
  return [
    '🎓 Check out this course on O-Learning Platform',
    '',
    course.title,
    course.short_description,
    '',
    `Course Fee: ${feeLabel}`,
    `Join here: ${referralLink}`,
  ].join('\n');
}

export async function generateCourseReferralCode(
  course: Pick<Course, 'id' | 'slug'>,
  userReferralCode?: string
): Promise<string> {
  try {
    const res = await api<{ referral_code: string }>('/api/public/referrals/generate', {
      method: 'POST',
      body: JSON.stringify({ course_id: course.id }),
    });
    if (res?.referral_code) return res.referral_code;
  } catch {
    // Graceful fallback if offline / static preview
  }
  if (userReferralCode) return `${userReferralCode}-${course.id}`;
  const tag = course.slug.replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 3) || 'CRS';
  return `OL-${tag}${String(course.id).padStart(2, '0')}K`;
}

export function trackReferralEvent(
  courseId: number,
  referralCode: string,
  eventType: ReferralEventType
): void {
  if (!courseId || !referralCode) return;
  try {
    fetch('/api/public/referrals/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      keepalive: true,
      body: JSON.stringify({
        course_id: courseId,
        referral_code: referralCode,
        event_type: eventType,
      }),
    }).catch(() => {});
  } catch {
    // non-blocking telemetry
  }
}

export function saveReferralAttribution(courseSlug: string, refCode: string): void {
  const clean = refCode.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
  if (!clean) return;
  const payload = JSON.stringify({
    refCode: clean,
    courseSlug,
    capturedAt: Date.now(),
  });
  try {
    sessionStorage.setItem(STORAGE_KEY, payload);
    localStorage.setItem(STORAGE_KEY, payload);
  } catch {
    // ignore storage errors
  }
}

export function getStoredReferralCode(courseSlug?: string): string | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY) || localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { refCode?: string; courseSlug?: string; capturedAt?: number };
    if (!parsed.refCode) return null;
    if (parsed.capturedAt && Date.now() - parsed.capturedAt > SEVEN_DAYS_MS) {
      clearStoredReferralCode();
      return null;
    }
    if (courseSlug && parsed.courseSlug && parsed.courseSlug !== courseSlug) {
      return parsed.refCode;
    }
    return parsed.refCode;
  } catch {
    return null;
  }
}

export function clearStoredReferralCode(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
