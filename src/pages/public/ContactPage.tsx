import { useState } from 'react';
import { CheckCircle2, Mail, MapPin, MessageCircle, Phone, Send } from 'lucide-react';
import { PublicLayout } from '../../components/PublicLayout';
import { useSite } from '../../context/SiteContext';
import { api } from '../../lib/api';

export function ContactPage() {
  const { cms } = useSite();
  const [form, setForm] = useState({ name: '', email: '', mobile: '', subject: 'Course Enquiry', message: '' });
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const whatsappNum = cms.contact.whatsapp.replace(/\D/g, '') || '9121403515';
  const whatsappUrl = `https://wa.me/91${whatsappNum}?text=${encodeURIComponent(
    'Hello, I would like to know more about O-Learning Platform courses.'
  )}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSuccessMsg('');
    setErrorMsg('');
    try {
      const res = await api<{ message: string }>('/api/public/contact', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      setSuccessMsg(res.message);
      setForm({ name: '', email: '', mobile: '', subject: 'Course Enquiry', message: '' });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to submit enquiry.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PublicLayout>
      <section className="bg-gradient-to-r from-[#00338D] to-[#0052CC] text-white py-10 sm:py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="font-display font-extrabold text-2xl sm:text-4xl">Contact & Student Support</h1>
          <p className="text-sm sm:text-base text-blue-100 mt-2">
            Reach our Hyderabad academic counselors by phone, WhatsApp, email, or submit an enquiry below.
          </p>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Contact Cards */}
        <div className="lg:col-span-5 space-y-4">
          <a
            href={`tel:${cms.contact.phone}`}
            className="flex items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-[#0052CC] transition"
          >
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-[#0052CC] flex items-center justify-center shrink-0">
              <Phone className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase">Call Us</p>
              <p className="font-display font-bold text-lg text-[#0F172A]">{cms.contact.phone}</p>
            </div>
          </a>

          <a
            href={whatsappUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-emerald-500 transition"
          >
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <MessageCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase">WhatsApp Support</p>
              <p className="font-display font-bold text-lg text-[#0F172A]">{cms.contact.whatsapp}</p>
            </div>
          </a>

          <a
            href={`mailto:${cms.contact.email}`}
            className="flex items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-[#FF7A00] transition"
          >
            <div className="w-12 h-12 rounded-xl bg-orange-50 text-[#FF7A00] flex items-center justify-center shrink-0">
              <Mail className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-400 uppercase">Email Us</p>
              <p className="font-display font-bold text-base text-[#0F172A] break-all">{cms.contact.email}</p>
            </div>
          </a>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-[#0052CC] shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase">Office Location</p>
                <p className="text-sm font-semibold text-slate-800 mt-0.5">{cms.contact.location}</p>
                <p className="text-xs text-slate-500 mt-0.5">{cms.contact.address}</p>
              </div>
            </div>
            <div className="rounded-xl overflow-hidden border border-slate-200 h-44 bg-blue-50">
              <iframe
                title="Hyderabad Location Map"
                src="https://www.openstreetmap.org/export/embed.html?bbox=78.34%2C17.38%2C78.52%2C17.48&layer=mapnik"
                className="w-full h-full border-0"
                loading="lazy"
              />
            </div>
          </div>
        </div>

        {/* Right Contact Form */}
        <div className="lg:col-span-7">
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-5"
          >
            <h2 className="font-display font-extrabold text-2xl text-[#002B7A]">
              Send an Enquiry
            </h2>

            {successMsg && (
              <div className="flex items-start gap-2.5 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-800">
                <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
                <span>{successMsg}</span>
              </div>
            )}
            {errorMsg && (
              <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-sm text-red-700">
                {errorMsg}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Full Name *</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Your full name"
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 text-sm outline-none focus:border-[#0052CC]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Mobile Number *</label>
                <input
                  type="tel"
                  required
                  value={form.mobile}
                  onChange={(e) => setForm({ ...form, mobile: e.target.value })}
                  placeholder="10-digit mobile number"
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 text-sm outline-none focus:border-[#0052CC]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Email Address *</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="you@example.com"
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 text-sm outline-none focus:border-[#0052CC]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Enquiry Topic</label>
                <select
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 text-sm outline-none bg-white"
                >
                  <option>Course Enquiry</option>
                  <option>Batch Timings</option>
                  <option>Subscription Plans</option>
                  <option>Technical Support</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Message *</label>
              <textarea
                rows={4}
                required
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                placeholder="Tell us which course or exam you are preparing for…"
                className="w-full px-4 py-3 rounded-xl border border-slate-300 text-sm outline-none focus:border-[#0052CC]"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-[#FF7A00] hover:bg-[#E66D00] text-white font-bold text-sm shadow-lg shadow-orange-500/20 transition cursor-pointer disabled:opacity-60"
            >
              <Send className="w-4 h-4" />
              {submitting ? 'Submitting…' : 'Submit Enquiry'}
            </button>
          </form>
        </div>
      </section>
    </PublicLayout>
  );
}
