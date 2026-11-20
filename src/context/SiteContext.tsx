import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from '../lib/api';
import { subscribePlatformUpdates } from '../lib/realtime';
import type { Batch, Category, CmsSettings, Course, PdfResource, SubscriptionPlan, TestItem, VideoResource } from '../types';

const DEFAULT_CMS: CmsSettings = {
  brand: {
    name: 'O-LEARNING PLATFORM',
    tagline: 'Learn Today, Lead Tomorrow!',
    supportingTagline: 'Your Learning Partner for a Better Future.',
    foundedYear: '2026',
    location: 'India',
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
    location: 'India',
    address: 'India',
  },
  socials: {
    facebook: 'https://www.facebook.com/share/1A4BFwTDa4/',
    youtube: 'https://youtube.com/@olearningplatform?si=YbsPm35pmp8z_UiP',
    instagram: 'https://www.instagram.com/olearningplatform33?avpt=MWJid3M2bXM1azgxeQ==',
    instagramSecondary: 'https://www.instagram.com/olearningplatform?fqnt=MWgxc2g4YnZueWs4Ng==',
  },
  referral: {
    rewardAmount: 250,
    discountPercent: 10,
    headline: 'Invite Friends & Earn Rewards!',
  },
};

const DEFAULT_COURSES: Course[] = [
  {
    id: 1,
    slug: 'spoken-english',
    category_id: 1,
    category_name: 'Language & Communication',
    title: 'Spoken English',
    short_description: 'Learn English from basic to advanced levels. Improve grammar, vocabulary, pronunciation, fluency and communication skills.',
    description: 'Master real-world spoken English with daily guided speaking drills, Indian accent neutralization, practical grammar, rich vocabulary building, and interactive live conversation clubs.',
    thumbnail_url: '/images/courses/spoken-english.png',
    icon_name: 'MessageSquare',
    icon_color: 'orange',
    level: 'Beginner to Advanced',
    duration: '10 Weeks',
    price: 2499,
    discount_price: 1299,
    is_free: 0,
    faculty_id: 1,
    faculty_name: 'Dr. Ananya Sharma',
    what_you_learn: ['Fluency in daily and professional English', 'Pronunciation and public speaking confidence'],
    faqs: [],
    is_published: 1,
    modules_count: 5,
    lessons_count: 24,
    avg_rating: 4.9,
    reviews_count: 48,
  },
  {
    id: 2,
    slug: 'competitive-exam-preparation',
    category_id: 2,
    category_name: 'Competitive Exams',
    title: 'Competitive Exam Preparation',
    short_description: 'Complete preparation for various competitive examinations through structured lessons, practice tests and expert guidance.',
    description: 'All-in-one structured preparation for SSC CGL, CHSL, Banking (IBPS/SBI), Railways (RRB), and State PSC exams.',
    thumbnail_url: '/images/courses/competitive-exams.png',
    icon_name: 'Trophy',
    icon_color: 'orange',
    level: 'Intermediate to Pro',
    duration: '16 Weeks',
    price: 3999,
    discount_price: 1999,
    is_free: 0,
    faculty_id: 4,
    faculty_name: 'Meera Krishnan',
    what_you_learn: ['Quantitative Aptitude & Reasoning shortcuts', 'Current affairs and static GK capsules'],
    faqs: [],
    is_published: 1,
    modules_count: 6,
    lessons_count: 32,
    avg_rating: 4.8,
    reviews_count: 36,
  },
  {
    id: 3,
    slug: 'jee-neet-preparation',
    category_id: 3,
    category_name: 'Entrance Exams',
    title: 'JEE & NEET Preparation',
    short_description: 'Concept-based learning, subject preparation, practice questions and examination guidance for aspiring engineering and medical students.',
    description: 'Build rock-solid conceptual clarity in Physics, Chemistry, Mathematics, and Biology from NCERT fundamentals up to JEE Main/Advanced and NEET UG.',
    thumbnail_url: '/images/courses/jee-neet.png',
    icon_name: 'GraduationCap',
    icon_color: 'blue',
    level: 'Class 11, 12 & Droppers',
    duration: '24 Weeks',
    price: 5999,
    discount_price: 2999,
    is_free: 0,
    faculty_id: 2,
    faculty_name: 'Prof. Vikram Reddy',
    what_you_learn: ['Deep NCERT & advanced problem solving', 'Daily practice problems & mock rank tests'],
    faqs: [],
    is_published: 1,
    modules_count: 8,
    lessons_count: 48,
    avg_rating: 4.9,
    reviews_count: 52,
  },
  {
    id: 4,
    slug: 'upsc-preparation',
    category_id: 2,
    category_name: 'Civil Services',
    title: 'UPSC Preparation',
    short_description: 'Learn general studies, English, communication, vocabulary and essential skills for civil services examination preparation.',
    description: 'Comprehensive UPSC Civil Services (IAS/IPS) foundation covering Indian Polity, Modern History, Geography, Economy, Ethics, CSAT, and Mains Answer Writing.',
    thumbnail_url: '/images/courses/upsc.png',
    icon_name: 'Landmark',
    icon_color: 'orange',
    level: 'Foundation to Mains',
    duration: '32 Weeks',
    price: 7999,
    discount_price: 4499,
    is_free: 0,
    faculty_id: 4,
    faculty_name: 'Meera Krishnan',
    what_you_learn: ['GS Prelims + Mains comprehensive coverage', 'Editorial analysis and structured essay writing'],
    faqs: [],
    is_published: 1,
    modules_count: 10,
    lessons_count: 60,
    avg_rating: 4.9,
    reviews_count: 44,
  },
  {
    id: 5,
    slug: 'aptitude-and-reasoning',
    category_id: 4,
    category_name: 'Career & Skills',
    title: 'Aptitude & Reasoning',
    short_description: 'Develop logical thinking, quantitative aptitude, analytical skills and problem-solving abilities for competitive exams and placement tests.',
    description: 'Crack campus placements and competitive aptitude rounds with crystal-clear logical reasoning, puzzles, permutations, probability, and data sufficiency techniques.',
    thumbnail_url: '/images/courses/aptitude-reasoning.png',
    icon_name: 'Brain',
    icon_color: 'orange',
    level: 'All Levels',
    duration: '8 Weeks',
    price: 1499,
    discount_price: 799,
    is_free: 0,
    faculty_id: 2,
    faculty_name: 'Prof. Vikram Reddy',
    what_you_learn: ['Placement test aptitude mastery', 'Speed math and analytical reasoning'],
    faqs: [],
    is_published: 1,
    modules_count: 4,
    lessons_count: 20,
    avg_rating: 4.8,
    reviews_count: 29,
  },
  {
    id: 6,
    slug: 'interview-preparation',
    category_id: 4,
    category_name: 'Career & Skills',
    title: 'Interview Preparation',
    short_description: 'Prepare for IT and private-sector job interviews with mock interviews, HR questions, self-introduction and communication training.',
    description: 'Walk into any technical or HR interview with unshakeable confidence. Includes ATS-friendly resume building, behavioral answers, common HR traps, and mock interviews.',
    thumbnail_url: '/images/courses/interview-prep.png',
    icon_name: 'Users',
    icon_color: 'orange',
    level: 'Freshers & Experienced',
    duration: '6 Weeks',
    price: 1999,
    discount_price: 999,
    is_free: 0,
    faculty_id: 3,
    faculty_name: 'Rahul Deshmukh',
    what_you_learn: ['ATS resume & LinkedIn optimization', 'HR & behavioral mock interview mastery'],
    faqs: [],
    is_published: 1,
    modules_count: 4,
    lessons_count: 16,
    avg_rating: 4.9,
    reviews_count: 31,
  },
  {
    id: 7,
    slug: 'it-and-programming-courses',
    category_id: 5,
    category_name: 'IT & Software',
    title: 'IT & Programming Courses',
    short_description: 'Learn programming languages and technical skills, including Python, Java and other essential software technologies.',
    description: 'Go from zero coding experience to building production applications with Python, Core & Object-Oriented Java, SQL Databases, Git, Data Structures, and Full-Stack Web fundamentals.',
    thumbnail_url: '/images/courses/it-programming.png',
    icon_name: 'Code2',
    icon_color: 'orange',
    level: 'Beginner to Job-Ready',
    duration: '14 Weeks',
    price: 4999,
    discount_price: 2499,
    is_free: 0,
    faculty_id: 3,
    faculty_name: 'Rahul Deshmukh',
    what_you_learn: ['Python, Java, SQL, Git & Web fundamentals', 'Portfolio projects and technical interview prep'],
    faqs: [],
    is_published: 1,
    modules_count: 6,
    lessons_count: 36,
    avg_rating: 4.9,
    reviews_count: 42,
  },
  {
    id: 8,
    slug: 'career-development-professional-skills',
    category_id: 4,
    category_name: 'Career & Skills',
    title: 'Career Development & Professional Skills',
    short_description: 'Improve workplace communication, presentation skills, confidence and professional abilities.',
    description: 'Accelerate your career growth with executive communication, persuasive business presentations, email etiquette, emotional intelligence, leadership habits, and productivity systems.',
    thumbnail_url: '/images/courses/career-development.png',
    icon_name: 'TrendingUp',
    icon_color: 'orange',
    level: 'Students & Professionals',
    duration: '6 Weeks',
    price: 0,
    discount_price: 0,
    is_free: 1,
    faculty_id: 1,
    faculty_name: 'Dr. Ananya Sharma',
    what_you_learn: ['Business communication and email etiquette', 'Confidence, public speaking & workplace leadership'],
    faqs: [],
    is_published: 1,
    modules_count: 4,
    lessons_count: 18,
    avg_rating: 4.8,
    reviews_count: 27,
  },
];

