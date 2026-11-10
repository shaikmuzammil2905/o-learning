export type UserRole = 'student' | 'faculty' | 'admin';

export interface User {
  id: number;
  full_name: string;
  email: string;
  mobile: string;
  role: UserRole;
  avatar_url: string | null;
  referral_code: string;
  is_active: number;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string;
  icon_name: string;
  is_active: number;
}

export interface Lesson {
  id: number;
  module_id: number;
  course_id: number;
  title: string;
  lesson_type: 'video' | 'material' | 'quiz' | 'assignment';
  video_url: string;
  material_url: string;
  duration_minutes: number;
  content_text: string;
  is_preview: number;
  sort_order: number;
  unlocked?: boolean;
}

export interface CourseModule {
  id: number;
  course_id: number;
  title: string;
  description: string;
  sort_order: number;
  lessons: Lesson[];
}

export interface Course {
  id: number;
  slug: string;
  category_id: number | null;
  category_name?: string;
  category_slug?: string;
  title: string;
  short_description: string;
  description: string;
  thumbnail_url: string;
  icon_name: string;
  icon_color: string;
  level: string;
  duration: string;
  price: number;
  discount_price: number | null;
  is_free: number;
  faculty_id: number | null;
  faculty_name?: string;
  faculty_title?: string;
  faculty_bio?: string;
  faculty_specialization?: string;
  faculty_experience?: number;
  faculty_qualifications?: string;
  what_you_learn: string[];
  faqs: Array<{ q: string; a: string }>;
  is_published: number;
  modules_count?: number;
  lessons_count?: number;
  avg_rating?: number | null;
  reviews_count?: number;
  modules?: CourseModule[];
  reviews?: Review[];
  batches?: Batch[];
  is_enrolled?: boolean;
}

export interface Review {
  id: number;
  course_id: number;
  student_id: number | null;
  student_name: string;
  rating: number;
  comment: string;
  created_at: string;
}

export interface Batch {
  id: number;
  name: string;
  course_id: number;
  course_title?: string;
  course_slug?: string;
  course_thumbnail?: string;
  faculty_id: number | null;
  faculty_name?: string;
  start_date: string;
  end_date: string;
  timings: string;
  total_seats: number;
  enrolled_seats: number;
  status: 'upcoming' | 'active' | 'completed';
  price?: number;
  discount_price?: number | null;
  is_free?: number;
}

export interface LiveClass {
  id: number;
  title: string;
  course_id: number;
  course_title?: string;
  faculty_id: number | null;
  faculty_name?: string;
  batch_name?: string;
  scheduled_at: string;
  duration_minutes: number;
  meeting_url: string;
  status: 'live' | 'upcoming' | 'completed' | 'cancelled';
  recording_url: string;
  description: string;
}

export interface SubscriptionPlan {
  id: number;
  name: string;
  slug: string;
  price: number;
  duration_months: number;
  badge: string;
  features: string[];
  is_popular: number;
  is_active: number;
}

export interface TestItem {
  id: number;
  title: string;
  course_id: number | null;
  course_title?: string;
  course_slug?: string;
  description: string;
  duration_minutes: number;
  total_marks: number;
  pass_marks: number;
  negative_marks: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  is_published: number;
  questions_count?: number;
  attempts_count?: number;
}

export interface QuestionItem {
  id: number;
  test_id: number;
  question_text: string;
  options: string[];
  correct_index?: number;
  marks: number;
  explanation?: string;
}

export interface Certificate {
  id: number;
  certificate_code: string;
  student_id: number;
  course_id: number;
  student_name: string;
  course_title: string;
  course_duration?: string;
  course_level?: string;
  issued_at: string;
  status: 'valid' | 'revoked';
}

export interface CmsSettings {
  brand: {
    name: string;
    tagline: string;
    supportingTagline: string;
    foundedYear: string;
    location: string;
  };
  hero: {
    heading: string;
    subtext: string;
    primaryCtaLabel: string;
    secondaryCtaLabel: string;
    desktopBgUrl: string;
    mobileBgUrl: string;
    featureList: string[];
  };
  stats: Array<{ label: string; value: string; icon: string }>;
  banner: {
    heading: string;
    bullets: string[];
    ctaLabel: string;
  };
  about: {
    vision: string;
    mission: string;
    coreValues: string[];
    imageUrl: string;
  };
  contact: {
    phone: string;
    whatsapp: string;
    email: string;
    location: string;
    address: string;
  };
  referral: {
    rewardAmount: number;
    discountPercent: number;
    headline: string;
  };
}
