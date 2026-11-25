import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Gift, KeyRound, Lock, Mail, Phone, User as UserIcon } from 'lucide-react';
import { PublicLayout } from '../../components/PublicLayout';
import { BrandLogo } from '../../components/BrandLogo';
import { GoogleSignInButton } from '../../components/GoogleSignInButton';
import { useAuth } from '../../context/AuthContext';

export function RegisterPage() {
  const { sendRegisterOtp, verifyRegisterOtp, loginWithGoogle, completeGoogleProfile } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [form, setForm] = useState({
    full_name: '',
    mobile: '',
    email: '',
    password: '',
    confirm_password: '',
    referral_code: searchParams.get('ref') || '',
  });

  const [step, setStep] = useState<'form' | 'otp' | 'google_profile'>('form');
  const [otp, setOtp] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Google profile completion state
  const [googlePendingToken, setGooglePendingToken] = useState('');
  const [googleEmail, setGoogleEmail] = useState('');

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');

    if (form.full_name.trim().length < 2) {
      setError('Please enter your full name.');
      return;
    }
    if (form.mobile.replace(/\D/g, '').length < 10) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (form.password !== form.confirm_password) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await sendRegisterOtp(form);
      setInfo(res.message);
      setStep('otp');
      setResendCooldown(30);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send verification OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await verifyRegisterOtp(form.email, otp);
      navigate('/student');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    setError('');
    setLoading(true);
    try {
      const res = await sendRegisterOtp(form);
      setInfo(res.message);
      setResendCooldown(30);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resend OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleCredential = async (credential: string) => {
    setError('');
    setInfo('');
    setLoading(true);
    try {
      const res = await loginWithGoogle(credential);
      if (res.needsProfileCompletion && res.pendingToken && res.profile) {
        setGooglePendingToken(res.pendingToken);
        setGoogleEmail(res.profile.email);
        setForm((prev) => ({
          ...prev,
          full_name: res.profile?.full_name || prev.full_name,
          email: res.profile?.email || prev.email,
        }));
        setStep('google_profile');
      } else if (res.user) {
        if (res.user.role === 'admin') navigate('/admin');
        else if (res.user.role === 'faculty') navigate('/faculty');
        else navigate('/student');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google sign-up failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteGoogleProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (form.full_name.trim().length < 2) {
      setError('Please enter your full name.');
      return;
    }
    if (form.mobile.replace(/\D/g, '').length < 10) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }
    if (form.password && form.password.length < 6) {
      setError('Password must be at least 6 characters (or leave blank).');
      return;
    }
    setLoading(true);
    try {
      await completeGoogleProfile({
        pendingToken: googlePendingToken,
        full_name: form.full_name.trim(),
        mobile: form.mobile,
        password: form.password || undefined,
        referral_code: form.referral_code || undefined,
      });
      navigate('/student');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not complete registration.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PublicLayout>
      <section className="min-h-[calc(100vh-140px)] flex items-center justify-center py-10 px-4 bg-gradient-to-b from-blue-50/70 to-slate-50">
        <div className="w-full max-w-lg bg-white rounded-3xl shadow-xl border border-slate-200/90 p-6 sm:p-8">
          <div className="flex justify-center mb-4">
            <BrandLogo />
          </div>

          <div className="text-center mb-6">
            <h1 className="font-display font-extrabold text-2xl text-[#002B7A]">
              {step === 'otp'
                ? 'Verify Your Email'
                : step === 'google_profile'
                ? 'Complete Your Profile'
                : 'Create Your Student Account'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              {step === 'otp'
                ? `Enter the 6-digit verification code sent to ${form.email}`
                : step === 'google_profile'
                ? 'Your Google email is verified. Add your remaining details to finish signup.'
                : 'Join 10,000+ learners preparing for careers and competitive exams.'}
            </p>
          </div>

          {info && (
            <div className="mb-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-700">
              {info}
            </div>
          )}
          {error && (
            <div className="mb-4 p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-700">
              {error}
            </div>
          )}

          {step === 'form' && (
            <>
              <div className="mb-4">
                <GoogleSignInButton
                  mode="signup"
                  onCredential={handleGoogleCredential}
                  onError={setError}
                />
              </div>

              <div className="relative my-5">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-white px-3 text-slate-400 font-semibold">or sign up with email</span>
                </div>
              </div>

              <form onSubmit={handleSendOtp} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Full Name *</label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={form.full_name}
                      onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                      placeholder="Enter your full name"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm outline-none focus:border-[#0052CC]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Mobile Number *</label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="tel"
                        required
                        value={form.mobile}
                        onChange={(e) => setForm({ ...form, mobile: e.target.value })}
                        placeholder="10-digit mobile"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm outline-none focus:border-[#0052CC]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Email Address *</label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        required
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        placeholder="you@example.com"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm outline-none focus:border-[#0052CC]"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Password *</label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="password"
                        required
                        minLength={6}
                        value={form.password}
                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                        placeholder="Min 6 characters"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm outline-none focus:border-[#0052CC]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Confirm Password *</label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="password"
                        required
                        value={form.confirm_password}
                        onChange={(e) => setForm({ ...form, confirm_password: e.target.value })}
                        placeholder="Re-enter password"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm outline-none focus:border-[#0052CC]"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Referral Code <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <div className="relative">
                    <Gift className="w-4 h-4 text-[#FF7A00] absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={form.referral_code}
                      onChange={(e) => setForm({ ...form, referral_code: e.target.value.toUpperCase() })}
                      placeholder="e.g. OLR-AARAV26"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm outline-none focus:border-[#0052CC]"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 rounded-xl bg-[#FF7A00] hover:bg-[#E66D00] text-white font-bold text-sm shadow-lg shadow-orange-500/25 transition cursor-pointer disabled:opacity-60 mt-2"
                >
                  {loading ? 'Sending Verification OTP…' : 'Send OTP & Continue'}
                </button>
              </form>
            </>
          )}

          {step === 'otp' && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">6-Digit Email OTP *</label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    inputMode="numeric"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="Enter 6-digit OTP"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 text-base font-bold tracking-[0.35em] text-center outline-none focus:border-[#0052CC]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="w-full py-3.5 rounded-xl bg-[#FF7A00] hover:bg-[#E66D00] text-white font-bold text-sm shadow-lg shadow-orange-500/25 transition cursor-pointer disabled:opacity-60"
              >
                {loading ? 'Verifying…' : 'Verify OTP & Create Account'}
              </button>

              <div className="flex items-center justify-between text-xs pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setStep('form');
                    setOtp('');
                    setError('');
                  }}
                  className="inline-flex items-center gap-1 font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Edit Details
                </button>
                <button
                  type="button"
                  disabled={resendCooldown > 0 || loading}
                  onClick={handleResendOtp}
                  className="font-bold text-[#0052CC] hover:underline disabled:text-slate-400 disabled:no-underline cursor-pointer"
                >
                  {resendCooldown > 0 ? `Resend OTP in ${resendCooldown}s` : 'Resend OTP'}
                </button>
              </div>
            </form>
          )}

          {step === 'google_profile' && (
            <form onSubmit={handleCompleteGoogleProfile} className="space-y-3.5">
              <div className="flex items-center gap-2 p-3 rounded-xl bg-blue-50 border border-blue-200 text-xs text-[#002B7A]">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  Verified Google Email: <strong>{googleEmail}</strong>
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Full Name *</label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={form.full_name}
                    onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                    placeholder="Enter your full name"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm outline-none focus:border-[#0052CC]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Mobile Number *</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    required
                    value={form.mobile}
                    onChange={(e) => setForm({ ...form, mobile: e.target.value })}
                    placeholder="10-digit mobile number"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm outline-none focus:border-[#0052CC]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Password <span className="text-slate-400 font-normal">(Optional — for email login)</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder="Min 6 characters (optional)"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm outline-none focus:border-[#0052CC]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Referral Code <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <div className="relative">
                  <Gift className="w-4 h-4 text-[#FF7A00] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={form.referral_code}
                    onChange={(e) => setForm({ ...form, referral_code: e.target.value.toUpperCase() })}
                    placeholder="e.g. OLR-AARAV26"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm outline-none focus:border-[#0052CC]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl bg-[#FF7A00] hover:bg-[#E66D00] text-white font-bold text-sm shadow-lg shadow-orange-500/25 transition cursor-pointer disabled:opacity-60 mt-2"
              >
                {loading ? 'Saving Details…' : 'Complete Registration & Start Learning'}
              </button>
            </form>
          )}

          <p className="text-center text-xs text-slate-600 mt-5">
            Already have an account?{' '}
            <Link to="/login" className="font-bold text-[#0052CC] hover:underline">
              Login Here
            </Link>
          </p>
        </div>
      </section>
    </PublicLayout>
  );
}