const DEFAULT_PDFS: PdfResource[] = [
  {
    id: 1,
    title: 'Future Forms - Will and Going To (Practice Worksheet)',
    description:
      'Comprehensive grammar practice worksheet covering Future Forms, Will vs Going To rules, sentence structures, and test exercises with answer keys.',
    category: 'Spoken English & Grammar',
    file_url:
      'https://o-learning-platform-media-2026.s3.ap-southeast-2.amazonaws.com/uploads/1795100996750-Future-Forms-Practice-Worksheet.pdf',
    thumbnail_url: '/images/courses/spoken-english.png',
    file_size_text: '118 KB',
    display_order: 1,
    is_published: 1,
    created_at: '2026-11-19T15:00:00.000Z',
    updated_at: '2026-11-19T15:00:00.000Z',
  },
  {
    id: 2,
    title: 'Quantitative Aptitude & Speed Math Formula Handbook',
    description:
      'Handy formula cheat sheet with Vedic math tricks, percentage-fraction tables, and shortcuts for competitive exam aspirants.',
    category: 'Competitive Exams',
    file_url: '/api/public/materials/2/1',
    thumbnail_url: '/images/courses/competitive-exams.png',
    file_size_text: '2.4 MB',
    display_order: 2,
    is_published: 1,
    created_at: '2026-11-19T15:00:00.000Z',
    updated_at: '2026-11-19T15:00:00.000Z',
  },
  {
    id: 3,
    title: 'Python & Full-Stack Web Architecture Cheat Sheet',
    description:
      'Essential Python syntax, OOP concepts, SQL queries, and REST API conventions formatted for quick interview and lab reference.',
    category: 'IT & Software',
    file_url: '/api/public/materials/7/1',
    thumbnail_url: '/images/courses/it-programming.png',
    file_size_text: '3.1 MB',
    display_order: 3,
    is_published: 1,
    created_at: '2026-11-19T15:00:00.000Z',
    updated_at: '2026-11-19T15:00:00.000Z',
  },
];

