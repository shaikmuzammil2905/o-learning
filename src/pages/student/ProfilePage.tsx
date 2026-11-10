import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Award, CheckCircle2, CreditCard, Gift, HelpCircle, LogOut, Save } from 'lucide-react';
import { DashboardLayout, STUDENT_LINKS } from '../../components/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';

export function ProfilePage() {
  const { user, setUser, logout } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState(user?.full_name || '');
  const [mobile, setMobile] = useState(user?.mobile || '');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [pwMsg, setPwMsg] = useState('');
  const [pwErr, setPwErr] = useState('');

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg('');
    setErr('');
    try {
      const res = await api<{ user: NonNullable<typeof user> }>('/api/auth/profile', {
        method: 'PUT',
        body: JSON.stringify({ full_name: fullName, mobile }),
      });
      setUser(res.user);
      setMsg('Profile updated successfully!');
    } catch (error) {
      setErr(error instanceof Error ? error.message : 'Unable to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwMsg('');
    setPwErr('');
    try {
      const res = await api<{ message: string }>('/api/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
      });
      setPwMsg(res.message);
      setCurrentPassword('');
      setNewPassword('');
    } catch (error) {
      setPwErr(error instanceof Error ? error.message : 'Unable to change password.');
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <DashboardLayout
      title="Profile & Settings"
      subtitle="Manage your personal information, password, and student shortcuts"
      links={STUDENT_LINKS}
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Profile Card & Shortcuts */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white rounded-3xl p-6 border border-slate-200 text-center shadow-xs">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#0052CC] to-[#0B6FF4] text-white font-display font-extrabold text-3xl flex items-center justify-center mx-auto shadow-md">
              {user?.full_name?.charAt(0).toUpperCase()}
            </div>
            <h2 className="font-display font-bold text-xl text-slate-900 mt-4">{user?.full_name}</h2>
            <p className="text-xs text-slate-500 mt-0.5">{user?.email}</p>
            <p className="text-xs font-semibold text-[#0052CC] mt-1">{user?.mobile}</p>
            <div className="mt-3 inline-block px-3 py-1 rounded-full bg-orange-50 text-[#FF7A00] font-mono text-xs font-bold">
              Code: {user?.referral_code}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 overflow-hidden shadow-xs">
            {[
              { to: '/student/payments', label: 'My Orders & Payments', icon: CreditCard },
              { to: '/student/certificates', label: 'My Certificates', icon: Award },
              { to: '/student/referrals', label: 'Refer & Earn', icon: Gift },
              { to: '/contact', label: 'Help & Support', icon: HelpCircle },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className="flex items-center gap-3 px-5 py-3.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <Icon className="w-4 h-4 text-[#0052CC]" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-5 py-3.5 text-sm font-bold text-red-600 hover:bg-red-50 cursor-pointer"
            >
              <LogOut className="w-4 h-4" /> Logout
            </button>
          </div>
        </div>

        {/* Edit Profile & Password Forms */}
        <div className="lg:col-span-8 space-y-6">
          <form
            onSubmit={handleSaveProfile}
            className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4"
          >
            <h3 className="font-display font-bold text-lg text-[#002B7A]">Edit Profile Details</h3>
            {msg && (
              <p className="p-3 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" /> {msg}
              </p>
            )}
            {err && <p className="p-3 rounded-xl bg-red-50 text-red-700 text-xs font-semibold">{err}</p>}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm outline-none focus:border-[#0052CC]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Mobile Number</label>
                <input
                  type="tel"
                  required
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm outline-none focus:border-[#0052CC]"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
              <input
                type="email"
                disabled
                value={user?.email || ''}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-500"
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#0052CC] text-white text-sm font-bold cursor-pointer"
            >
              <Save className="w-4 h-4" /> {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </form>

          <form
            onSubmit={handlePasswordChange}
            className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4"
          >
            <h3 className="font-display font-bold text-lg text-[#002B7A]">Security & Password</h3>
            {pwMsg && <p className="p-3 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-semibold">{pwMsg}</p>}
            {pwErr && <p className="p-3 rounded-xl bg-red-50 text-red-700 text-xs font-semibold">{pwErr}</p>}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Current Password"
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-sm outline-none"
              />
              <input
                type="password"
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="New Password (min 6 chars)"
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-sm outline-none"
              />
            </div>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-[#FF7A00] text-white text-sm font-bold cursor-pointer"
            >
              Update Password
            </button>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}
