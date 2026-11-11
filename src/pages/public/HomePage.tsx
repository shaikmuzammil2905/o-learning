import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Award,
  BadgeCheck,
  BookOpen,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Headphones,
  Info,
  Laptop,
  Play,
  Search,
  ShieldCheck,
  UserCheck,
  Users,
  Video,
  X,
} from 'lucide-react';
import { PublicLayout } from '../../components/PublicLayout';
import { CourseShareButton } from '../../components/CourseShareButton';
import { CourseIcon } from '../../components/ui/StateViews';
import { AnimatedCounter, RevealOnScroll } from '../../components/ui/Animations';
import { useSite } from '../../context/SiteContext';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency } from '../../lib/api';

const STAT_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  BookOpen,
  Users,
  UserCheck,
  BadgeCheck,
};

const WHY_CHOOSE_ITEMS = [
  {
    label: 'Expert Faculty',
    icon: Users,
    badge: '50+ Mentors · 10–15+ Yrs Exp',
    summary:
      'Learn directly from IIT alumni, retired civil services mentors, Cambridge CELTA trainers, and senior Hyderabad software architects who break down complex concepts step by step.',
    metrics: [
      { label: 'Avg Experience', value: '12+ Years' },
      { label: 'Live Doubt Solving', value: 'Daily Q&A' },
      { label: 'Mentorship Style', value: '1-on-1 & Cohort' },
    ],
    highlights: [
      'Live interactive teaching with real-time chat and screen walkthroughs',
      'Structured module-by-module syllabus aligned to 2026 exam & hiring patterns',
      'Bilingual-friendly clarity tailored for Indian college & competitive aspirants',
      'Personalized feedback on spoken English recordings, Mains answers & code assignments',
    ],
    ctaTo: '/about',
    ctaLabel: 'Meet Our Faculty',
  },
  {
    label: 'Affordable Courses',
    icon: ShieldCheck,
    badge: 'Starting ₹799 · Free Track Included',
    summary:
      'We believe world-class career and exam coaching should never be locked behind ₹50,000+ fees. O-LEARNING PLATFORM offers transparent single-course pricing and free starter tracks.',
    metrics: [
      { label: 'Courses From', value: '₹799' },
      { label: 'Free Starter', value: 'Included' },
      { label: 'Hidden Charges', value: 'Zero' },
    ],
    highlights: [
      'Free Career Development & Professional Skills track with official certificate',
      'Up to 50% scholarship discounts across Spoken English, Aptitude & IT courses',
      'Transparent one-time course fees with lifetime recorded access',
      'UPI, Debit/Credit Card, NetBanking & Wallet support with instant enrollment',
    ],
    ctaTo: '/courses',
    ctaLabel: 'Explore Courses',
  },
  {
    label: 'Flexible Learning',
    icon: Video,
    badge: 'Desktop + Mobile Sync',
    summary:
      'Study on your schedule—attend live evening/morning batches or revise anytime at 1.5x speed with HD recorded video lectures, downloadable PDF notes, and mobile-first course player.',
    metrics: [
      { label: 'Video Access', value: '24/7 HD' },
      { label: 'Notes Format', value: 'PDF / Text' },
      { label: 'Devices', value: 'Web & Mobile' },
    ],
    highlights: [
      'Automatic lesson progress syncing across mobile and desktop browsers',
      'Downloadable module handbooks, formula sheets & cheat-sheets for offline revision',
      'Missed a live class? Watch the full recording inside your Live Classes portal',
      'Self-paced + cohort-paced options suited for students and working professionals',
    ],
    ctaTo: '/courses',
    ctaLabel: 'Browse Courses',
  },
  {
    label: 'Practice & Mock Tests',
    icon: ClipboardCheck,
    badge: 'Timed CBT Interface',
    summary:
      'Build real exam temperament before test day with our timed computer-based test engine featuring question navigation palettes, negative marking, auto-submission, and detailed explanations.',
    metrics: [
      { label: 'Timer Mode', value: 'Auto-Submit' },
      { label: 'Scoring', value: 'Instant Rank' },
      { label: 'Solutions', value: 'Step-by-Step' },
    ],
    highlights: [
      'Sectional & full-length mock tests for Spoken English, Aptitude, IT, JEE/NEET & UPSC',
      'Question status palette showing answered, skipped, and current question at a glance',
      'Instant percentile/rank calculation and accuracy percentage breakdown',
      'Full answer-key review with detailed conceptual explanations after submission',
    ],
    ctaTo: '/tests',
    ctaLabel: 'Try Mock Tests',
  },
  {
    label: 'Doubt Support',
    icon: Headphones,
    badge: 'Dedicated Counselor & Mentor Help',
    summary:
      'Stay confident throughout your preparation with live class Q&A, faculty feedback, and direct academic support via phone and WhatsApp from our Hyderabad student success desk.',
    metrics: [
      { label: 'WhatsApp', value: '9121403515' },
      { label: 'Helpline', value: '8978991329' },
      { label: 'Response', value: 'Fast & Direct' },
    ],
    highlights: [
      'Ask doubts live during interactive faculty sessions without hesitation',
      'Direct WhatsApp & phone counseling for batch selection and career guidance',
      'Dedicated student enquiry tracking with rapid mentor callbacks',
      'Peer learning cohorts to discuss assignments and interview prep',
    ],
    ctaTo: '/contact',
    ctaLabel: 'Contact Support',
  },
  {
    label: 'Certified Courses',
    icon: Award,
    badge: 'ID-Verified Digital Certificates',
    summary:
      'Every completed program unlocks an official O-LEARNING PLATFORM Certificate featuring a unique verification code that employers, universities, and recruiters can verify online.',
    metrics: [
      { label: 'Issuance', value: 'Automatic' },
      { label: 'Format', value: 'Print / PDF' },
      { label: 'Verification', value: 'Public ID' },
    ],
    highlights: [
      'Automatically generated as soon as you complete 100% of required course lessons',
      'Displays student name, course title, issue date, unique Certificate ID & seal',
      'One-click Print / Save as PDF formatted cleanly for LinkedIn & resumes',
      'Public /verify-certificate lookup portal for instant recruiter validation',
    ],
    ctaTo: '/verify-certificate',
    ctaLabel: 'Verify Certificate',
  },
];