const DEFAULT_VIDEOS: VideoResource[] = [
  {
    id: 1,
    title: 'Welcome to O-Learning Platform — Learning Partner for a Better Future',
    description:
      'Experience how O-Learning Platform empowers Indian learners with expert-led live classes, structured HD lecture recordings, downloadable study notes, and outcome-oriented mentorship.',
    video_url: '/videos/platform-intro.mp4',
    thumbnail_url: '/images/hero-desktop-bg.png',
    category: 'Platform Tour & Classroom Experience',
    placement: 'homepage_featured',
    duration_text: '00:45',
    display_order: 1,
    is_published: 1,
    created_at: '2026-11-19T15:00:00.000Z',
    updated_at: '2026-11-19T15:00:00.000Z',
  },
  {
    id: 2,
    title: 'Live Class Demo: Spoken English & Pronunciation Mastery',
    description:
      'Sample interactive class walkthrough covering everyday conversation clubs, fluency drills, and accent neutralization.',
    video_url: '/videos/platform-intro.mp4',
    thumbnail_url: '/images/courses/spoken-english.png',
    category: 'Classroom Demo',
    placement: 'homepage_section',
    duration_text: '00:45',
    display_order: 2,
    is_published: 1,
    created_at: '2026-11-19T15:00:00.000Z',
    updated_at: '2026-11-19T15:00:00.000Z',
  },
];

export const mergeOverrides = <T extends { id: number }>(base: T[], key: string): T[] => {
  if (typeof window === 'undefined') return base;
  try {
    const deletedRaw = localStorage.getItem(`${key}_deleted`);
    const deletedSet = new Set<number>(deletedRaw ? JSON.parse(deletedRaw) : []);
    const localRaw = localStorage.getItem(key);
    const localItems = (localRaw ? JSON.parse(localRaw) : []) as T[];

    const map = new Map<number, T>();
    base.forEach((b) => {
      if (!deletedSet.has(Number(b.id))) map.set(Number(b.id), b);
    });
    localItems.forEach((l) => {
      if (!deletedSet.has(Number(l.id))) {
        const existing = map.get(Number(l.id));
        map.set(Number(l.id), existing ? { ...existing, ...l } : l);
      }
    });
    return Array.from(map.values());
  } catch {
    return base;
  }
};

