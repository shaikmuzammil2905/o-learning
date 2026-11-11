import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api } from '../lib/api';
import type { Batch, Category, CmsSettings, Course, SubscriptionPlan, TestItem } from '../types';

const DEFAULT_CMS: CmsSettings = {
  brand: {
    name: 'O-LEARNING PLATFORM',
    tagline: 'Learn Today, Lead Tomorrow!',
    supportingTagline: 'Your Learning Partner for a Better Future.',
    foundedYear: '2026',
    location: 'Hyderabad, Telangana, India',
  },
  hero: {
    heading: 'Your Learning Partner for a Better Future.',
    subtext:
      'Access expert-led online courses, live classes, recorded videos and exam preparation – all in one place.',
    primaryCtaLabel: 'Explore Courses',
    secondaryCtaLabel: 'Join Now',
    desktopBgUrl: '/images/hero-desktop-bg.png',
    mobileBgUrl: '/images/hero-mobile-bg.png',
    featureList: ['Live Classes', 'Recorded Videos', 'Practice Tests', 'Expert Faculty', 'Certificates'],
  },
  stats: [
    { label: 'Courses & Programs', value: '8+', icon: 'BookOpen' },
    { label: 'Happy Learners', value: '10K+', icon: 'Users' },
    { label: 'Expert Faculty', value: '50+', icon: 'UserCheck' },
    { label: 'Learner Satisfaction', value: '95%', icon: 'BadgeCheck' },
  ],
  banner: {
    heading: 'Learn Anywhere, Anytime!',
    bullets: [
      'Live & Recorded Classes',
      'Study Material & Notes',
      'Practice Tests & Mock Exams',
      'Expert Support',
    ],
    ctaLabel: 'Get Started Now',
  },
  about: {
    vision:
      'To become a leading online learning platform in India, providing quality and affordable education to every student.',
    mission:
      'Make learning simple, accessible and affordable through expert faculty, practical training, recorded classes and interactive learning.',
    coreValues: [
      'Quality Education',
      'Affordable Learning',
      'Student Success',
      'Practical Knowledge',
      'Innovation & Technology',
      'Transparency and Trust',
      'Continuous Improvement',
    ],
    imageUrl: '/images/about-hero-banner.png',
  },
  contact: {
    phone: '8978991329',
    whatsapp: '9121403515',
    email: 'olearningplatform33@gmail.com',
    location: 'Hyderabad, Telangana, India',
    address: 'Hitech City / Madhapur EdTech Hub, Hyderabad, Telangana 500081, India',
  },
  referral: {
    rewardAmount: 250,
    discountPercent: 10,
    headline: 'Invite Friends & Earn Rewards!',
  },
};

const FALLBACK_CATEGORIES: Category[] = [
  { id: 1, name: 'Languages & Communication', slug: 'languages', description: 'Fluency, grammar, and soft skills', icon_name: 'MessageCircle', is_active: 1 },
  { id: 2, name: 'Competitive & Govt Exams', slug: 'competitive-exams', description: 'UPSC, SSC, Banking, and State PSC', icon_name: 'Trophy', is_active: 1 },
  { id: 3, name: 'Engineering & Medical Entrance', slug: 'jee-neet', description: 'JEE Main/Advanced & NEET UG preparation', icon_name: 'GraduationCap', is_active: 1 },
  { id: 4, name: 'Aptitude & Career Prep', slug: 'aptitude-career', description: 'Placement aptitude, HR & mock interviews', icon_name: 'Brain', is_active: 1 },
  { id: 5, name: 'IT & Programming', slug: 'it-programming', description: 'Python, Java, Full-Stack & Cloud skills', icon_name: 'Code2', is_active: 1 },
];

