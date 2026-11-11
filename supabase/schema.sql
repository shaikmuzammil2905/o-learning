-- ============================================================================
-- O-LEARNING PLATFORM — SUPABASE POSTGRESQL SCHEMA + RLS POLICIES
-- Run this script once in your Supabase Dashboard -> SQL Editor.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. USERS
CREATE TABLE IF NOT EXISTS public.users (
  id BIGSERIAL PRIMARY KEY,
  auth_uid UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('USER', 'ADMIN', 'FACULTY')) DEFAULT 'USER',
  profile_image TEXT,
  credits NUMERIC(12,2) NOT NULL DEFAULT 0,
  referral_code TEXT NOT NULL UNIQUE,
  referred_by BIGINT REFERENCES public.users(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);

-- 2. CATEGORIES
CREATE TABLE IF NOT EXISTS public.categories (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  image TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL CHECK (status IN ('active', 'inactive')) DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. COURSES
CREATE TABLE IF NOT EXISTS public.courses (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  category_id BIGINT REFERENCES public.categories(id) ON DELETE SET NULL,
  short_description TEXT NOT NULL,
  description TEXT NOT NULL,
  instructor TEXT NOT NULL DEFAULT 'Expert Faculty',
  instructor_image TEXT NOT NULL DEFAULT '',
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  original_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  duration TEXT NOT NULL DEFAULT '12 Weeks',
  level TEXT NOT NULL DEFAULT 'Beginner to Advanced',
  language TEXT NOT NULL DEFAULT 'English / Hindi',
  prerequisites TEXT NOT NULL DEFAULT 'None',
  learning_outcomes JSONB NOT NULL DEFAULT '[]'::jsonb,
  faqs JSONB NOT NULL DEFAULT '[]'::jsonb,
  thumbnail TEXT NOT NULL DEFAULT '',
  banner_image TEXT NOT NULL DEFAULT '',
  preview_image TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL CHECK (status IN ('draft', 'published', 'unpublished')) DEFAULT 'published',
  featured BOOLEAN NOT NULL DEFAULT FALSE,
  published BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_courses_slug ON public.courses(slug);
CREATE INDEX IF NOT EXISTS idx_courses_category ON public.courses(category_id);
CREATE INDEX IF NOT EXISTS idx_courses_published ON public.courses(published);

-- 4. MODULES & LESSONS
CREATE TABLE IF NOT EXISTS public.modules (
  id BIGSERIAL PRIMARY KEY,
  course_id BIGINT NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  sort_order INT NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS public.lessons (
  id BIGSERIAL PRIMARY KEY,
  module_id BIGINT NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  course_id BIGINT NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  lesson_type TEXT NOT NULL CHECK (lesson_type IN ('video', 'material', 'quiz', 'assignment')) DEFAULT 'video',
  video_url TEXT NOT NULL DEFAULT '',
  material_url TEXT NOT NULL DEFAULT '',
  duration_minutes INT NOT NULL DEFAULT 25,
  content_text TEXT NOT NULL DEFAULT '',
  is_preview BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INT NOT NULL DEFAULT 1
);

-- 5. PAYMENTS
CREATE TABLE IF NOT EXISTS public.payments (
  id BIGSERIAL PRIMARY KEY,
  transaction_id TEXT NOT NULL UNIQUE,
  user_id BIGINT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  course_id BIGINT NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  payment_status TEXT NOT NULL CHECK (payment_status IN ('Created', 'Pending', 'Processing', 'Success', 'Failed', 'Cancelled', 'Refunded')) DEFAULT 'Created',
  payment_method TEXT NOT NULL CHECK (payment_method IN ('UPI', 'Card', 'NetBanking', 'Wallet', 'Free')),
  gateway_order_id TEXT NOT NULL DEFAULT '',
  gateway_payment_id TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_payments_user ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(payment_status);

-- 6. ENROLLMENTS
CREATE TABLE IF NOT EXISTS public.enrollments (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  course_id BIGINT NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  payment_id BIGINT REFERENCES public.payments(id) ON DELETE SET NULL,
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  progress INT NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  completed_lessons JSONB NOT NULL DEFAULT '[]'::jsonb,
  completion_status TEXT NOT NULL CHECK (completion_status IN ('active', 'completed', 'upcoming')) DEFAULT 'active',
  UNIQUE(user_id, course_id)
);
CREATE INDEX IF NOT EXISTS idx_enrollments_user ON public.enrollments(user_id);

-- 7. QUIZZES & QUESTIONS
CREATE TABLE IF NOT EXISTS public.quizzes (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  course_id BIGINT REFERENCES public.courses(id) ON DELETE SET NULL,
  category_id BIGINT REFERENCES public.categories(id) ON DELETE SET NULL,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  duration_minutes INT NOT NULL DEFAULT 20,
  total_marks INT NOT NULL DEFAULT 10,
  pass_marks INT NOT NULL DEFAULT 5,
  negative_marks NUMERIC(5,2) NOT NULL DEFAULT 0,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('Easy', 'Medium', 'Hard')) DEFAULT 'Medium',
  certificate_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  expiry_date DATE,
  status TEXT NOT NULL CHECK (status IN ('published', 'draft')) DEFAULT 'published',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.quiz_questions (
  id BIGSERIAL PRIMARY KEY,
  quiz_id BIGINT NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  correct_index INT NOT NULL DEFAULT 0,
  marks INT NOT NULL DEFAULT 2,
  explanation TEXT NOT NULL DEFAULT '',
  sort_order INT NOT NULL DEFAULT 1
);

-- 8. CERTIFICATES
CREATE TABLE IF NOT EXISTS public.certificates (
  id BIGSERIAL PRIMARY KEY,
  certificate_id TEXT NOT NULL UNIQUE,
  user_id BIGINT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  course_id BIGINT NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  student_name TEXT NOT NULL,
  course_name TEXT NOT NULL,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  certificate_url TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL CHECK (status IN ('valid', 'revoked')) DEFAULT 'valid',
  UNIQUE(user_id, course_id)
);

-- 9. REFERRALS, EVENTS & REDEMPTIONS
CREATE TABLE IF NOT EXISTS public.referrals (
  id BIGSERIAL PRIMARY KEY,
  referrer_user_id BIGINT REFERENCES public.users(id) ON DELETE SET NULL,
  referral_code TEXT NOT NULL UNIQUE,
  referral_link TEXT NOT NULL,
  course_id BIGINT NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  referred_user_id BIGINT REFERENCES public.users(id) ON DELETE SET NULL,
  click_count INT NOT NULL DEFAULT 0,
  signup_count INT NOT NULL DEFAULT 0,
  enrollment_count INT NOT NULL DEFAULT 0,
  reward_amount NUMERIC(10,2) NOT NULL DEFAULT 250,
  status TEXT NOT NULL CHECK (status IN ('active', 'paused')) DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_referrals_code ON public.referrals(referral_code);

CREATE TABLE IF NOT EXISTS public.referral_events (
  id BIGSERIAL PRIMARY KEY,
  course_id BIGINT NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  referral_code TEXT NOT NULL,
  event_type TEXT NOT NULL,
  actor_user_id BIGINT REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.redemptions (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  referral_id BIGINT REFERENCES public.referrals(id) ON DELETE SET NULL,
  amount NUMERIC(10,2) NOT NULL,
  method TEXT NOT NULL DEFAULT 'UPI',
  account_reference TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL CHECK (status IN ('Pending', 'Processing', 'Approved', 'Processed', 'Paid', 'Rejected', 'Failed')) DEFAULT 'Pending',
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. CMS SETTINGS & ENQUIRIES
CREATE TABLE IF NOT EXISTS public.cms_settings (
  key TEXT PRIMARY KEY,
  value_json JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.contact_enquiries (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  mobile TEXT NOT NULL,
  subject TEXT NOT NULL DEFAULT 'Course Enquiry',
  message TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('new', 'in_progress', 'resolved')) DEFAULT 'new',
  admin_notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Helper function placed after public.users exists
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE auth_uid = auth.uid() AND UPPER(role) = 'ADMIN' AND is_active = TRUE
  );
$$;

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cms_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_enquiries ENABLE ROW LEVEL SECURITY;

-- Public Read Policies
CREATE POLICY "Public read active categories" ON public.categories FOR SELECT USING (status = 'active' OR public.is_admin());
CREATE POLICY "Public read published courses" ON public.courses FOR SELECT USING (published = TRUE OR public.is_admin());
CREATE POLICY "Public read modules of published courses" ON public.modules FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND (c.published = TRUE OR public.is_admin()))
);
CREATE POLICY "Public read published quizzes" ON public.quizzes FOR SELECT USING (status = 'published' OR public.is_admin());
CREATE POLICY "Public read CMS" ON public.cms_settings FOR SELECT USING (TRUE);
CREATE POLICY "Public insert enquiries" ON public.contact_enquiries FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "Public verify valid certificates" ON public.certificates FOR SELECT USING (status = 'valid' OR public.is_admin());

-- User Self-Scoped Policies
CREATE POLICY "Users read own profile" ON public.users FOR SELECT USING (auth.uid() = auth_uid OR public.is_admin());
CREATE POLICY "Users update own profile" ON public.users FOR UPDATE USING (auth.uid() = auth_uid OR public.is_admin());
CREATE POLICY "Users read own enrollments" ON public.enrollments FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.users u WHERE u.id = user_id AND u.auth_uid = auth.uid()) OR public.is_admin()
);
CREATE POLICY "Users read own payments" ON public.payments FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.users u WHERE u.id = user_id AND u.auth_uid = auth.uid()) OR public.is_admin()
);
CREATE POLICY "Users read own referrals" ON public.referrals FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.users u WHERE u.id = referrer_user_id AND u.auth_uid = auth.uid()) OR public.is_admin()
);
CREATE POLICY "Users read own redemptions" ON public.redemptions FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.users u WHERE u.id = user_id AND u.auth_uid = auth.uid()) OR public.is_admin()
);

