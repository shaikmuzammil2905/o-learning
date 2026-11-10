import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Award,
  BadgeCheck,
  BookOpen,
  Check,
  ClipboardCheck,
  Headphones,
  Laptop,
  Play,
  Radio,
  Search,
  ShieldCheck,
  UserCheck,
  Users,
  Video,
} from 'lucide-react';
import { PublicLayout } from '../../components/PublicLayout';
import { CourseIcon } from '../../components/ui/StateViews';
import { useSite } from '../../context/SiteContext';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency } from '../../lib/api';

const STAT_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  BookOpen,
  Users,
  UserCheck,
  BadgeCheck,
};

const FEATURE_ICONS = [Radio, Video, ClipboardCheck, Users, Award];

export function HomePage() {
  const { cms, courses, plans } = useSite();
  const { user } = useAuth();
  const [mobileSearch, setMobileSearch] = useState('');
  const navigate = useNavigate();

  const featureLinks = ['/student/live', '/courses', '/tests', '/about', '/verify-certificate'];

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
        {/* Subtle left-side scrim for crisp typography while leaving student & artwork vivid */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#002D85]/85 via-[#0046B8]/35 to-transparent pointer-events-none" />

        <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8 py-14 lg:py-20 flex items-center justify-between gap-8">
          <div className="max-w-xl text-white">
            <h1 className="font-display font-extrabold text-4xl lg:text-[46px] leading-[1.14] tracking-tight drop-shadow-sm">
              {cms.hero.heading}
            </h1>
            <p className="mt-4 text-base lg:text-lg text-blue-50/95 leading-relaxed max-w-lg">
              {cms.hero.subtext}
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-4">
              <Link
                to="/courses"
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-[#FF7A00] hover:bg-[#E66D00] text-white font-bold text-sm lg:text-base shadow-lg shadow-orange-600/30 transition hover:-translate-y-0.5"
              >
                {cms.hero.primaryCtaLabel} <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to={user ? (user.role === 'student' ? '/student' : `/${user.role}`) : '/register'}
                className="inline-flex items-center justify-center px-7 py-3.5 rounded-full border-2 border-white/85 text-white hover:bg-white hover:text-[#003EB3] font-bold text-sm lg:text-base transition"
              >
                {user ? 'Go to Dashboard' : cms.hero.secondaryCtaLabel}
              </Link>
            </div>
          </div>

          {/* Right Vertical Floating Feature Card matching image.png */}
          <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-white/60 p-4 w-56 shrink-0 animate-float-slow">
            <ul className="divide-y divide-slate-100">
              {cms.hero.featureList.map((label, idx) => {
                const Icon = FEATURE_ICONS[idx % FEATURE_ICONS.length];
                return (
                  <li key={label}>
                    <Link
                      to={featureLinks[idx % featureLinks.length]}
                      className="flex items-center gap-3 py-2.5 px-1.5 rounded-lg hover:bg-blue-50/70 transition group"
                    >
                      <span className="w-8 h-8 rounded-lg bg-blue-50 text-[#0052CC] flex items-center justify-center shrink-0 group-hover:bg-[#0052CC] group-hover:text-white transition">
                        <Icon className="w-4 h-4" />
                      </span>
                      <span className="text-xs font-bold text-[#0F172A]">{label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </section>

      {/* MOBILE HERO (image copy 2.png animated background ONLY) */}
      <section className="md:hidden relative overflow-hidden bg-[#0046B8]">
        <img
          src={cms.hero.mobileBgUrl || '/images/hero-mobile-bg.png'}
          alt="O-Learning Platform Mobile Hero"
          className="absolute inset-0 w-full h-full object-cover object-top animate-hero-mobile pointer-events-none select-none"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#002D85]/80 via-[#0046B8]/45 to-[#002D85]/85 pointer-events-none" />

        <div className="relative z-10 px-4 pt-8 pb-12 text-white">
          <div className="max-w-[74%]">
            <h1 className="font-display font-extrabold text-[26px] leading-[1.18] tracking-tight drop-shadow">
              {cms.hero.heading}
            </h1>
            <p className="mt-2.5 text-xs text-blue-50/95 leading-relaxed">
              {cms.hero.subtext}
            </p>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2.5">
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

          {/* Mobile Feature Pill Strip */}
          <div className="mt-5 bg-white/95 backdrop-blur-md rounded-2xl p-2.5 shadow-xl grid grid-cols-5 gap-1 text-center">
            {cms.hero.featureList.map((label, idx) => {
              const Icon = FEATURE_ICONS[idx % FEATURE_ICONS.length];
              return (
                <Link
                  key={label}
                  to={featureLinks[idx % featureLinks.length]}
                  className="flex flex-col items-center justify-center py-1 px-0.5 rounded-lg"
                >
                  <span className="w-7 h-7 rounded-lg bg-blue-50 text-[#0052CC] flex items-center justify-center mb-1">
                    <Icon className="w-3.5 h-3.5" />
                  </span>
                  <span className="text-[9.5px] leading-tight font-bold text-slate-800">
                    {label}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ================= TRUST / STATISTICS STRIP ================= */}
      <section className="relative z-20 max-w-6xl mx-auto px-4 sm:px-6 -mt-6 md:-mt-8">
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200/80 px-4 py-4 sm:py-5 grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-0 lg:divide-x divide-slate-200">
          {cms.stats.map((st) => {
            const Icon = STAT_ICONS[st.icon] || BookOpen;
            return (
              <div key={st.label} className="flex items-center justify-center gap-3 px-2">
                <div className="w-11 h-11 rounded-xl bg-orange-50 text-[#FF7A00] flex items-center justify-center shrink-0">
                  <Icon className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-display font-extrabold text-xl sm:text-2xl text-[#0F172A] leading-none">
                    {st.value}
                  </p>
                  <p className="text-[11px] sm:text-xs font-semibold text-[#00338D] mt-1">
                    {st.label}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Mobile Search Bar (Section 28 Mobile Home) */}
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

      {/* ================= OUR COURSES (8 Primary Courses Grid) ================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 sm:pt-14 pb-10">
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

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 sm:gap-5">
          {courses.slice(0, 8).map((course) => {
            const isBlueIcon = course.icon_color === 'blue';
            const effectivePrice = course.discount_price ?? course.price;
            return (
              <Link
                key={course.id}
                to={`/courses/${course.slug}`}
                className="group bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-200 p-4 sm:p-5 flex flex-col"
              >
                {/* Generated Course Visual Preview + Icon Badge */}
                <div className="relative rounded-xl overflow-hidden aspect-[16/9] mb-3.5 bg-blue-50">
                  <img
                    src={course.thumbnail_url}
                    alt={course.title}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div
                    className={`absolute bottom-2 left-2 w-8 h-8 rounded-lg flex items-center justify-center shadow-md ${
                      isBlueIcon ? 'bg-[#0052CC] text-white' : 'bg-[#FF7A00] text-white'
                    }`}
                  >
                    <CourseIcon name={course.icon_name} className="w-4 h-4" />
                  </div>
                  {course.is_free === 1 && (
                    <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[10px] font-bold">
                      FREE
                    </span>
                  )}
                </div>

                <h3 className="font-display font-bold text-sm sm:text-base text-[#0F172A] group-hover:text-[#0052CC] transition-colors leading-snug">
                  {course.title}
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-600 mt-1.5 line-clamp-3 flex-1 leading-relaxed">
                  {course.short_description}
                </p>

                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="font-bold text-[#00338D]">
                    {course.is_free === 1 ? 'Free' : formatCurrency(effectivePrice)}
                  </span>
                  <span className="font-bold text-[#FF7A00] inline-flex items-center gap-0.5 group-hover:translate-x-0.5 transition">
                    Enroll <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ================= LEARN ANYWHERE, ANYTIME BANNER ================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
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
      </section>

      {/* ================= WHY CHOOSE O-LEARNING PLATFORM ================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-9">
          <h2 className="font-display font-extrabold text-2xl sm:text-3xl text-[#002B7A]">
            Why Choose O-Learning Platform?
          </h2>
          <div className="w-16 h-1 rounded-full bg-[#FF7A00] mx-auto mt-2.5" />
        </div>

        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 sm:p-8 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6 lg:gap-0 lg:divide-x divide-slate-200">
          {[
            { label: 'Expert Faculty', icon: Users },
            { label: 'Affordable Courses', icon: ShieldCheck },
            { label: 'Flexible Learning', icon: Video },
            { label: 'Practice & Mock Tests', icon: ClipboardCheck },
            { label: 'Doubt Support', icon: Headphones },
            { label: 'Certified Courses', icon: Award },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="flex flex-col items-center text-center px-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#0052CC] flex items-center justify-center mb-3">
                  <Icon className="w-6 h-6" />
                </div>
                <p className="text-xs sm:text-sm font-bold text-[#0F172A] leading-snug">
                  {item.label}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ================= SUBSCRIPTION PLANS PREVIEW ================= */}
      {plans.length > 0 && (
        <section className="bg-gradient-to-b from-slate-50 to-white py-12 border-t border-slate-200/70">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-9">
              <span className="px-3 py-1 rounded-full bg-orange-50 text-[#FF7A00] text-xs font-bold">
                AFFORDABLE LEARNING PLANS
              </span>
              <h2 className="font-display font-extrabold text-2xl sm:text-3xl text-[#002B7A] mt-2">
                Choose Your Learning Subscription
              </h2>
              <p className="text-sm text-slate-600 mt-1.5">
                Flexible plans designed for students, graduates, and working professionals across India.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {plans.map((plan) => (
                <div
                  key={plan.id}
                  className={`rounded-3xl p-6 flex flex-col transition ${
                    plan.is_popular
                      ? 'bg-gradient-to-b from-[#0038A8] to-[#0052CC] text-white shadow-2xl scale-[1.01] border-2 border-[#FF7A00]'
                      : 'bg-white border border-slate-200 shadow-sm'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-display font-bold text-lg">{plan.name}</h3>
                    {plan.badge && (
                      <span
                        className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                          plan.is_popular
                            ? 'bg-[#FF7A00] text-white'
                            : 'bg-blue-50 text-[#0052CC]'
                        }`}
                      >
                        {plan.badge}
                      </span>
                    )}
                  </div>
                  <div className="mt-4 flex items-baseline gap-1.5">
                    <span className="font-display font-extrabold text-3xl">
                      {formatCurrency(plan.price)}
                    </span>
                    <span className={`text-xs ${plan.is_popular ? 'text-blue-100' : 'text-slate-500'}`}>
                      / {plan.duration_months} Months
                    </span>
                  </div>
                  <ul className="mt-5 space-y-2.5 flex-1">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-xs sm:text-sm">
                        <Check
                          className={`w-4 h-4 shrink-0 mt-0.5 ${
                            plan.is_popular ? 'text-[#FF9B3D]' : 'text-emerald-500'
                          }`}
                        />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    to="/plans"
                    className={`mt-6 w-full py-3 rounded-xl text-center text-sm font-bold transition ${
                      plan.is_popular
                        ? 'bg-[#FF7A00] hover:bg-[#E66D00] text-white'
                        : 'bg-[#0052CC] hover:bg-[#003EB3] text-white'
                    }`}
                  >
                    Subscribe Now
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </PublicLayout>
  );
}

