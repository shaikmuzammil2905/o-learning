import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api } from '../lib/api';
import type { Category, CmsSettings, Course, SubscriptionPlan } from '../types';

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
    imageUrl: '/images/about-campus.svg',
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

interface SiteContextValue {
  cms: CmsSettings;
  courses: Course[];
  categories: Category[];
  plans: SubscriptionPlan[];
  loading: boolean;
  refreshSite: () => Promise<void>;
}

const SiteContext = createContext<SiteContextValue | null>(null);

export function SiteProvider({ children }: { children: React.ReactNode }) {
  const [cms, setCms] = useState<CmsSettings>(DEFAULT_CMS);
  const [courses, setCourses] = useState<Course[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshSite = useCallback(async () => {
    try {
      const [cmsData, coursesData, catsData, plansData] = await Promise.all([
        api<Partial<CmsSettings>>('/api/public/cms'),
        api<Course[]>('/api/public/courses'),
        api<Category[]>('/api/public/categories'),
        api<SubscriptionPlan[]>('/api/public/plans'),
      ]);
      setCms({ ...DEFAULT_CMS, ...cmsData });
      setCourses(coursesData);
      setCategories(catsData);
      setPlans(plansData);
    } catch {
      // Keep defaults if offline
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshSite();
  }, [refreshSite]);

  return (
    <SiteContext.Provider value={{ cms, courses, categories, plans, loading, refreshSite }}>
      {children}
    </SiteContext.Provider>
  );
}

export function useSite() {
  const ctx = useContext(SiteContext);
  if (!ctx) throw new Error('useSite must be used inside SiteProvider');
  return ctx;
}
