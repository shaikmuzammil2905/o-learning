import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Eye, EyeOff, Gift, KeyRound, Lock, Mail, Phone, User as UserIcon, X } from 'lucide-react';
import { PublicLayout } from '../../components/PublicLayout';
import { BrandLogo } from '../../components/BrandLogo';
import { GoogleSignInButton } from '../../components/GoogleSignInButton';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';

export function LoginPage() {
  const { login, loginWithGoogle, completeGoogleProfile } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect');

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Forgot password modal state (2-step OTP)
  const [forgotOpen, setForgotOpen] = useState(false);
  const [fpStep, setFpStep] = useState<'email' | 'reset'>('email');
  const [fpEmail, setFpEmail] = useState('');
  const [fpOtp, setFpOtp] = useState('');
  const [fpNewPw, setFpNewPw] = useState('');
  const [fpConfirmPw, setFpConfirmPw] = useState('');
  const [fpLoading, setFpLoading] = useState(false);
  const [fpCooldown, setFpCooldown] = useState(0);
  const [fpMsg, setFpMsg] = useState('');
  const [fpErr, setFpErr] = useState('');

  // Google profile completion modal (when user clicks "Login with Google" on a new account)
  const [googleModalOpen, setGoogleModalOpen] = useState(false);
  const [gPendingToken, setGPendingToken] = useState('');
  const [gEmail, setGEmail] = useState('');
  const [gName, setGName] = useState('');
  const [gMobile, setGMobile] = useState('');
  const [gPassword, setGPassword] = useState('');
  const [gReferral, setGReferral] = useState('');
  const [gErr, setGErr] = useState('');
  const [gLoading, setGLoading] = useState(false);

  useEffect(() => {
    if (fpCooldown <= 0) return;
    const t = setTimeout(() => setFpCooldown((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [fpCooldown]);

  const navigateByRole = (role: string) => {
    if (redirect && role === 'student') {
      navigate(redirect);
    } else if (role === 'admin') {
      navigate('/admin');
    } else if (role === 'faculty') {
      navigate('/faculty');
    } else {
      navigate('/student');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(identifier, password, rememberMe);
      navigateByRole(user.role);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleCredential = async (credential: string) => {
    setError('');
    setLoading(true);
    try {
      const res = await loginWithGoogle(credential);
      if (res.needsProfileCompletion && res.pendingToken && res.profile) {
        setGPendingToken(res.pendingToken);
        setGEmail(res.profile.email);
        setGName(res.profile.full_name || '');
        setGMobile('');
        setGPassword('');
        setGReferral('');
        setGErr('');
        setGoogleModalOpen(true);
      } else if (res.user) {
        navigateByRole(res.user.role);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google login failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteGoogleProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setGErr('');
    if (gName.trim().length < 2) {
      setGErr('Please enter your full name.');
      return;
    }
    if (gMobile.replace(/\D/g, '').length < 10) {
      setGErr('Please enter a valid 10-digit mobile number.');
      return;
    }
    if (gPassword && gPassword.length < 6) {
      setGErr('Password must be at least 6 characters (or leave blank).');
      return;
    }
    setGLoading(true);
    try {
      const user = await completeGoogleProfile({
        pendingToken: gPendingToken,
        full_name: gName.trim(),
        mobile: gMobile,
        password: gPassword || undefined,
        referral_code: gReferral || undefined,
      });
      setGoogleModalOpen(false);
      navigateByRole(user.role);
    } catch (err) {
      setGErr(err instanceof Error ? err.message : 'Could not complete profile.');
    } finally {
      setGLoading(false);
    }
  };

  const handleSendForgotOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setFpMsg('');
    setFpErr('');
    setFpLoading(true);
    try {
      const res = await api<{ message: string }>('/api/auth/forgot-password/send-otp', {
        method: 'POST',
        body: JSON.stringify({ email: fpEmail }),
      });
      setFpMsg(res.message);
      setFpStep('reset');
      setFpCooldown(30);
    } catch (err) {
      setFpErr(err instanceof Error ? err.message : 'Could not send reset OTP.');
    } finally {
      setFpLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setFpMsg('');
    setFpErr('');
    if (fpNewPw.length < 6) {
      setFpErr('New password must be at least 6 characters long.');
      return;
    }
    if (fpNewPw !== fpConfirmPw) {
      setFpErr('New password and re-entered password do not match.');
      return;
    }
    setFpLoading(true);
    try {
      const res = await api<{ message: string }>('/api/auth/forgot-password/reset', {
        method: 'POST',
        body: JSON.stringify({
          email: fpEmail,
          otp: fpOtp,
          new_password: fpNewPw,
          confirm_password: fpConfirmPw,
        }),
      });
      setFpMsg(res.message);
      setFpOtp('');
      setFpNewPw('');
      setFpConfirmPw('');
    } catch (err) {
      setFpErr(err instanceof Error ? err.message : 'Could not reset password.');
    } finally {
      setFpLoading(false);
    }
  };

  const openForgotModal = () => {
    setFpStep('email');
    setFpEmail('');
    setFpOtp('');
    setFpNewPw('');
    setFpConfirmPw('');
    setFpMsg('');
    setFpErr('');
    setForgotOpen(true);
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
              Sign in with your Email, Mobile Number, or Google to continue learning.
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-700">
              {error}
            </div>
          )}

          <div className="mb-4">
            <GoogleSignInButton
              mode="signin"
              onCredential={handleGoogleCredential}
              onError={setError}
            />
          </div>

          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-3 text-slate-400 font-semibold">or login with credentials</span>
            </div>
          </div>

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
                onClick={openForgotModal}
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

      {/* Forgot Password Modal (2-Step OTP) */}
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
              {fpStep === 'email'
                ? 'Enter your registered email address to receive a 6-digit OTP.'
                : `Enter the OTP sent to ${fpEmail} and set your new password.`}
            </p>
            {fpMsg && <p className="p-3 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-semibold">{fpMsg}</p>}
            {fpErr && <p className="p-3 rounded-xl bg-red-50 text-red-700 text-xs font-semibold">{fpErr}</p>}

            {fpStep === 'email' ? (
              <form onSubmit={handleSendForgotOtp} className="space-y-3">
                <input
                  type="email"
                  required
                  value={fpEmail}
                  onChange={(e) => setFpEmail(e.target.value)}
                  placeholder="Registered Email Address"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm outline-none focus:border-[#0052CC]"
                />
                <button
                  type="submit"
                  disabled={fpLoading}
                  className="w-full py-3 rounded-xl bg-[#FF7A00] text-white font-bold text-sm cursor-pointer disabled:opacity-60"
                >
                  {fpLoading ? 'Sending OTP…' : 'Send OTP to Email'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-3">
                <input
                  type="text"
                  required
                  inputMode="numeric"
                  maxLength={6}
                  value={fpOtp}
                  onChange={(e) => setFpOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="Enter 6-digit OTP"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-bold tracking-[0.25em] text-center outline-none focus:border-[#0052CC]"
                />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={fpNewPw}
                  onChange={(e) => setFpNewPw(e.target.value)}
                  placeholder="New Password (min 6 chars)"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm outline-none focus:border-[#0052CC]"
                />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={fpConfirmPw}
                  onChange={(e) => setFpConfirmPw(e.target.value)}
                  placeholder="Re-enter New Password"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm outline-none focus:border-[#0052CC]"
                />
                <button
                  type="submit"
                  disabled={fpLoading}
                  className="w-full py-3 rounded-xl bg-[#FF7A00] text-white font-bold text-sm cursor-pointer disabled:opacity-60"
                >
                  {fpLoading ? 'Updating…' : 'Verify OTP & Update Password'}
                </button>
                <div className="flex items-center justify-between text-xs pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setFpStep('email');
                      setFpErr('');
                    }}
                    className="text-slate-600 hover:underline cursor-pointer"
                  >
                    Change Email
                  </button>
                  <button
                    type="button"
                    disabled={fpCooldown > 0 || fpLoading}
                    onClick={handleSendForgotOtp}
                    className="font-bold text-[#0052CC] hover:underline disabled:text-slate-400 cursor-pointer"
                  >
                    {fpCooldown > 0 ? `Resend in ${fpCooldown}s` : 'Resend OTP'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* New Google User Profile Completion Modal */}
      {googleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-bold text-lg text-[#002B7A]">Complete Your Profile</h3>
              <button onClick={() => setGoogleModalOpen(false)} className="p-1.5 rounded-full hover:bg-slate-100 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex items-center gap-2 p-3 rounded-xl bg-blue-50 border border-blue-200 text-xs text-[#002B7A]">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                Google Email Verified: <strong>{gEmail}</strong>
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Looks like this is your first time here. Please fill in your details to complete your student account.
            </p>
            {gErr && <p className="p-3 rounded-xl bg-red-50 text-red-700 text-xs font-semibold">{gErr}</p>}
            <form onSubmit={handleCompleteGoogleProfile} className="space-y-3">
              <div className="relative">
                <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={gName}
                  onChange={(e) => setGName(e.target.value)}
                  placeholder="Full Name *"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-sm outline-none focus:border-[#0052CC]"
                />
              </div>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  required
                  value={gMobile}
                  onChange={(e) => setGMobile(e.target.value)}
                  placeholder="10-digit Mobile Number *"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-sm outline-none focus:border-[#0052CC]"
                />
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={gPassword}
                  onChange={(e) => setGPassword(e.target.value)}
                  placeholder="Password (Optional, min 6 chars)"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-sm outline-none focus:border-[#0052CC]"
                />
              </div>
              <div className="relative">
                <Gift className="w-4 h-4 text-[#FF7A00] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={gReferral}
                  onChange={(e) => setGReferral(e.target.value.toUpperCase())}
                  placeholder="Referral Code (Optional)"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-sm outline-none focus:border-[#0052CC]"
                />
              </div>
              <button
                type="submit"
                disabled={gLoading}
                className="w-full py-3 rounded-xl bg-[#FF7A00] text-white font-bold text-sm cursor-pointer disabled:opacity-60"
              >
                {gLoading ? 'Saving…' : 'Complete Account & Continue'}
              </button>
            </form>
          </div>
        </div>
      )}
    </PublicLayout>
  );
}
