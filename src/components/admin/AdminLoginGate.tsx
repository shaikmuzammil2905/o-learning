import { useState } from 'react';
import { Lock, Mail, ShieldCheck } from 'lucide-react';
import { BrandLogo } from '../BrandLogo';
import { useAuth } from '../../context/AuthContext';

export function AdminLoginGate() {
  const { login, logout } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(identifier, password, true);
      if (user.role !== 'admin') {
        await logout();
        setError('This account does not have Admin access.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Admin login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4 py-10">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-7 shadow-2xl text-slate-100">
        <div className="flex justify-center mb-5">
          <BrandLogo />
        </div>
        <div className="text-center mb-6">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/15 text-[#FF7A00] text-xs font-bold mb-2">
            <ShieldCheck className="w-3.5 h-3.5" /> Admin Portal
          </span>
          <h1 className="font-display font-extrabold text-2xl text-white">Admin Sign In</h1>
          <p className="text-xs text-slate-400 mt-1">
            Sign in with your administrator credentials to manage O-Learning Platform.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-xs font-semibold text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">Admin Email or Mobile</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="admin@olearning.in"
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white outline-none focus:border-[#FF7A00]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter admin password"
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white outline-none focus:border-[#FF7A00]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-[#FF7A00] hover:bg-[#E66D00] text-white font-bold text-sm shadow-lg shadow-orange-500/20 transition cursor-pointer disabled:opacity-60"
          >
            {loading ? 'Signing in…' : 'Sign In to Admin Panel'}
          </button>
        </form>
      </div>
    </div>
  );
}