-- Admin Full Management Policies
CREATE POLICY "Admin manage categories" ON public.categories FOR ALL USING (public.is_admin());
CREATE POLICY "Admin manage courses" ON public.courses FOR ALL USING (public.is_admin());
CREATE POLICY "Admin manage modules" ON public.modules FOR ALL USING (public.is_admin());
CREATE POLICY "Admin manage lessons" ON public.lessons FOR ALL USING (public.is_admin());
CREATE POLICY "Admin manage payments" ON public.payments FOR ALL USING (public.is_admin());
CREATE POLICY "Admin manage enrollments" ON public.enrollments FOR ALL USING (public.is_admin());
CREATE POLICY "Admin manage quizzes" ON public.quizzes FOR ALL USING (public.is_admin());
CREATE POLICY "Admin manage quiz_questions" ON public.quiz_questions FOR ALL USING (public.is_admin());
CREATE POLICY "Admin manage certificates" ON public.certificates FOR ALL USING (public.is_admin());
CREATE POLICY "Admin manage referrals" ON public.referrals FOR ALL USING (public.is_admin());
CREATE POLICY "Admin manage redemptions" ON public.redemptions FOR ALL USING (public.is_admin());
CREATE POLICY "Admin manage cms" ON public.cms_settings FOR ALL USING (public.is_admin());
CREATE POLICY "Admin manage enquiries" ON public.contact_enquiries FOR ALL USING (public.is_admin());