interface SiteContextValue {
  cms: CmsSettings;
  courses: Course[];
  categories: Category[];
  plans: SubscriptionPlan[];
  tests: TestItem[];
  batches: Batch[];
  pdfs: PdfResource[];
  videos: VideoResource[];
  loading: boolean;
  refreshSite: () => Promise<void>;
}

const SiteContext = createContext<SiteContextValue | null>(null);

export function SiteProvider({ children }: { children: React.ReactNode }) {
  const [cms, setCms] = useState<CmsSettings>(() => {
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('olearn_cached_cms');
      if (cached) {
        try {
          return { ...DEFAULT_CMS, ...JSON.parse(cached) };
        } catch {
          // fallback
        }
      }
    }
    return DEFAULT_CMS;
  });

  const [courses, setCourses] = useState<Course[]>(() => {
    return mergeOverrides(DEFAULT_COURSES, 'olearn_custom_courses');
  });

  const [categories, setCategories] = useState<Category[]>(() => {
    return mergeOverrides([], 'olearn_custom_categories');
  });
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [tests, setTests] = useState<TestItem[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [pdfs, setPdfs] = useState<PdfResource[]>(() => {
    return mergeOverrides(DEFAULT_PDFS, 'olearn_custom_pdfs');
  });
  const [videos, setVideos] = useState<VideoResource[]>(() => {
    return mergeOverrides(DEFAULT_VIDEOS, 'olearn_custom_videos');
  });
  const [loading, setLoading] = useState(false);

  const refreshSite = useCallback(async () => {
    try {
      const [cmsData, coursesData, catsData, plansData, testsData, batchesData, pdfsData, videosData] = await Promise.all([
        api<Partial<CmsSettings>>('/api/public/cms'),
        api<Course[]>('/api/public/courses'),
        api<Category[]>('/api/public/categories'),
        api<SubscriptionPlan[]>('/api/public/plans'),
        api<TestItem[]>('/api/public/tests'),
        api<Batch[]>('/api/public/batches'),
        api<PdfResource[]>('/api/public/pdfs').catch(() => DEFAULT_PDFS),
        api<VideoResource[]>('/api/public/videos').catch(() => DEFAULT_VIDEOS),
      ]);
      if (cmsData && typeof cmsData === 'object') {
        setCms((prev) => {
          const next = { ...prev, ...cmsData };
          if (typeof window !== 'undefined') {
            try {
              localStorage.setItem('olearn_cached_cms', JSON.stringify(next));
            } catch {}
          }
          return next;
        });
      }
      if (Array.isArray(coursesData) && coursesData.length > 0) {
        const merged = mergeOverrides(coursesData, 'olearn_custom_courses');
        setCourses(merged);
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('olearn_cached_courses', JSON.stringify(merged));
          } catch {}
        }
      } else {
        setCourses((prev) => mergeOverrides(prev.length > 0 ? prev : DEFAULT_COURSES, 'olearn_custom_courses'));
      }

      const mergedCategories = mergeOverrides(Array.isArray(catsData) ? catsData : [], 'olearn_custom_categories');
      setCategories(mergedCategories);
      setPlans(Array.isArray(plansData) ? plansData : []);
      setTests(Array.isArray(testsData) ? testsData : []);
      setBatches(Array.isArray(batchesData) ? batchesData : []);

      const activePdfs = Array.isArray(pdfsData) && pdfsData.length > 0 ? pdfsData : DEFAULT_PDFS;
      const mergedPdfs = mergeOverrides(activePdfs, 'olearn_custom_pdfs');
      setPdfs(mergedPdfs);
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('olearn_cached_pdfs', JSON.stringify(mergedPdfs));
        } catch {}
      }

      const activeVideos = Array.isArray(videosData) && videosData.length > 0 ? videosData : DEFAULT_VIDEOS;
      const mergedVideos = mergeOverrides(activeVideos, 'olearn_custom_videos');
      setVideos(mergedVideos);
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('olearn_cached_videos', JSON.stringify(mergedVideos));
        } catch {}
      }
    } catch {
      // Keep current database-synced state on transient network failure
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshSite();
    const unsub = subscribePlatformUpdates(() => {
      refreshSite();
    });
    return () => unsub();
  }, [refreshSite]);

  return (
    <SiteContext.Provider
      value={{ cms, courses, categories, plans, tests, batches, pdfs, videos, loading, refreshSite }}
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