const FALLBACK_COURSES: Course[] = [
  {
    id: 1,
    slug: 'spoken-english',
    category_id: 1,
    category_name: 'Languages & Communication',
    category_slug: 'languages',
    title: 'Spoken English',
    short_description:
      'Learn English from basic to advanced levels. Improve grammar, vocabulary, pronunciation, fluency and communication skills.',
    description:
      'Master real-world spoken English with daily guided speaking drills, practical grammar, vocabulary building, and live conversation clubs.',
    thumbnail_url: '/images/courses/spoken-english.png',
    icon_name: 'MessageSquare',
    icon_color: 'orange',
    level: 'Beginner to Advanced',
    duration: '10 Weeks',
    price: 2499,
    discount_price: 1299,
    is_free: 0,
    faculty_id: 2,
    faculty_name: 'Dr. Ananya Sharma',
    what_you_learn: [],
    faqs: [],
    is_published: 1,
    modules_count: 3,
    avg_rating: 4.9,
  },
  {
    id: 2,
    slug: 'competitive-exam-preparation',
    category_id: 2,
    category_name: 'Competitive & Govt Exams',
    category_slug: 'competitive-exams',
    title: 'Competitive Exam Preparation',
    short_description:
      'Complete preparation for various competitive examinations through structured lessons, practice tests and expert guidance.',
    description:
      'All-in-one structured preparation for SSC CGL, Banking, Railways, and State PSC exams.',
    thumbnail_url: '/images/courses/competitive-exams.png',
    icon_name: 'Trophy',
    icon_color: 'orange',
    level: 'Intermediate to Pro',
    duration: '16 Weeks',
    price: 3999,
    discount_price: 1999,
    is_free: 0,
    faculty_id: 5,
    faculty_name: 'Meera Krishnan',
    what_you_learn: [],
    faqs: [],
    is_published: 1,
    modules_count: 2,
    avg_rating: 4.9,
  },
  {
    id: 3,
    slug: 'jee-neet-preparation',
    category_id: 3,
    category_name: 'Engineering & Medical Entrance',
    category_slug: 'jee-neet',
    title: 'JEE & NEET Preparation',
    short_description:
      'Concept-based learning, subject preparation, practice questions and examination guidance for aspiring engineering and medical students.',
    description:
      'Build rock-solid conceptual clarity in Physics, Chemistry, Mathematics, and Biology from NCERT up to rank-deciding problems.',
    thumbnail_url: '/images/courses/jee-neet.png',
    icon_name: 'GraduationCap',
    icon_color: 'blue',
    level: 'Class 11, 12 & Droppers',
    duration: '24 Weeks',
    price: 5999,
    discount_price: 2999,
    is_free: 0,
    faculty_id: 3,
    faculty_name: 'Prof. Vikram Reddy',
    what_you_learn: [],
    faqs: [],
    is_published: 1,
    modules_count: 2,
    avg_rating: 5.0,
  },
  {
    id: 4,
    slug: 'upsc-preparation',
    category_id: 2,
    category_name: 'Competitive & Govt Exams',
    category_slug: 'competitive-exams',
    title: 'UPSC Preparation',
    short_description:
      'Learn general studies, English, communication, vocabulary and essential skills for civil services examination preparation.',
    description:
      'Comprehensive UPSC Civil Services (IAS/IPS) foundation covering GS Prelims, Mains Answer Writing, CSAT, and Interview readiness.',
    thumbnail_url: '/images/courses/upsc.png',
    icon_name: 'Landmark',
    icon_color: 'orange',
    level: 'Foundation to Mains',
    duration: '32 Weeks',
    price: 7999,
    discount_price: 4499,
    is_free: 0,
    faculty_id: 5,
    faculty_name: 'Meera Krishnan',
    what_you_learn: [],
    faqs: [],
    is_published: 1,
    modules_count: 2,
    avg_rating: 4.9,
  },
  {
    id: 5,
    slug: 'aptitude-and-reasoning',
    category_id: 4,
    category_name: 'Aptitude & Career Prep',
    category_slug: 'aptitude-career',
    title: 'Aptitude & Reasoning',
    short_description:
      'Develop logical thinking, quantitative aptitude, analytical skills and problem-solving abilities for competitive exams and placement tests.',
    description:
      'Crack campus placements and competitive aptitude rounds with logical reasoning and speed math techniques.',
    thumbnail_url: '/images/courses/aptitude-reasoning.png',
    icon_name: 'Brain',
    icon_color: 'orange',
    level: 'All Levels',
    duration: '8 Weeks',
    price: 1499,
    discount_price: 799,
    is_free: 0,
    faculty_id: 3,
    faculty_name: 'Prof. Vikram Reddy',
    what_you_learn: [],
    faqs: [],
    is_published: 1,
    modules_count: 2,
    avg_rating: 4.8,
  },
  {
    id: 6,
    slug: 'interview-preparation',
    category_id: 4,
    category_name: 'Aptitude & Career Prep',
    category_slug: 'aptitude-career',
    title: 'Interview Preparation',
    short_description:
      'Prepare for IT and private-sector job interviews with mock interviews, HR questions, self-introduction and communication training.',
    description:
      'ATS resume building, STAR behavioral answers, HR traps, and guided mock interview simulations.',
    thumbnail_url: '/images/courses/interview-prep.png',
    icon_name: 'Users',
    icon_color: 'orange',
    level: 'Freshers & Experienced',
    duration: '6 Weeks',
    price: 1999,
    discount_price: 999,
    is_free: 0,
    faculty_id: 2,
    faculty_name: 'Dr. Ananya Sharma',
    what_you_learn: [],
    faqs: [],
    is_published: 1,
    modules_count: 2,
    avg_rating: 4.9,
  },
  {
    id: 7,
    slug: 'it-and-programming-courses',
    category_id: 5,
    category_name: 'IT & Programming',
    category_slug: 'it-programming',
    title: 'IT & Programming Courses',
    short_description:
      'Learn programming languages and technical skills, including Python, Java and other essential software technologies.',
    description:
      'Go from zero coding experience to building applications with Python, Java, SQL, Git, and DSA.',
    thumbnail_url: '/images/courses/it-programming.png',
    icon_name: 'Code2',
    icon_color: 'orange',
    level: 'Beginner to Job-Ready',
    duration: '14 Weeks',
    price: 4999,
    discount_price: 2499,
    is_free: 0,
    faculty_id: 4,
    faculty_name: 'Rahul Deshmukh',
    what_you_learn: [],
    faqs: [],
    is_published: 1,
    modules_count: 2,
    avg_rating: 5.0,
  },
  {
    id: 8,
    slug: 'career-development-professional-skills',
    category_id: 4,
    category_name: 'Aptitude & Career Prep',
    category_slug: 'aptitude-career',
    title: 'Career Development & Professional Skills',
    short_description:
      'Improve workplace communication, presentation skills, confidence and professional abilities.',
    description:
      'Accelerate your career growth with executive communication, persuasive business presentations, and productivity systems.',
    thumbnail_url: '/images/courses/career-development.png',
    icon_name: 'TrendingUp',
    icon_color: 'orange',
    level: 'Students & Professionals',
    duration: '6 Weeks',
    price: 0,
    discount_price: 0,
    is_free: 1,
    faculty_id: 2,
    faculty_name: 'Dr. Ananya Sharma',
    what_you_learn: [],
    faqs: [],
    is_published: 1,
    modules_count: 2,
    avg_rating: 4.9,
  },
];

