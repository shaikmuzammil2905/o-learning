import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Award, Eye } from 'lucide-react';
import { DashboardLayout, STUDENT_LINKS } from '../../components/DashboardLayout';
import { CertificateView } from '../../components/CertificateView';
import { EmptyState, LoadingState } from '../../components/ui/StateViews';
import { api } from '../../lib/api';
import type { Certificate } from '../../types';

export function CertificatesPage() {
  const [certs, setCerts] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Certificate | null>(null);

  useEffect(() => {
    api<Certificate[]>('/api/student/certificates')
      .then((data) => {
        setCerts(data);
        if (data.length > 0) setSelected(data[0]);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <DashboardLayout
      title="My Certificates"
      subtitle="Official course completion certificates issued by O-LEARNING PLATFORM"
      links={STUDENT_LINKS}
    >
      {loading ? (
        <LoadingState message="Loading your certificates…" />
      ) : certs.length === 0 ? (
        <EmptyState
          title="No certificates earned yet"
          description="Complete 100% of modules in any enrolled course to unlock your verified certificate."
          icon={<Award className="w-7 h-7" />}
          action={
            <Link to="/student/courses" className="px-5 py-2.5 rounded-xl bg-[#0052CC] text-white text-xs font-bold">
              Go to My Courses
            </Link>
          }
        />
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {certs.map((c) => (
              <div
                key={c.id}
                className={`bg-white rounded-2xl p-5 border shadow-xs cursor-pointer transition ${
                  selected?.id === c.id ? 'border-[#0052CC] ring-2 ring-blue-100' : 'border-slate-200'
                }`}
                onClick={() => setSelected(c)}
              >
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold uppercase">
                    {c.status}
                  </span>
                  <span className="font-mono text-[11px] text-slate-500">{c.certificate_code}</span>
                </div>
                <h3 className="font-display font-bold text-base text-slate-900 mt-3">{c.course_title}</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Issued {new Date(c.issued_at).toLocaleDateString('en-IN')}
                </p>
                <button
                  type="button"
                  onClick={() => setSelected(c)}
                  className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-[#0052CC]"
                >
                  <Eye className="w-4 h-4" /> View & Download
                </button>
              </div>
            ))}
          </div>

          {selected && <CertificateView certificate={selected} />}
        </div>
      )}
    </DashboardLayout>
  );
}

