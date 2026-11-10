import { Award, CheckCircle2, Download, Printer } from 'lucide-react';
import type { Certificate } from '../types';
import { BrandLogo } from './BrandLogo';

export function CertificateView({
  certificate,
  onClose,
}: {
  certificate: Certificate;
  onClose?: () => void;
}) {
  const formattedDate = new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(certificate.issued_at));

  const handleDownloadTextOrPrint = () => {
    window.print();
  };

  return (
    <div className="space-y-4">
      <div
        id="certificate-print-area"
        className="relative bg-white rounded-3xl border-[6px] border-[#0052CC] p-5 sm:p-10 shadow-xl overflow-hidden"
      >
        {/* Inner decorative border */}
        <div className="border-2 border-[#FF7A00]/60 rounded-2xl p-5 sm:p-8 relative">
          {/* Corner accents */}
          <div className="absolute top-0 right-0 w-28 h-28 bg-gradient-to-bl from-[#0052CC]/10 to-transparent rounded-bl-full pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-28 h-28 bg-gradient-to-tr from-[#FF7A00]/15 to-transparent rounded-tr-full pointer-events-none" />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
            <BrandLogo to="#" />
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold self-start sm:self-auto">
              <CheckCircle2 className="w-4 h-4" />
              {certificate.status === 'valid' ? 'VERIFIED CERTIFICATE' : 'REVOKED'}
            </div>
          </div>

          <div className="text-center py-6 sm:py-8">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#FF7A00]">
              Certificate of Completion
            </p>
            <p className="text-sm text-slate-500 mt-3">This is proudly presented to</p>
            <h2 className="font-display font-extrabold text-2xl sm:text-4xl text-[#002B7A] mt-2">
              {certificate.student_name}
            </h2>
            <p className="text-sm sm:text-base text-slate-600 mt-4 max-w-xl mx-auto leading-relaxed">
              for successfully completing all required modules, assessments, and practical lessons of the program
            </p>
            <h3 className="font-display font-bold text-xl sm:text-2xl text-[#0052CC] mt-3">
              {certificate.course_title}
            </h3>
            <p className="text-xs text-slate-500 mt-2">
              Issued by O-LEARNING PLATFORM · Hyderabad, Telangana, India
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 pt-6 border-t border-slate-200 items-end text-center sm:text-left">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Date of Issue</p>
              <p className="text-sm font-bold text-slate-800 mt-0.5">{formattedDate}</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#FF7A00] to-[#FFB020] text-white flex items-center justify-center shadow-md mb-1">
                <Award className="w-6 h-6" />
              </div>
              <p className="text-[11px] font-mono font-bold text-slate-700">{certificate.certificate_code}</p>
            </div>
            <div className="sm:text-right">
              <p className="font-display italic font-bold text-base text-[#00338D]">
                Director, Academic Board
              </p>
              <div className="h-px bg-slate-300 w-36 sm:ml-auto mx-auto my-1" />
              <p className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                Authorized Signature
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-3 print:hidden">
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-sm font-semibold hover:bg-slate-50 cursor-pointer"
          >
            Close
          </button>
        )}
        <button
          type="button"
          onClick={handleDownloadTextOrPrint}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0052CC] text-white text-sm font-bold hover:bg-[#003EB3] shadow-sm cursor-pointer"
        >
          <Printer className="w-4 h-4" /> Print / Save as PDF
        </button>
        <button
          type="button"
          onClick={handleDownloadTextOrPrint}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#FF7A00] text-white text-sm font-bold hover:bg-[#E66D00] shadow-sm cursor-pointer"
        >
          <Download className="w-4 h-4" /> Download Certificate
        </button>
      </div>
    </div>
  );
}