const FALLBACK_PLANS: SubscriptionPlan[] = [
  {
    id: 1,
    name: 'Basic Plan',
    slug: 'basic-plan',
    price: 1499,
    duration_months: 3,
    badge: 'Starter',
    features: [
      'Access to 2 Selected Courses',
      'Recorded HD Video Lectures',
      'Chapter-wise PDF Study Notes',
      'Monthly Practice Tests',
      'Completion Certificate',
    ],
    is_popular: 0,
    is_active: 1,
  },
  {
    id: 2,
    name: 'Pro Plan',
    slug: 'pro-plan',
    price: 2499,
    duration_months: 6,
    badge: 'Most Popular',
    features: [
      'Access to Any 5 Courses',
      'All Live Interactive Classes',
      'Recorded Lectures & Doubt Support',
      'Full Mock Test Series & Analytics',
      'Official Verified Certificates',
    ],
    is_popular: 1,
    is_active: 1,
  },
  {
    id: 3,
    name: 'Premium Plan',
    slug: 'premium-plan',
    price: 3999,
    duration_months: 12,
    badge: 'Best Value',
    features: [
      'Unlimited Access to All 8+ Courses',
      'Priority 1-on-1 Faculty Doubt Sessions',
      'All Live Batches & Bootcamps',
      'Unlimited Mock Tests & Rank Reports',
      'Interview Prep & Resume Review',
    ],
    is_popular: 0,
    is_active: 1,
  },
];

