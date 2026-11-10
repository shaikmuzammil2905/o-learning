import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Compass, HeartHandshake, Sparkles, Target, X } from 'lucide-react';
import { PublicLayout } from '../../components/PublicLayout';
import { RevealOnScroll } from '../../components/ui/Animations';
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

const VALUE_DETAILS: Record<string, string> = {
  'Quality Education': 'Every lesson is structured by experienced educators with clear concepts, examples, and assessments.',
  'Affordable Learning': 'Fair pricing and free foundation modules ensure financial constraints never block career growth.',
  'Student Success': 'Weekly progress tracking, mock exams, and mentor feedback keep every learner moving forward.',
  'Practical Knowledge': 'Hands-on coding, speaking drills, and real exam simulations rather than rote memorization.',
  'Innovation & Technology': 'Modern interactive LMS, live virtual classrooms, and instant analytics across desktop and mobile.',
  'Transparency and Trust': 'Clear course curricula, transparent pricing, and verifiable completion certificates.',
  'Continuous Improvement': 'Regular syllabus updates aligned to 2026 exam patterns and industry hiring requirements.',
};

export function AboutPage() {
  const { cms } = useSite();
  const [faculty, setFaculty] = useState<FacultyMember[]>([]);
  const [infoPopup, setInfoPopup] = useState<{ title: string; subtitle: string; body: string } | null>(null);
  const [facultyPopup, setFacultyPopup] = useState<FacultyMember | null>(null);

  useEffect(() => {
    api<FacultyMember[]>('/api/public/faculty').then(setFaculty).catch(() => {});
  }, []);

  return (
    <PublicLayout>
      <section className="bg-gradient-to-r from-[#00338D] to-[#0052CC] text-white py-12 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          <RevealOnScroll>
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
          </RevealOnScroll>
          <RevealOnScroll delay={120}>
            <div className="rounded-3xl overflow-hidden shadow-2xl border border-white/20 hover:scale-[1.02] transition-transform duration-300">
              <img
                src={cms.about.imageUrl || '/images/about-campus.svg'}
                alt="O-Learning Platform Hyderabad Online Studio"
                className="w-full h-auto object-cover"
              />
            </div>
          </RevealOnScroll>
        </div>
      </section>

      {/* Vision & Mission with Scroll Animations + Popups */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 grid grid-cols-1 md:grid-cols-2 gap-6">
        <RevealOnScroll>
          <button
            type="button"
            onClick={() =>
              setInfoPopup({
                title: 'Our Vision',
                subtitle: 'O-LEARNING PLATFORM · India 2026',
                body: cms.about.vision,
              })
            }
            className="w-full text-left bg-white rounded-3xl p-7 border border-slate-200 shadow-xs hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 cursor-pointer h-full"
          >
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#0052CC] flex items-center justify-center mb-4">
              <Compass className="w-6 h-6" />
            </div>
            <h2 className="font-display font-extrabold text-2xl text-[#002B7A]">Our Vision</h2>
            <p className="text-sm sm:text-base text-slate-600 mt-3 leading-relaxed">{cms.about.vision}</p>
          </button>
        </RevealOnScroll>

        <RevealOnScroll delay={100}>
          <button
            type="button"
            onClick={() =>
              setInfoPopup({
                title: 'Our Mission',
                subtitle: 'Accessible & Practical Education',
                body: cms.about.mission,
              })
            }
            className="w-full text-left bg-white rounded-3xl p-7 border border-slate-200 shadow-xs hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 cursor-pointer h-full"
          >
            <div className="w-12 h-12 rounded-2xl bg-orange-50 text-[#FF7A00] flex items-center justify-center mb-4">
              <Target className="w-6 h-6" />
            </div>
            <h2 className="font-display font-extrabold text-2xl text-[#002B7A]">Our Mission</h2>
            <p className="text-sm sm:text-base text-slate-600 mt-3 leading-relaxed">{cms.about.mission}</p>
          </button>
        </RevealOnScroll>
      </section>

      {/* Core Values with Scroll Animations + Interactive Popups */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <RevealOnScroll>
          <div className="bg-white rounded-3xl p-7 sm:p-9 border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between flex-wrap gap-2 mb-6">
              <div className="flex items-center gap-3">
                <HeartHandshake className="w-7 h-7 text-[#FF7A00]" />
                <h2 className="font-display font-extrabold text-2xl text-[#002B7A]">Our Core Values</h2>
              </div>
              <span className="text-xs text-slate-500">Click any value to explore</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {cms.about.coreValues.map((val, idx) => (
                <RevealOnScroll key={val} delay={idx * 45}>
                  <button
                    type="button"
                    onClick={() =>
                      setInfoPopup({
                        title: val,
                        subtitle: 'O-LEARNING PLATFORM Core Value',
                        body:
                          VALUE_DETAILS[val] ||
                          `${val} is central to how we design courses, mentor learners, and deliver results.`,
                      })
                    }
                    className="w-full flex items-center gap-2.5 p-4 rounded-2xl bg-slate-50 hover:bg-blue-50 border border-slate-200/70 hover:border-[#0052CC] hover:-translate-y-1 transition-all duration-200 cursor-pointer text-left"
                  >
                    <CheckCircle2 className="w-5 h-5 text-[#0052CC] shrink-0" />
                    <span className="text-sm font-bold text-slate-800">{val}</span>
                  </button>
                </RevealOnScroll>
              ))}
            </div>
          </div>
        </RevealOnScroll>
      </section>

      {/* Faculty Showcase with Scroll Animations + Bio Popups */}
      {faculty.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-14">
          <h2 className="font-display font-extrabold text-2xl sm:text-3xl text-[#002B7A] mb-6">
            Meet Our Expert Faculty
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {faculty.map((f, idx) => (
              <RevealOnScroll key={f.id} delay={idx * 80}>
                <button
                  type="button"
                  onClick={() => setFacultyPopup(f)}
                  className="w-full text-left bg-white rounded-2xl p-6 border border-slate-200 shadow-xs hover:shadow-2xl hover:-translate-y-1.5 transition-all duration-300 flex flex-col h-full cursor-pointer"
                >
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#0052CC] to-[#0B6FF4] text-white font-display font-extrabold text-xl flex items-center justify-center mb-4 shadow-md">
                    {f.full_name.charAt(0)}
                  </div>
                  <h3 className="font-display font-bold text-base text-[#0F172A]">{f.full_name}</h3>
                  <p className="text-xs font-semibold text-[#FF7A00] mt-0.5">{f.title}</p>
                  <p className="text-xs text-slate-600 mt-3 flex-1 leading-relaxed">{f.bio}</p>
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-semibold text-slate-500">
                    <span>{f.qualifications} · {f.experience_years}+ Yrs</span>
                    <span className="text-[#0052CC] font-bold">Profile →</span>
                  </div>
                </button>
              </RevealOnScroll>
            ))}
          </div>
        </section>
      )}

      {/* Vision / Mission / Core Value Popup */}
      {infoPopup && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4"
          onClick={() => setInfoPopup(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-50 text-[#FF7A00] text-xs font-bold">
                <Sparkles className="w-3.5 h-3.5" /> {infoPopup.subtitle}
              </span>
              <button onClick={() => setInfoPopup(null)} className="p-1.5 rounded-full hover:bg-slate-100 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <h3 className="font-display font-extrabold text-2xl text-[#002B7A]">{infoPopup.title}</h3>
            <p className="text-sm text-slate-600 mt-3 leading-relaxed">{infoPopup.body}</p>
            <Link
              to="/courses"
              onClick={() => setInfoPopup(null)}
              className="mt-6 block w-full py-3 rounded-xl bg-[#0052CC] text-white text-center text-xs font-bold"
            >
              Explore Our Programs →
            </Link>
          </div>
        </div>
      )}

      {/* Faculty Profile Popup */}
      {facultyPopup && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4"
          onClick={() => setFacultyPopup(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#0052CC] to-[#0B6FF4] text-white font-display font-extrabold text-xl flex items-center justify-center">
                  {facultyPopup.full_name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-display font-extrabold text-lg text-[#002B7A]">{facultyPopup.full_name}</h3>
                  <p className="text-xs font-semibold text-[#FF7A00]">{facultyPopup.title}</p>
                </div>
              </div>
              <button onClick={() => setFacultyPopup(null)} className="p-1.5 rounded-full hover:bg-slate-100 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">{facultyPopup.bio}</p>
            <div className="mt-4 p-3.5 rounded-2xl bg-slate-50 text-xs space-y-1.5">
              <p><strong>Specialization:</strong> {facultyPopup.specialization}</p>
              <p><strong>Qualifications:</strong> {facultyPopup.qualifications}</p>
              <p><strong>Experience:</strong> {facultyPopup.experience_years}+ Years</p>
            </div>
            <Link
              to="/courses"
              onClick={() => setFacultyPopup(null)}
              className="mt-5 block w-full py-3 rounded-xl bg-[#FF7A00] text-white text-center text-xs font-bold"
            >
              Browse Courses by {facultyPopup.full_name.split(' ')[0]} →
            </Link>
          </div>
        </div>
      )}
    </PublicLayout>
  );
}
