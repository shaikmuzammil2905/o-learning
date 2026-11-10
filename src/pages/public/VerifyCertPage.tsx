import { useState } from 'react';
import { Award, Search, ShieldAlert } from 'lucide-react';
import { PublicLayout } from '../../components/PublicLayout';
import { CertificateView } from '../../components/CertificateView';
import { api } from '../../lib/api';
import type { Certificate } from '../../types';

export function VerifyCertPage() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [cert, setCert] = useState<Certificate | null>(null);
  const [error, setError] = useState('');

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setLoading(true);
    setError('');
    setCert(null);
    try {
      const data = await api<Certificate>(`/api/public/certificates/verify/${encodeURIComponent(code.trim())}`);
      setCert(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Certificate not found.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PublicLayout>
      <section className="bg-gradient-to-r from-[#00338D] to-[#0052CC] text-white py-10 sm:py-14">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center mx-auto mb-3">
            <Award className="w-6 h-6 text-[#FF9B3D]" />
          </div>
          <h1 className="font-display font-extrabold text-2xl sm:text-4xl">
            Verify Certificate Authenticity
          </h1>
          <p className="text-sm text-blue-100 mt-2">
            Enter an official O-LEARNING PLATFORM Certificate ID (e.g. OLR-CERT-2026-...) to verify completion records.
          </p>

          <form onSubmit={handleVerify} className="mt-6 max-w-xl mx-auto flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Enter Certificate ID…"
                className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-white text-slate-900 text-sm outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3.5 rounded-xl bg-[#FF7A00] hover:bg-[#E66D00] text-white font-bold text-sm cursor-pointer disabled:opacity-60"
            >
              {loading ? 'Verifying…' : 'Verify ID'}
            </button>
          </form>
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-4 py-10">
        {error && (
          <div className="flex items-center gap-3 p-5 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-sm font-semibold">
            <ShieldAlert className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {cert && <CertificateView certificate={cert} />}
      </section>
    </PublicLayout>
  );
}