const FALLBACK_TESTS: TestItem[] = [
  {
    id: 1,
    title: 'Spoken English Grammar & Fluency Mock Test',
    course_id: 1,
    course_title: 'Spoken English',
    description: 'Evaluate your mastery of tenses, subject-verb agreement, prepositions, and workplace vocabulary.',
    duration_minutes: 15,
    total_marks: 10,
    pass_marks: 5,
    negative_marks: 0,
    difficulty: 'Easy',
    is_published: 1,
    questions_count: 5,
  },
  {
    id: 2,
    title: 'Quantitative Aptitude & Logical Reasoning Sprint',
    course_id: 5,
    course_title: 'Aptitude & Reasoning',
    description: 'Timed campus-placement & SSC style aptitude test with negative marking.',
    duration_minutes: 20,
    total_marks: 10,
    pass_marks: 4,
    negative_marks: 0.5,
    difficulty: 'Medium',
    is_published: 1,
    questions_count: 5,
  },
  {
    id: 3,
    title: 'Python & Java Core Programming Assessment',
    course_id: 7,
    course_title: 'IT & Programming Courses',
    description: 'Verify your understanding of OOP concepts, time complexity, and Python/Java data types.',
    duration_minutes: 25,
    total_marks: 10,
    pass_marks: 5,
    negative_marks: 0,
    difficulty: 'Medium',
    is_published: 1,
    questions_count: 5,
  },
  {
    id: 4,
    title: 'JEE / NEET & UPSC Concept Challenge',
    course_id: 3,
    course_title: 'JEE & NEET Preparation',
    description: 'High-accuracy conceptual assessment for competitive science & general studies.',
    duration_minutes: 20,
    total_marks: 10,
    pass_marks: 5,
    negative_marks: 0.5,
    difficulty: 'Hard',
    is_published: 1,
    questions_count: 5,
  },
];

