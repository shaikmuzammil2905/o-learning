import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, KeyRound, Lock, Mail, X } from 'lucide-react';
import { PublicLayout } from '../../components/PublicLayout';
import { BrandLogo } from '../../components/BrandLogo';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect');

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Forgot password modal state
  const [forgotOpen, setForgotOpen] = useState(false);
  const [fpEmail, setFpEmail] = useState('');
  const [fpMobile, setFpMobile] = useState('');
  const [fpNewPw, setFpNewPw] = useState('');
  const [fpMsg, setFpMsg] = useState('');
  const [fpErr, setFpErr] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(identifier, password, rememberMe);
      if (redirect && user.role === 'student') {
        navigate(redirect);
      } else if (user.role === 'admin') {
        navigate('/admin');
      } else if (user.role === 'faculty') {
        navigate('/faculty');
      } else {
        navigate('/student');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFpMsg('');
    setFpErr('');
    try {
      const res = await api<{ message: string }>('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: fpEmail, mobile: fpMobile, new_password: fpNewPw }),
      });
      setFpMsg(res.message);
    } catch (err) {
      setFpErr(err instanceof Error ? err.message : 'Could not reset password.');
    }
  };

  return (
    <PublicLayout>
      <section className="min-h-[calc(100vh-140px)] flex items-center justify-center py-10 px-4 bg-gradient-to-b from-blue-50/70 to-slate-50">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-200/90 p-6 sm:p-8">
          <div className="flex justify-center mb-5">
            <BrandLogo />
          </div>

          <div className="text-center mb-6">
            <h1 className="font-display font-extrabold text-2xl text-[#002B7A]">Welcome Back!</h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Sign in with your Email or Mobile Number to continue learning.
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Email or Mobile Number
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="Enter email or 10-digit mobile"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 text-sm outline-none focus:border-[#0052CC] focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPw ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full pl-10 pr-11 py-3 rounded-xl border border-slate-300 text-sm outline-none focus:border-[#0052CC] focus:ring-2 focus:ring-blue-100"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  aria-label="Toggle password visibility"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs">
              <label className="inline-flex items-center gap-2 text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-slate-300 text-[#0052CC]"
                />
                Remember me
              </label>
              <button
                type="button"
                onClick={() => setForgotOpen(true)}
                className="font-bold text-[#0052CC] hover:underline cursor-pointer"
              >
                Forgot Password?
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-[#0052CC] hover:bg-[#003EB3] text-white font-bold text-sm shadow-lg shadow-blue-600/20 transition cursor-pointer disabled:opacity-60"
            >
              {loading ? 'Signing in…' : 'Login'}
            </button>
          </form>

          <p className="text-center text-xs text-slate-600 mt-6">
            New to O-Learning Platform?{' '}
            <Link to="/register" className="font-bold text-[#FF7A00] hover:underline">
              Create Free Account
            </Link>
          </p>
        </div>
      </section>

      {/* Forgot Password Modal */}
      {forgotOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-bold text-lg text-[#002B7A] flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-[#FF7A00]" /> Reset Password
              </h3>
              <button onClick={() => setForgotOpen(false)} className="p-1.5 rounded-full hover:bg-slate-100 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-slate-500">
              Verify your registered email and mobile number to set a new password.
            </p>
            {fpMsg && <p className="p-3 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-semibold">{fpMsg}</p>}
            {fpErr && <p className="p-3 rounded-xl bg-red-50 text-red-700 text-xs font-semibold">{fpErr}</p>}
            <form onSubmit={handleForgotSubmit} className="space-y-3">
              <input
                type="email"
                required
                value={fpEmail}
                onChange={(e) => setFpEmail(e.target.value)}
                placeholder="Registered Email"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm outline-none"
              />
              <input
                type="tel"
                required
                value={fpMobile}
                onChange={(e) => setFpMobile(e.target.value)}
                placeholder="Registered Mobile Number"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm outline-none"
              />
              <input
                type="password"
                required
                minLength={6}
                value={fpNewPw}
                onChange={(e) => setFpNewPw(e.target.value)}
                placeholder="New Password (min 6 chars)"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm outline-none"
              />
              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-[#FF7A00] text-white font-bold text-sm cursor-pointer"
              >
                Update Password
              </button>
            </form>
          </div>
        </div>
      )}
    </PublicLayout>
  );
}
