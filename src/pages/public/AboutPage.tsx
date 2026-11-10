import { useEffect, useState } from 'react';
import { CheckCircle2, Compass, HeartHandshake, Target } from 'lucide-react';
import { PublicLayout } from '../../components/PublicLayout';
import { useSite } from '../../context/SiteContext';
import { api } from '../../lib/api';

interface FacultyMember {
  id: number;
  full_name: string;
  title: string;
  bio: string;
  specialization: string;
  experience_years: number;
  qualifications: string;
}

export function AboutPage() {
  const { cms } = useSite();
  const [faculty, setFaculty] = useState<FacultyMember[]>([]);

  useEffect(() => {
    api<FacultyMember[]>('/api/public/faculty').then(setFaculty).catch(() => {});
  }, []);

  return (
    <PublicLayout>
      <section className="bg-gradient-to-r from-[#00338D] to-[#0052CC] text-white py-12 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          <div>
            <span className="px-3 py-1 rounded-full bg-white/15 text-orange-300 text-xs font-bold">
              ESTABLISHED {cms.brand.foundedYear} · {cms.brand.location}
            </span>
            <h1 className="font-display font-extrabold text-3xl sm:text-4xl mt-3">
              About {cms.brand.name}
            </h1>
            <p className="text-sm sm:text-base text-blue-100 mt-3 leading-relaxed">
              {cms.brand.tagline} — {cms.brand.supportingTagline} We empower learners across India with accessible, practical, and mentor-led digital education.
            </p>
          </div>
          <div className="rounded-3xl overflow-hidden shadow-2xl border border-white/20">
            <img
              src={cms.about.imageUrl || '/images/about-campus.svg'}
              alt="O-Learning Platform Hyderabad Online Studio"
              className="w-full h-auto object-cover"
            />
          </div>
        </div>
      </section>

      {/* Vision & Mission */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-3xl p-7 border border-slate-200 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#0052CC] flex items-center justify-center mb-4">
            <Compass className="w-6 h-6" />
          </div>
          <h2 className="font-display font-extrabold text-2xl text-[#002B7A]">Our Vision</h2>
          <p className="text-sm sm:text-base text-slate-600 mt-3 leading-relaxed">{cms.about.vision}</p>
        </div>

        <div className="bg-white rounded-3xl p-7 border border-slate-200 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-orange-50 text-[#FF7A00] flex items-center justify-center mb-4">
            <Target className="w-6 h-6" />
          </div>
          <h2 className="font-display font-extrabold text-2xl text-[#002B7A]">Our Mission</h2>
          <p className="text-sm sm:text-base text-slate-600 mt-3 leading-relaxed">{cms.about.mission}</p>
        </div>
      </section>

      {/* Core Values */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <div className="bg-white rounded-3xl p-7 sm:p-9 border border-slate-200 shadow-xs">
          <div className="flex items-center gap-3 mb-6">
            <HeartHandshake className="w-7 h-7 text-[#FF7A00]" />
            <h2 className="font-display font-extrabold text-2xl text-[#002B7A]">Our Core Values</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {cms.about.coreValues.map((val) => (
              <div
                key={val}
                className="flex items-center gap-2.5 p-4 rounded-2xl bg-slate-50 border border-slate-200/70"
              >
                <CheckCircle2 className="w-5 h-5 text-[#0052CC] shrink-0" />
                <span className="text-sm font-bold text-slate-800">{val}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Faculty Showcase */}
      {faculty.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-14">
          <h2 className="font-display font-extrabold text-2xl sm:text-3xl text-[#002B7A] mb-6">
            Meet Our Expert Faculty
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {faculty.map((f) => (
              <div
                key={f.id}
                className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col"
              >
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#0052CC] to-[#0B6FF4] text-white font-display font-extrabold text-xl flex items-center justify-center mb-4">
                  {f.full_name.charAt(0)}
                </div>
                <h3 className="font-display font-bold text-base text-[#0F172A]">{f.full_name}</h3>
                <p className="text-xs font-semibold text-[#FF7A00] mt-0.5">{f.title}</p>
                <p className="text-xs text-slate-600 mt-3 flex-1 leading-relaxed">{f.bio}</p>
                <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] font-semibold text-slate-500">
                  {f.qualifications} · {f.experience_years}+ Yrs Exp
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </PublicLayout>
  );
}