const FALLBACK_BATCHES: Batch[] = [
  {
    id: 1,
    name: 'Fluency Ignite Batch — Nov 2026',
    course_id: 1,
    course_title: 'Spoken English',
    faculty_id: 2,
    faculty_name: 'Dr. Ananya Sharma',
    start_date: '2026-11-15',
    end_date: '2027-01-25',
    timings: 'Mon-Fri · 7:00 PM – 8:00 PM IST',
    total_seats: 60,
    enrolled_seats: 44,
    status: 'active',
    price: 2499,
    discount_price: 1299,
    is_free: 0,
  },
  {
    id: 2,
    name: 'Python & Java Placement Fast-Track',
    course_id: 7,
    course_title: 'IT & Programming Courses',
    faculty_id: 4,
    faculty_name: 'Rahul Deshmukh',
    start_date: '2026-11-18',
    end_date: '2027-02-28',
    timings: 'Tue-Sat · 8:00 PM – 9:30 PM IST',
    total_seats: 80,
    enrolled_seats: 59,
    status: 'active',
    price: 4999,
    discount_price: 2499,
    is_free: 0,
  },
  {
    id: 3,
    name: 'JEE & NEET Sankalp 2027 Batch',
    course_id: 3,
    course_title: 'JEE & NEET Preparation',
    faculty_id: 3,
    faculty_name: 'Prof. Vikram Reddy',
    start_date: '2026-12-01',
    end_date: '2027-05-15',
    timings: 'Daily · 5:30 PM – 7:30 PM IST',
    total_seats: 120,
    enrolled_seats: 72,
    status: 'upcoming',
    price: 5999,
    discount_price: 2999,
    is_free: 0,
  },
  {
    id: 4,
    name: 'UPSC GS Foundation Prelims+Mains',
    course_id: 4,
    course_title: 'UPSC Preparation',
    faculty_id: 5,
    faculty_name: 'Meera Krishnan',
    start_date: '2026-12-05',
    end_date: '2027-07-30',
    timings: 'Mon-Sat · 6:30 AM – 8:30 AM IST',
    total_seats: 100,
    enrolled_seats: 63,
    status: 'upcoming',
    price: 7999,
    discount_price: 4499,
    is_free: 0,
  },
  {
    id: 5,
    name: 'Aptitude Crash Batch — Oct 2026',
    course_id: 5,
    course_title: 'Aptitude & Reasoning',
    faculty_id: 3,
    faculty_name: 'Prof. Vikram Reddy',
    start_date: '2026-09-01',
    end_date: '2026-10-30',
    timings: 'Mon-Fri · 6:00 PM – 7:00 PM IST',
    total_seats: 60,
    enrolled_seats: 60,
    status: 'completed',
    price: 1499,
    discount_price: 799,
    is_free: 0,
  },
];

interface SiteContextValue {
  cms: CmsSettings;
  courses: Course[];
  categories: Category[];
  plans: SubscriptionPlan[];
  tests: TestItem[];
  batches: Batch[];
  loading: boolean;
  refreshSite: () => Promise<void>;
}

const SiteContext = createContext<SiteContextValue | null>(null);

export function SiteProvider({ children }: { children: React.ReactNode }) {
  const [cms, setCms] = useState<CmsSettings>(DEFAULT_CMS);
  const [courses, setCourses] = useState<Course[]>(FALLBACK_COURSES);
  const [categories, setCategories] = useState<Category[]>(FALLBACK_CATEGORIES);
  const [plans, setPlans] = useState<SubscriptionPlan[]>(FALLBACK_PLANS);
  const [tests, setTests] = useState<TestItem[]>(FALLBACK_TESTS);
  const [batches, setBatches] = useState<Batch[]>(FALLBACK_BATCHES);
  const [loading, setLoading] = useState(false);

  const refreshSite = useCallback(async () => {
    try {
      const [cmsData, coursesData, catsData, plansData, testsData, batchesData] = await Promise.all([
        api<Partial<CmsSettings>>('/api/public/cms'),
        api<Course[]>('/api/public/courses'),
        api<Category[]>('/api/public/categories'),
        api<SubscriptionPlan[]>('/api/public/plans'),
        api<TestItem[]>('/api/public/tests'),
        api<Batch[]>('/api/public/batches'),
      ]);
      if (cmsData && typeof cmsData === 'object') setCms({ ...DEFAULT_CMS, ...cmsData });
      if (Array.isArray(coursesData) && coursesData.length > 0) setCourses(coursesData);
      if (Array.isArray(catsData) && catsData.length > 0) setCategories(catsData);
      if (Array.isArray(plansData) && plansData.length > 0) setPlans(plansData);
      if (Array.isArray(testsData) && testsData.length > 0) setTests(testsData);
      if (Array.isArray(batchesData) && batchesData.length > 0) setBatches(batchesData);
    } catch {
      // Instant fallback data stays active so zero UI delay ever occurs
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshSite();
  }, [refreshSite]);

  return (
    <SiteContext.Provider
      value={{ cms, courses, categories, plans, tests, batches, loading, refreshSite }}
    >
      {children}
    </SiteContext.Provider>
  );
}

export function useSite() {
  const ctx = useContext(SiteContext);
  if (!ctx) throw new Error('useSite must be used inside SiteProvider');
  return ctx;
}