export function HomePage() {
  const { cms, courses } = useSite();
  const { user } = useAuth();
  const [mobileSearch, setMobileSearch] = useState('');
  const [whyPopup, setWhyPopup] = useState<(typeof WHY_CHOOSE_ITEMS)[number] | null>(null);
  const navigate = useNavigate();

  const handleMobileSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(`/courses?search=${encodeURIComponent(mobileSearch)}`);
  };

  return (
    <PublicLayout>
      {/* ================= HERO SECTION ================= */}
      {/* DESKTOP HERO (image copy 3.png animated background) */}
      <section className="hidden md:block relative overflow-hidden min-h-[500px] lg:min-h-[540px] bg-[#0046B8]">
        <img
          src={cms.hero.desktopBgUrl || '/images/hero-desktop-bg.png'}
          alt="O-Learning Platform Hero"
          className="absolute inset-0 w-full h-full object-cover object-center animate-hero-desktop pointer-events-none select-none"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#002D85]/85 via-[#0046B8]/30 to-transparent pointer-events-none" />

        <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8 py-16 lg:py-24 flex items-center justify-between">
          <div className="max-w-xl text-white">
            <h1 className="font-display font-extrabold text-4xl lg:text-[48px] leading-[1.13] tracking-tight drop-shadow-sm">
              {cms.hero.heading}
            </h1>
            <p className="mt-4 text-base lg:text-lg text-blue-50/95 leading-relaxed max-w-lg">
              {cms.hero.subtext}
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                to="/courses"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-[#FF7A00] hover:bg-[#E66D00] text-white font-bold text-sm lg:text-base shadow-lg shadow-orange-600/30 transition hover:-translate-y-0.5"
              >
                {cms.hero.primaryCtaLabel} <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to={user ? (user.role === 'student' ? '/student' : `/${user.role}`) : '/register'}
                className="inline-flex items-center justify-center px-8 py-4 rounded-full border-2 border-white/85 text-white hover:bg-white hover:text-[#003EB3] font-bold text-sm lg:text-base transition"
              >
                {user ? 'Go to Dashboard' : cms.hero.secondaryCtaLabel}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* MOBILE HERO (image copy 2.png animated background ONLY) */}
      <section className="md:hidden relative overflow-hidden min-h-[340px] bg-[#0046B8]">
        <img
          src={cms.hero.mobileBgUrl || '/images/hero-mobile-bg.png'}
          alt="O-Learning Platform Mobile Hero"
          className="absolute inset-0 w-full h-full object-cover object-top animate-hero-mobile pointer-events-none select-none"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#002D85]/85 via-[#0046B8]/40 to-transparent pointer-events-none" />

        <div className="relative z-10 px-4 pt-9 pb-14 text-white">
          <div className="max-w-[72%]">
            <h1 className="font-display font-extrabold text-[26px] leading-[1.18] tracking-tight drop-shadow">
              {cms.hero.heading}
            </h1>
            <p className="mt-2.5 text-xs text-blue-50/95 leading-relaxed">
              {cms.hero.subtext}
            </p>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-2.5">
            <Link
              to="/courses"
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-[#FF7A00] text-white font-bold text-xs shadow-lg"
            >
              {cms.hero.primaryCtaLabel} <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <Link
              to={user ? '/student' : '/register'}
              className="inline-flex items-center justify-center px-5 py-2.5 rounded-full border border-white/90 bg-white/10 backdrop-blur-xs text-white font-bold text-xs"
            >
              {user ? 'Dashboard' : cms.hero.secondaryCtaLabel}
            </Link>
          </div>
        </div>
      </section>

      {/* ================= TRUST / STATISTICS STRIP (Grand Size + Typing Number Mode) ================= */}
      <section className="relative z-20 max-w-6xl mx-auto px-4 sm:px-6 -mt-8 md:-mt-10">
        <RevealOnScroll>
          <div className="bg-white rounded-3xl shadow-xl border border-slate-200/90 px-5 py-6 sm:px-8 sm:py-8 grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-0 lg:divide-x divide-slate-200">
            {cms.stats.map((st) => {
              const Icon = STAT_ICONS[st.icon] || BookOpen;
              return (
                <div
                  key={st.label}
                  className="flex items-center justify-center gap-4 px-3 group hover:scale-[1.03] transition-transform"
                >
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-orange-50 text-[#FF7A00] flex items-center justify-center shrink-0 shadow-xs group-hover:bg-[#FF7A00] group-hover:text-white transition-colors">
                    <Icon className="w-7 h-7 sm:w-8 sm:h-8" />
                  </div>
                  <div>
                    <p className="font-display font-extrabold text-2xl sm:text-4xl text-[#0F172A] leading-none">
                      <AnimatedCounter value={st.value} />
                    </p>
                    <p className="text-xs sm:text-sm font-bold text-[#00338D] mt-1.5">
                      {st.label}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </RevealOnScroll>
      </section>

      {/* Mobile Search Bar */}
      <section className="md:hidden max-w-6xl mx-auto px-4 mt-5">
        <form onSubmit={handleMobileSearch} className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={mobileSearch}
            onChange={(e) => setMobileSearch(e.target.value)}
            placeholder="Search Spoken English, UPSC, Python, JEE…"
            className="w-full pl-10 pr-20 py-3 rounded-2xl bg-white border border-slate-200 text-xs font-medium shadow-xs outline-none focus:border-[#0052CC]"
          />
          <button
            type="submit"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3.5 py-1.5 rounded-xl bg-[#0052CC] text-white text-[11px] font-bold"
          >
            Search
          </button>
        </form>
      </section>

      {/* ================= OUR COURSES (Grand Custom Course Artwork Cards — Desktop & Mobile) ================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 sm:pt-16 pb-10">
        <div className="flex items-end justify-between gap-4 mb-7">
          <div>
            <h2 className="font-display font-extrabold text-2xl sm:text-3xl text-[#002B7A]">
              Our Courses
            </h2>
            <div className="w-16 h-1 rounded-full bg-[#FF7A00] mt-2" />
          </div>
          <Link
            to="/courses"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[#0052CC] hover:text-[#FF7A00] transition"
          >
            Explore All Courses <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {courses.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-xs">
            <BookOpen className="w-10 h-10 text-[#0052CC] mx-auto mb-3" />
            <h3 className="font-display font-bold text-lg text-[#0F172A]">
              No courses available yet.
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 mt-1.5 max-w-md mx-auto">
              Create and publish your first course from Admin Course Management to showcase it here.
            </p>
          </div>
        ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {courses.slice(0, 8).map((course, idx) => {
            const isBlueIcon = course.icon_color === 'blue';
            const effectivePrice = course.discount_price ?? course.price;
            return (
              <RevealOnScroll key={course.id} delay={idx * 60}>
                <Link
                  to={`/courses/${course.slug}`}
                  className="group bg-white rounded-3xl border border-slate-200/90 shadow-sm hover:shadow-2xl hover:-translate-y-1.5 transition-all duration-300 overflow-hidden flex flex-col h-full"
                >
                  <div className="relative aspect-[16/9] bg-blue-50 overflow-hidden">
                    <img
                      src={course.thumbnail_url}
                      alt={course.title}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div
                      className={`absolute bottom-2.5 left-2.5 w-8 h-8 rounded-xl flex items-center justify-center shadow-lg ring-2 ring-white/80 ${
                        isBlueIcon ? 'bg-[#0052CC] text-white' : 'bg-[#FF7A00] text-white'
                      }`}
                    >
                      <CourseIcon name={course.icon_name} className="w-4 h-4" />
                    </div>
                    {course.is_free === 1 && (
                      <span className="absolute top-2.5 right-2.5 px-2.5 py-0.5 rounded-full bg-emerald-500 text-white text-[10px] font-bold shadow">
                        FREE
                      </span>
                    )}
                  </div>

                  <div className="p-4 sm:p-5 flex-1 flex flex-col">
                    <h3 className="font-display font-bold text-base sm:text-[17px] text-[#0F172A] group-hover:text-[#0052CC] transition-colors leading-snug">
                      {course.title}
                    </h3>
                    <p className="text-xs text-slate-600 mt-1.5 line-clamp-3 flex-1 leading-relaxed">
                      {course.short_description}
                    </p>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
                      <span className="font-display font-extrabold text-sm text-[#00338D]">
                        {course.is_free === 1 ? 'Free' : formatCurrency(effectivePrice)}
                      </span>
                      <div className="flex items-center gap-2 shrink-0">
                        <CourseShareButton course={course} variant="card" />
                        <span className="font-bold text-[#FF7A00] inline-flex items-center gap-1 group-hover:translate-x-0.5 transition">
                          Enroll Now <ArrowRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              </RevealOnScroll>
            );
          })}
        </div>
        )}
      </section>

      {/* ================= LEARN ANYWHERE, ANYTIME BANNER ================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <RevealOnScroll>
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#0038A8] via-[#0056D6] to-[#0B74FF] text-white p-6 sm:p-8 lg:px-10 shadow-xl">
            <div className="absolute -right-12 -top-12 w-48 h-48 rounded-full bg-white/10 pointer-events-none" />
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center relative z-10">
              <div className="lg:col-span-5 flex items-center gap-4 sm:gap-5">
                <div className="w-16 h-14 sm:w-20 sm:h-16 rounded-2xl bg-white text-[#FF7A00] flex items-center justify-center shadow-lg shrink-0 relative">
                  <Laptop className="w-9 h-9 text-[#0052CC]" />
                  <span className="absolute w-6 h-6 rounded-full bg-[#FF7A00] text-white flex items-center justify-center shadow">
                    <Play className="w-3 h-3 fill-white ml-0.5" />
                  </span>
                </div>
                <h2 className="font-display font-extrabold text-xl sm:text-2xl lg:text-[26px] leading-tight">
                  {cms.banner.heading}
                </h2>
              </div>

              <div className="lg:col-span-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2 lg:border-l lg:border-white/25 lg:pl-6">
                {cms.banner.bullets.map((b) => (
                  <div key={b} className="flex items-center gap-2 text-xs sm:text-sm font-medium text-blue-50">
                    <Check className="w-4 h-4 text-[#FF9B3D] shrink-0" />
                    <span>{b}</span>
                  </div>
                ))}
              </div>

              <div className="lg:col-span-3 flex lg:justify-end">
                <Link
                  to={user ? '/student' : '/register'}
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-[#FF7A00] hover:bg-[#E66D00] text-white font-bold text-sm shadow-lg shadow-orange-600/30 transition"
                >
                  {cms.banner.ctaLabel} <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </RevealOnScroll>
      </section>

      {/* ================= WHY CHOOSE O-LEARNING PLATFORM (Enriched Interactive Popups) ================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-9">
          <h2 className="font-display font-extrabold text-2xl sm:text-3xl text-[#002B7A]">
            Why Choose O-Learning Platform?
          </h2>
          <div className="w-16 h-1 rounded-full bg-[#FF7A00] mx-auto mt-2.5" />
          <p className="text-xs text-slate-500 mt-2">Tap any card for detailed platform highlights</p>
        </div>

        <RevealOnScroll>
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-5 sm:p-7 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 lg:gap-0 lg:divide-x divide-slate-200">
            {WHY_CHOOSE_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  type="button"
                  key={item.label}
                  onClick={() => setWhyPopup(item)}
                  className="group relative flex flex-col items-center text-center px-3 py-3 rounded-2xl hover:bg-blue-50/70 hover:-translate-y-1 transition-all duration-200 cursor-pointer"
                >
                  <div className="w-13 h-13 rounded-2xl bg-blue-50 text-[#0052CC] group-hover:bg-[#FF7A00] group-hover:text-white flex items-center justify-center mb-3 transition-colors shadow-xs">
                    <Icon className="w-6 h-6" />
                  </div>
                  <p className="text-xs sm:text-sm font-bold text-[#0F172A] leading-snug">
                    {item.label}
                  </p>
                  <span className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-bold text-[#0052CC] opacity-80 group-hover:opacity-100">
                    <Info className="w-3 h-3" /> Explore
                  </span>
                </button>
              );
            })}
          </div>
        </RevealOnScroll>
      </section>

      {/* ENRICHED WHY CHOOSE POPUP MODAL */}
      {whyPopup && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4"
          onClick={() => setWhyPopup(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="flex items-center gap-3.5">
                <div className="w-13 h-13 rounded-2xl bg-orange-50 text-[#FF7A00] flex items-center justify-center shrink-0">
                  <whyPopup.icon className="w-7 h-7" />
                </div>
                <div>
                  <span className="inline-block px-2.5 py-0.5 rounded-full bg-blue-50 text-[#0052CC] text-[11px] font-bold mb-1">
                    {whyPopup.badge}
                  </span>
                  <h3 className="font-display font-extrabold text-xl sm:text-2xl text-[#002B7A]">
                    {whyPopup.label}
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setWhyPopup(null)}
                className="p-1.5 rounded-full hover:bg-slate-100 cursor-pointer"
                aria-label="Close popup"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-slate-600 leading-relaxed">{whyPopup.summary}</p>

            {/* 3 Highlight Metrics */}
            <div className="grid grid-cols-3 gap-2.5 my-4 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-center">
              {whyPopup.metrics.map((m) => (
                <div key={m.label}>
                  <p className="text-[11px] text-slate-400 font-medium">{m.label}</p>
                  <p className="font-display font-bold text-sm text-[#00338D] mt-0.5">{m.value}</p>
                </div>
              ))}
            </div>

            <div className="space-y-2.5">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Key Student Advantages
              </p>
              {whyPopup.highlights.map((h) => (
                <div key={h} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-700">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>{h}</span>
                </div>
              ))}
            </div>

            <div className="mt-6 flex gap-2.5">
              <Link
                to={whyPopup.ctaTo}
                onClick={() => setWhyPopup(null)}
                className="flex-1 py-3 rounded-xl bg-[#0052CC] hover:bg-[#003EB3] text-white text-center text-xs sm:text-sm font-bold shadow-md"
              >
                {whyPopup.ctaLabel} →
              </Link>
              <button
                type="button"
                onClick={() => setWhyPopup(null)}
                className="px-4 py-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 cursor-pointer hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </PublicLayout>
  );
}
