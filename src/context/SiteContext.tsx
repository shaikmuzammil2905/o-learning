import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from '../lib/api';
import { subscribePlatformUpdates } from '../lib/realtime';
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
    { label: 'Courses & Programs', value: '0', icon: 'BookOpen' },
    { label: 'Happy Learners', value: '0', icon: 'Users' },
    { label: 'Expert Faculty', value: '0', icon: 'UserCheck' },
    { label: 'Verified Enrollments', value: '0', icon: 'BadgeCheck' },
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
  const [courses, setCourses] = useState<Course[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [tests, setTests] = useState<TestItem[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);

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
      setCourses(Array.isArray(coursesData) ? coursesData : []);
      setCategories(Array.isArray(catsData) ? catsData : []);
      setPlans(Array.isArray(plansData) ? plansData : []);
      setTests(Array.isArray(testsData) ? testsData : []);
      setBatches(Array.isArray(batchesData) ? batchesData : []);
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
