import React, { useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  BookOpen,
  ChevronRight,
  ClipboardCheck,
  GraduationCap,
  Home,
  LayoutDashboard,
  LogOut,
  Mail,
  MapPin,
  Menu,
  MessageCircle,
  Phone,
  User as UserIcon,
  X,
} from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import { useAuth } from '../context/AuthContext';
import { useSite } from '../context/SiteContext';

export function PublicLayout({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
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
              to="/plans"
              onClick={() => setMenuOpen(false)}
              className="block px-4 py-3 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Subscription Plans
            </NavLink>
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

      {/* Footer matching reference layout */}
      <footer className="bg-white border-t border-slate-200 pt-12 pb-24 md:pb-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-10">
            {/* Brand + Socials */}
            <div>
              <BrandLogo />
              <p className="text-xs text-slate-500 mt-3 leading-relaxed">
                Quality, affordable online education for every Indian learner. Founded in {cms.brand.foundedYear} in {cms.brand.location}.
              </p>
              <p className="text-sm font-bold text-[#002B7A] mt-4">Follow Us:</p>
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
                    className={`w-8 h-8 rounded-full ${s.bg} text-white text-xs font-bold flex items-center justify-center shadow-sm hover:scale-110 transition`}
                  >
                    {s.text}
                  </a>
                ))}
              </div>
            </div>

            {/* Quick Links */}
            <div className="sm:border-l sm:border-slate-200 sm:pl-6">
              <h4 className="font-display font-bold text-base text-[#002B7A] mb-3.5">Quick Links</h4>
              <ul className="space-y-2 text-sm text-slate-600">
                {[
                  { to: '/', label: 'Home' },
                  { to: '/courses', label: 'Courses' },
                  { to: '/plans', label: 'Subscription Plans' },
                  { to: '/about', label: 'About Us' },
                  { to: '/verify-certificate', label: 'Verify Certificate' },
                  { to: '/contact', label: 'Contact Us' },
                ].map((l) => (
                  <li key={l.to}>
                    <Link to={l.to} className="inline-flex items-center gap-1.5 hover:text-[#0052CC] transition">
                      <ChevronRight className="w-3.5 h-3.5 text-[#0052CC]" />
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Popular Courses */}
            <div className="sm:border-l sm:border-slate-200 sm:pl-6">
              <h4 className="font-display font-bold text-base text-[#002B7A] mb-3.5">Popular Courses</h4>
              <ul className="space-y-2 text-sm text-slate-600">
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
                      className="inline-flex items-center gap-1.5 hover:text-[#0052CC] transition"
                    >
                      <ChevronRight className="w-3.5 h-3.5 text-[#0052CC]" />
                      {c.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact Us */}
            <div className="sm:border-l sm:border-slate-200 sm:pl-6">
              <h4 className="font-display font-bold text-base text-[#002B7A] mb-3.5">Contact Us</h4>
              <ul className="space-y-3 text-sm text-slate-700">
                <li>
                  <a
                    href={`tel:${cms.contact.phone}`}
                    className="inline-flex items-center gap-2.5 hover:text-[#0052CC]"
                  >
                    <Phone className="w-4 h-4 text-[#0052CC] shrink-0" />
                    <span>{cms.contact.phone}</span>
                  </a>
                </li>
                <li>
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2.5 hover:text-emerald-600"
                  >
                    <MessageCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{cms.contact.whatsapp}</span>
                  </a>
                </li>
                <li>
                  <a
                    href={`mailto:${cms.contact.email}`}
                    className="inline-flex items-center gap-2.5 hover:text-[#0052CC] break-all"
                  >
                    <Mail className="w-4 h-4 text-[#0052CC] shrink-0" />
                    <span>{cms.contact.email}</span>
                  </a>
                </li>
                <li className="inline-flex items-start gap-2.5">
                  <MapPin className="w-4 h-4 text-[#0052CC] shrink-0 mt-0.5" />
                  <span>{cms.contact.location}</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-10 pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
            <p>© {new Date().getFullYear()} O-LEARNING PLATFORM. All rights reserved.</p>
            <p>{cms.brand.tagline} · {cms.contact.location}</p>
          </div>
        </div>
      </footer>

      {/* Floating WhatsApp Button (official number 9121403515) */}
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noreferrer"
        aria-label="Chat on WhatsApp"
        className="fixed bottom-20 md:bottom-6 right-4 z-40 w-13 h-13 rounded-full bg-[#25D366] text-white flex items-center justify-center shadow-xl hover:scale-110 transition-transform"
      >
        <span className="absolute inset-0 rounded-full bg-[#25D366] animate-pulse-ring" />
        <MessageCircle className="w-7 h-7 relative z-10 fill-white" />
      </a>

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

