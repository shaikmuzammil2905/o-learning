import React, { useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  BookOpen,
  ChevronRight,
  ClipboardCheck,
  Gift,
  GraduationCap,
  Home,
  LayoutDashboard,
  LogOut,
  Mail,
  MapPin,
  Menu,
  MessageCircle,
  Phone,
  Share2,
  User as UserIcon,
  X,
} from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import { CourseShareModal } from './CourseShareModal';
import { useAuth } from '../context/AuthContext';
import { useSite } from '../context/SiteContext';
import type { Course } from '../types';

export function PublicLayout({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [referOpen, setReferOpen] = useState(false);
  const [shareCourse, setShareCourse] = useState<Course | null>(null);
  const { user, logout } = useAuth();
  const { cms, courses } = useSite();
  const navigate = useNavigate();
  const location = useLocation();

  const dashboardPath =
    user?.role === 'admin'
      ? '/admin'
      : user?.role === 'faculty'
      ? '/faculty'
      : '/student';

  const navItems = [
    { to: '/', label: 'Home' },
    { to: '/courses', label: 'Courses' },
    { to: '/tests', label: 'Tests' },
    { to: '/batches', label: 'Batches' },
    { to: '/about', label: 'About' },
    { to: '/contact', label: 'Contact' },
  ];

  const handleLogout = async () => {
    await logout();
    setMenuOpen(false);
    navigate('/');
  };

  const whatsappNum = cms.contact.whatsapp.replace(/\D/g, '') || '9121403515';
  const whatsappUrl = `https://wa.me/91${whatsappNum}?text=${encodeURIComponent(
    'Hello, I would like to know more about O-Learning Platform courses.'
  )}`;

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-[#0F172A] overflow-x-hidden">
      {/* Header matching image.png (desktop) & image copy.png (mobile) */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-[74px] flex items-center justify-between gap-4">
          <div className="hidden sm:block">
            <BrandLogo />
          </div>
          <div className="sm:hidden">
            <BrandLogo compact />
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-7">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `text-[15px] font-semibold transition-colors ${
                    isActive
                      ? 'text-[#0052CC]'
                      : 'text-slate-700 hover:text-[#0052CC]'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          {/* Desktop Auth CTAs */}
          <div className="hidden lg:flex items-center gap-3">
            {user ? (
              <>
                <Link
                  to={dashboardPath}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#0052CC] text-white text-sm font-bold hover:bg-[#003EB3] transition shadow-sm"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  {user.role === 'admin'
                    ? 'Admin Panel'
                    : user.role === 'faculty'
                    ? 'Faculty Portal'
                    : 'My Dashboard'}
                </Link>
                <button
                  onClick={handleLogout}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full border border-slate-300 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition cursor-pointer"
                >
                  <LogOut className="w-4 h-4" /> Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-6 py-2 rounded-full border-2 border-[#0052CC] text-[#0052CC] text-sm font-bold hover:bg-blue-50 transition"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="px-6 py-2.5 rounded-full bg-[#FF7A00] text-white text-sm font-bold hover:bg-[#E66D00] transition shadow-md shadow-orange-500/20"
                >
                  Register
                </Link>
              </>
            )}
          </div>

          {/* Mobile Hamburger Menu */}
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Toggle navigation menu"
            className="lg:hidden p-2.5 rounded-xl border border-slate-200 text-[#002B7A] hover:bg-slate-50 transition cursor-pointer"
          >
            {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Dropdown Drawer */}
        {menuOpen && (
          <div className="lg:hidden bg-white border-t border-slate-200 px-4 py-4 space-y-2 shadow-xl">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  `block px-4 py-3 rounded-xl text-sm font-semibold ${
                    isActive ? 'bg-blue-50 text-[#0052CC]' : 'text-slate-700 hover:bg-slate-50'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
            <NavLink
              to="/verify-certificate"
              onClick={() => setMenuOpen(false)}
              className="block px-4 py-3 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Verify Certificate
            </NavLink>
            <div className="pt-3 border-t border-slate-200 flex gap-2.5">
              {user ? (
                <>
                  <Link
                    to={dashboardPath}
                    onClick={() => setMenuOpen(false)}
                    className="flex-1 py-3 rounded-xl bg-[#0052CC] text-white text-center text-sm font-bold"
                  >
                    Dashboard
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="px-4 py-3 rounded-xl border border-slate-300 text-slate-700 text-sm font-bold cursor-pointer"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    onClick={() => setMenuOpen(false)}
                    className="flex-1 py-3 rounded-xl border-2 border-[#0052CC] text-[#0052CC] text-center text-sm font-bold"
                  >
                    Login
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setMenuOpen(false)}
                    className="flex-1 py-3 rounded-xl bg-[#FF7A00] text-white text-center text-sm font-bold"
                  >
                    Register
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 pb-20 md:pb-0">{children}</main>

      {/* Blue & Orange Branded Footer */}
      <footer className="relative bg-gradient-to-br from-[#001F5C] via-[#00389E] to-[#0052CC] text-white border-t-4 border-[#FF7A00] pt-12 pb-24 md:pb-10 overflow-hidden">
        <div className="absolute -right-24 -top-24 w-72 h-72 rounded-full bg-[#FF7A00]/15 blur-2xl pointer-events-none" />
        <div className="absolute -left-24 bottom-0 w-72 h-72 rounded-full bg-blue-400/10 blur-2xl pointer-events-none" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-10">
            {/* Brand + Socials */}
            <div>
              <BrandLogo dark />
              <p className="text-xs text-blue-100/90 mt-3.5 leading-relaxed">
                Quality, affordable online education for every Indian learner. Founded in {cms.brand.foundedYear} in {cms.brand.location}.
              </p>
              <p className="text-sm font-bold text-[#FF9B3D] mt-4">Follow Us:</p>
              <div className="flex items-center gap-2.5 mt-2.5">
                {[
                  { label: 'Facebook', bg: 'bg-[#1877F2]', text: 'f', href: '#facebook' },
                  { label: 'YouTube', bg: 'bg-[#FF0000]', text: '▶', href: '#youtube' },
                  { label: 'Instagram', bg: 'bg-gradient-to-tr from-[#F58529] via-[#DD2A7B] to-[#8134AF]', text: '◎', href: '#instagram' },
                  { label: 'LinkedIn', bg: 'bg-[#0A66C2]', text: 'in', href: '#linkedin' },
                ].map((s) => (
                  <a
                    key={s.label}
                    href={s.href}
                    aria-label={s.label}
                    onClick={(e) => {
                      e.preventDefault();
                      navigate('/contact');
                    }}
                    className={`w-9 h-9 rounded-full ${s.bg} text-white text-xs font-bold flex items-center justify-center shadow-md ring-2 ring-white/20 hover:scale-110 transition`}
                  >
                    {s.text}
                  </a>
                ))}
              </div>
            </div>

            {/* Quick Links */}
            <div className="sm:border-l sm:border-white/15 sm:pl-6">
              <h4 className="font-display font-bold text-base text-[#FF9B3D] mb-3.5">Quick Links</h4>
              <ul className="space-y-2 text-sm text-blue-100">
                {[
                  { to: '/', label: 'Home' },
                  { to: '/courses', label: 'Courses' },
                  { to: '/tests', label: 'Practice Tests' },
                  { to: '/batches', label: 'Live Batches' },
                  { to: '/about', label: 'About Us' },
                  { to: '/verify-certificate', label: 'Verify Certificate' },
                  { to: '/contact', label: 'Contact Us' },
                ].map((l) => (
                  <li key={l.to}>
                    <Link to={l.to} className="inline-flex items-center gap-1.5 hover:text-[#FF9B3D] transition">
                      <ChevronRight className="w-3.5 h-3.5 text-[#FF7A00]" />
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Popular Courses */}
            <div className="sm:border-l sm:border-white/15 sm:pl-6">
              <h4 className="font-display font-bold text-base text-[#FF9B3D] mb-3.5">Popular Courses</h4>
              <ul className="space-y-2 text-sm text-blue-100">
                {(courses.length > 0
                  ? courses.slice(0, 5)
                  : [
                      { slug: 'spoken-english', title: 'Spoken English' },
                      { slug: 'competitive-exam-preparation', title: 'Competitive Exams' },
                      { slug: 'jee-neet-preparation', title: 'JEE & NEET' },
                      { slug: 'upsc-preparation', title: 'UPSC' },
                      { slug: 'it-and-programming-courses', title: 'IT & Programming' },
                    ]
                ).map((c) => (
                  <li key={c.slug}>
                    <Link
                      to={`/courses/${c.slug}`}
                      className="inline-flex items-center gap-1.5 hover:text-[#FF9B3D] transition"
                    >
                      <ChevronRight className="w-3.5 h-3.5 text-[#FF7A00]" />
                      {c.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact Us */}
            <div className="sm:border-l sm:border-white/15 sm:pl-6">
              <h4 className="font-display font-bold text-base text-[#FF9B3D] mb-3.5">Contact Us</h4>
              <ul className="space-y-3 text-sm text-blue-50">
                <li>
                  <a
                    href={`tel:${cms.contact.phone}`}
                    className="inline-flex items-center gap-2.5 hover:text-[#FF9B3D] transition"
                  >
                    <Phone className="w-4 h-4 text-[#FF7A00] shrink-0" />
                    <span>{cms.contact.phone}</span>
                  </a>
                </li>
                <li>
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2.5 hover:text-emerald-300 transition"
                  >
                    <MessageCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{cms.contact.whatsapp}</span>
                  </a>
                </li>
                <li>
                  <a
                    href={`mailto:${cms.contact.email}`}
                    className="inline-flex items-center gap-2.5 hover:text-[#FF9B3D] break-all transition"
                  >
                    <Mail className="w-4 h-4 text-[#FF7A00] shrink-0" />
                    <span>{cms.contact.email}</span>
                  </a>
                </li>
                <li className="inline-flex items-start gap-2.5">
                  <MapPin className="w-4 h-4 text-[#FF7A00] shrink-0 mt-0.5" />
                  <span>{cms.contact.location}</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-10 pt-6 border-t border-white/15 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-blue-100/80">
            <p>© {new Date().getFullYear()} O-LEARNING PLATFORM. All rights reserved.</p>
            <p className="text-[#FF9B3D] font-semibold">
              {cms.brand.tagline} · {cms.contact.location}
            </p>
          </div>
        </div>
      </footer>

      {/* Floating Action Cluster: positioned bottom-left above mobile nav so right-side card CTAs & Share buttons stay unobstructed */}
      <div className="fixed bottom-[74px] left-3 md:bottom-6 md:left-auto md:right-5 z-40 flex items-center gap-2">
        <a
          href={`https://wa.me/${(cms.contact.whatsapp || cms.contact.phone || '919876543210').replace(/\D/g, '')}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="WhatsApp Support"
          title="Chat on WhatsApp"
          className="inline-flex items-center justify-center w-10 h-10 md:w-11 md:h-11 rounded-full bg-[#25D366] hover:bg-[#1EBE5D] text-white shadow-lg shadow-emerald-600/30 hover:scale-105 transition-transform"
        >
          <MessageCircle className="w-5 h-5" />
        </a>
        <button
          type="button"
          onClick={() => setReferOpen(true)}
          aria-label="Refer & Share Courses"
          className="relative inline-flex items-center gap-1.5 px-3.5 py-2.5 md:px-4 md:py-3 rounded-full bg-gradient-to-r from-[#FF7A00] to-[#FF5500] hover:from-[#FF8C1A] hover:to-[#FF6B00] text-white font-display font-bold text-xs sm:text-sm shadow-xl shadow-orange-600/35 hover:scale-105 transition-transform cursor-pointer"
        >
          <span className="absolute inset-0 rounded-full bg-[#FF7A00] animate-pulse-ring pointer-events-none" />
          <Gift className="w-4 h-4 relative z-10" />
          <span className="relative z-10">Refer</span>
        </button>
      </div>

      {/* Quick Refer & Share Course Selector Popup */}
      {referOpen && (
        <div
          className="fixed inset-0 z-[65] flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-xs sm:p-4"
          onClick={() => setReferOpen(false)}
        >
          <div
            className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-[#00338D] to-[#0052CC] text-white px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Gift className="w-5 h-5 text-[#FF9B3D]" />
                <div>
                  <h3 className="font-display font-bold text-base">Refer &amp; Share Courses</h3>
                  <p className="text-[11px] text-blue-100">
                    Pick any course to generate your unique referral link
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReferOpen(false)}
                aria-label="Close refer popup"
                className="p-1.5 rounded-full hover:bg-white/15 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-5 space-y-2.5 overflow-y-auto pb-[max(1.25rem,env(safe-area-inset-bottom))]">
              {courses.slice(0, 8).map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setReferOpen(false);
                    setShareCourse(c);
                  }}
                  className="w-full p-2.5 rounded-2xl bg-slate-50 hover:bg-blue-50 border border-slate-200/80 flex items-center justify-between gap-3 text-left transition cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={c.thumbnail_url}
                      alt={c.title}
                      className="w-16 aspect-[16/9] rounded-xl object-cover shrink-0 bg-blue-50"
                    />
                    <span className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                      {c.title}
                    </span>
                  </div>
                  <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#0052CC] text-white text-xs font-bold shrink-0">
                    <Share2 className="w-3.5 h-3.5" /> Refer
                  </span>
                </button>
              ))}

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                <Link
                  to={user ? '/student/referrals' : '/register'}
                  onClick={() => setReferOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-[#FF7A00] text-white text-center text-xs font-bold"
                >
                  {user ? 'Open My Referral Dashboard →' : 'Register & Earn Rewards →'}
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {shareCourse && (
        <CourseShareModal
          course={shareCourse}
          open={Boolean(shareCourse)}
          onClose={() => setShareCourse(null)}
        />
      )}

      {/* Mobile App Bottom Navigation (Home, My Learning, Courses, Tests, Profile) */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-1 py-1.5 flex items-center justify-around shadow-[0_-4px_20px_rgba(15,23,42,0.06)]">
        {[
          { to: '/', label: 'Home', icon: Home, match: location.pathname === '/' },
          {
            to: user ? (user.role === 'student' ? '/student/courses' : dashboardPath) : '/login',
            label: 'My Learning',
            icon: GraduationCap,
            match: location.pathname.startsWith('/student/courses'),
          },
          {
            to: '/courses',
            label: 'Courses',
            icon: BookOpen,
            match: location.pathname.startsWith('/courses'),
          },
          {
            to: '/tests',
            label: 'Tests',
            icon: ClipboardCheck,
            match: location.pathname.startsWith('/tests'),
          },
          {
            to: user ? (user.role === 'student' ? '/student/profile' : dashboardPath) : '/login',
            label: 'Profile',
            icon: UserIcon,
            match: location.pathname.startsWith('/student/profile') || location.pathname === '/login',
          },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.label}
              to={item.to}
              className={`flex flex-col items-center justify-center min-w-[60px] py-1 rounded-xl text-[11px] font-semibold transition ${
                item.match ? 'text-[#0052CC]' : 'text-slate-500'
              }`}
            >
              <Icon className={`w-5 h-5 mb-0.5 ${item.match ? 'text-[#FF7A00]' : ''}`} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

