import React, { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import {
  Award,
  BookOpen,
  ClipboardCheck,
  CreditCard,
  Gift,
  Home,
  LayoutDashboard,
  LogOut,
  Menu,
  Radio,
  Sparkles,
  User as UserIcon,
  X,
} from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import { useAuth } from '../context/AuthContext';

export interface SidebarLink {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  end?: boolean;
}

export function DashboardLayout({
  title,
  subtitle,
  links,
  darkTheme = false,
  children,
}: {
  title: string;
  subtitle?: string;
  links: SidebarLink[];
  darkTheme?: boolean;
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isStudent = user?.role === 'student';

  return (
    <div
      className={`min-h-screen flex flex-col lg:flex-row ${
        darkTheme ? 'bg-[#0B1120] text-slate-100' : 'bg-[#F1F5F9] text-[#0F172A]'
      }`}
    >
      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:flex lg:w-68 lg:flex-col lg:fixed lg:inset-y-0 z-30 border-r ${
          darkTheme
            ? 'bg-[#0F172A] border-slate-800/90'
            : 'bg-white border-slate-200'
        }`}
      >
        <div
          className={`h-18 px-5 flex items-center justify-between border-b ${
            darkTheme ? 'border-slate-800/90' : 'border-slate-200'
          }`}
        >
          <BrandLogo compact dark={darkTheme} />
          {darkTheme && (
            <span className="rounded-md bg-[#FF7A00]/15 border border-[#FF7A00]/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#FF7A00]">
              Admin
            </span>
          )}
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {links.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition ${
                    isActive
                      ? darkTheme
                        ? 'bg-[#FF7A00] text-white shadow-lg shadow-orange-500/20'
                        : 'bg-[#0052CC] text-white shadow-sm'
                      : darkTheme
                      ? 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div
          className={`p-4 border-t space-y-2 ${
            darkTheme ? 'border-slate-800/90' : 'border-slate-200'
          }`}
        >
          <Link
            to="/"
            className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition ${
              darkTheme
                ? 'text-slate-300 hover:bg-slate-800 hover:text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Home className="w-4 h-4" /> Back to Site
          </Link>
          <button
            onClick={handleLogout}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
              darkTheme
                ? 'text-rose-400 hover:bg-rose-500/10'
                : 'text-red-600 hover:bg-red-50'
            }`}
          >
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs" onClick={() => setSidebarOpen(false)} />
          <div
            className={`relative w-72 max-w-[85vw] h-full flex flex-col z-10 shadow-2xl ${
              darkTheme ? 'bg-[#0F172A] text-slate-100 border-r border-slate-800' : 'bg-white'
            }`}
          >
            <div
              className={`h-16 px-4 flex items-center justify-between border-b ${
                darkTheme ? 'border-slate-800' : 'border-slate-200'
              }`}
            >
              <BrandLogo compact dark={darkTheme} />
              <button
                onClick={() => setSidebarOpen(false)}
                className={`p-2 rounded-xl cursor-pointer ${
                  darkTheme ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
              {links.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    onClick={() => setSidebarOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold ${
                        isActive
                          ? darkTheme
                            ? 'bg-[#FF7A00] text-white'
                            : 'bg-[#0052CC] text-white'
                          : darkTheme
                          ? 'text-slate-300 hover:bg-slate-800'
                          : 'text-slate-700 hover:bg-slate-100'
                      }`
                    }
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </nav>
            <div
              className={`p-4 border-t space-y-2 ${
                darkTheme ? 'border-slate-800' : 'border-slate-200'
              }`}
            >
              <Link
                to="/"
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold ${
                  darkTheme ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Home className="w-4 h-4" /> Back to Site
              </Link>
              <button
                onClick={handleLogout}
                className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold cursor-pointer ${
                  darkTheme ? 'text-rose-400 hover:bg-rose-500/10' : 'text-red-600 hover:bg-red-50'
                }`}
              >
                <LogOut className="w-4 h-4" /> Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-68 flex flex-col min-w-0">
        {/* Topbar */}
        <header
          className={`sticky top-0 z-20 backdrop-blur-md border-b px-4 sm:px-6 lg:px-8 h-16 sm:h-18 flex items-center justify-between gap-4 ${
            darkTheme
              ? 'bg-[#0F172A]/90 border-slate-800/90'
              : 'bg-white/95 border-slate-200'
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className={`lg:hidden p-2 rounded-xl border cursor-pointer ${
                darkTheme
                  ? 'border-slate-700 text-slate-200 hover:bg-slate-800'
                  : 'border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <h1
                className={`font-display font-bold text-base sm:text-xl truncate ${
                  darkTheme ? 'text-white' : 'text-[#0F172A]'
                }`}
              >
                {title}
              </h1>
              {subtitle && (
                <p className={`text-xs truncate ${darkTheme ? 'text-slate-400' : 'text-slate-500'}`}>
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div
              className={`flex items-center gap-2.5 px-3 py-1.5 rounded-full border ${
                darkTheme
                  ? 'bg-slate-800/90 border-slate-700'
                  : 'bg-slate-100 border-transparent'
              }`}
            >
              <div
                className={`w-7 h-7 rounded-full text-white text-xs font-bold flex items-center justify-center ${
                  darkTheme ? 'bg-[#FF7A00]' : 'bg-[#0052CC]'
                }`}
              >
                {user?.full_name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="hidden sm:block text-left leading-tight">
                <p
                  className={`text-xs font-bold max-w-[130px] truncate ${
                    darkTheme ? 'text-slate-100' : 'text-slate-800'
                  }`}
                >
                  {user?.full_name}
                </p>
                <p
                  className={`text-[10px] uppercase tracking-wider font-semibold ${
                    darkTheme ? 'text-[#FF7A00]' : 'text-[#0052CC]'
                  }`}
                >
                  {user?.role}
                </p>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-24 lg:pb-10">{children}</main>
      </div>

      {/* Student Mobile Bottom Navigation inside Dashboard */}
      {isStudent && (
        <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-slate-200 px-1 py-1.5 flex items-center justify-around">
          {[
            { to: '/student', label: 'Home', icon: LayoutDashboard, end: true },
            { to: '/student/courses', label: 'My Learning', icon: BookOpen },
            { to: '/student/live', label: 'Live', icon: Radio },
            { to: '/student/tests', label: 'Tests', icon: ClipboardCheck },
            { to: '/student/profile', label: 'Profile', icon: UserIcon },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex flex-col items-center justify-center min-w-[60px] py-1 text-[11px] font-semibold ${
                    isActive ? 'text-[#0052CC]' : 'text-slate-500'
                  }`
                }
              >
                <Icon className="w-5 h-5 mb-0.5" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      )}
    </div>
  );
}

export const STUDENT_LINKS: SidebarLink[] = [
  { to: '/student', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/student/courses', label: 'My Courses', icon: BookOpen },
  { to: '/student/live', label: 'Live Classes', icon: Radio },
  { to: '/student/tests', label: 'Tests & Results', icon: ClipboardCheck },
  { to: '/student/certificates', label: 'Certificates', icon: Award },
  { to: '/student/payments', label: 'Payments', icon: CreditCard },
  { to: '/student/referrals', label: 'Refer & Earn', icon: Gift },
  { to: '/student/profile', label: 'Profile & Settings', icon: UserIcon },
];

