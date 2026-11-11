import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Award,
  BookOpen,
  CheckCircle2,
  Compass,
  HeartHandshake,
  Sparkles,
  Target,
  Users,
  X,
} from 'lucide-react';
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

const VALUE_DETAILS: Record<
  string,
  { summary: string; points: string[]; impact: string }
> = {
  'Quality Education': {
    summary:
      'Every curriculum module is designed and reviewed by subject-matter specialists to build rock-solid fundamentals before moving to exam-level mastery.',
    points: [
      'Concept-first video lessons with real-world examples and visual breakdowns',
      'Structured module notes, formula sheets, and curated practice banks',
      'Regular syllabus updates aligned with 2026 competitive and tech standards',
    ],
    impact: '95% learner satisfaction across 8+ flagship programs.',
  },
  'Affordable Learning': {
    summary:
      'Quality mentorship should never be restricted by geography or high coaching fees. We price every program transparently for students across India.',
    points: [
      'Free Career Kickstart track with verified completion certificate',
      'Subscription bundles starting at ₹1,499 for multi-course access',
      'Zero hidden charges, instant enrollment, and transparent refund policies',
    ],
    impact: 'Up to 70% more affordable than traditional metro coaching.',
  },
  'Student Success': {
    summary:
      'Everything on O-LEARNING PLATFORM—from live doubt sessions to timed mock tests—is engineered around measurable student outcomes.',
    points: [
      'Automated lesson progress tracking with clear completion milestones',
      'Timed mock exams with accuracy percentages, rank calculation, and solutions',
      'Dedicated Hyderabad counselor & WhatsApp support for steady guidance',
    ],
    impact: '10,000+ active learners advancing toward jobs & top ranks.',
  },
  'Practical Knowledge': {
    summary:
      'We bridge the gap between textbook theory and real-world performance through coding labs, mock interviews, and daily fluency drills.',
    points: [
      'Live Spoken English practice rooms & accent-clarity workshops',
      'Hands-on Python, Java, SQL & Git projects for IT placements',
      'Simulated HR + technical interviews with actionable mentor feedback',
    ],
    impact: 'Job-ready portfolios and confident communication.',
  },
  'Innovation & Technology': {
    summary:
      'Built as a modern mobile-first EdTech ecosystem combining live classrooms, recorded streaming, analytics dashboards, and instant certification.',
    points: [
      'Seamless experience across desktop, tablet, and Android/iOS mobile views',
      'Instant auto-graded CBT mock tests with smart question navigation',
      'Real-time admin & faculty content updates synced live to learners',
    ],
    impact: 'Learn anywhere, anytime with zero friction.',
  },
  'Transparency and Trust': {
    summary:
      'Clear course curricula, upfront pricing, authentic faculty credentials, and publicly verifiable digital certificates form the backbone of our trust.',
    points: [
      'Preview free lessons and inspect full module syllabi before enrolling',
      'Tokenized secure payment checkout with instant order receipts',
      'Unique Certificate IDs verifiable online by any employer or institution',
    ],
    impact: '100% verifiable credentials and clear student commitments.',
  },
  'Continuous Improvement': {
    summary:
      'We actively listen to student reviews, test performance trends, and industry shifts to continuously sharpen our courses and platform.',
    points: [
      'Weekly question-bank additions and updated current affairs digests',
      'Direct learner course ratings & reviews driving curriculum upgrades',
      'Continuous faculty workshops and platform performance refinements',
    ],
    impact: 'Always aligned with latest 2026 exam & hiring patterns.',
  },
};

const VISION_MISSION_DETAILS = {
  vision: {
    title: 'Our Vision',
    subtitle: 'O-LEARNING PLATFORM · India 2026 & Beyond',
    points: [
      'Bridge the urban-rural education divide with high-speed, mobile-friendly digital learning.',
      'Empower 100,000+ Indian students across Spoken English, Govt Exams, JEE/NEET, UPSC & Tech.',
      'Combine affordable tuition with IIT/UPSC/industry-caliber mentorship from Hyderabad.',
      'Become India’s most trusted outcome-driven learning partner for students and job seekers.',
    ],
    metrics: [
      { label: 'Target Reach', value: 'Pan-India' },
      { label: 'Core Focus', value: 'Affordability' },
      { label: 'Hub', value: 'Hyderabad' },
    ],
  },
  mission: {
    title: 'Our Mission',
    subtitle: 'Simple · Accessible · Mentor-Led Learning',
    points: [
      'Deliver crystal-clear live interactive classes paired with 24/7 HD recorded revisions.',
      'Provide structured study materials, practice tests, and personalized doubt resolution.',
      'Equip learners with practical communication, analytical, and programming skills.',
      'Validate every milestone with transparent assessments and verifiable certificates.',
    ],
    metrics: [
      { label: 'Programs', value: '8+ Tracks' },
      { label: 'Faculty', value: '50+ Mentors' },
      { label: 'Satisfaction', value: '95%' },
    ],
  },
};

const FALLBACK_FACULTY: FacultyMember[] = [
  {
    id: 2,
    full_name: 'Dr. Ananya Sharma',
    title: 'Head of Communication & Spoken English',
    bio: 'Cambridge CELTA-certified communication coach who has mentored 12,000+ Indian learners in spoken English, pronunciation, and corporate readiness.',
    specialization: 'Spoken English, Interview & Career Skills',
    experience_years: 11,
    qualifications: 'Ph.D. English Literature, CELTA',
  },
  {
    id: 3,
    full_name: 'Prof. Vikram Reddy',
    title: 'Senior JEE/NEET & Quantitative Mentor',
    bio: 'Former Hyderabad IIT/NEET senior lecturer simplifying Physics, Mathematics, and Quantitative Aptitude with visual problem-solving methods.',
    specialization: 'JEE, NEET & Quantitative Aptitude',
    experience_years: 14,
    qualifications: 'M.Tech IIT Madras',
  },
  {
    id: 4,
    full_name: 'Rahul Deshmukh',
    title: 'Principal Software Engineering Instructor',
    bio: '10+ years building scalable cloud and Java/Python systems in Hyderabad tech parks; passionate about turning beginners into job-ready engineers.',
    specialization: 'Python, Java, DSA & IT Interviews',
    experience_years: 10,
    qualifications: 'B.Tech CSE, Ex-Senior SDE',
  },
  {
    id: 5,
    full_name: 'Meera Krishnan (IAS Retd. Mentor)',
    title: 'UPSC & Competitive Exams Director',
    bio: 'Renowned GS & Current Affairs mentor guiding aspirants across Telangana and India for UPSC CSE, SSC CGL, Banking, and State PSC.',
    specialization: 'UPSC CSE, Polity, Economy & Govt Exams',
    experience_years: 15,
    qualifications: 'M.A. Public Administration',
  },
];

export function AboutPage() {
  const { cms } = useSite();
  const [faculty, setFaculty] = useState<FacultyMember[]>(FALLBACK_FACULTY);
  const [infoPopup, setInfoPopup] = useState<{
    title: string;
    subtitle: string;
    body: string;
    points: string[];
    metrics?: Array<{ label: string; value: string }>;
  } | null>(null);
  const [facultyPopup, setFacultyPopup] = useState<FacultyMember | null>(null);

  useEffect(() => {
    api<FacultyMember[]>('/api/public/faculty')
      .then((res) => {
        if (Array.isArray(res) && res.length > 0) setFaculty(res);
      })
      .catch(() => {});
  }, []);

  return (
    <PublicLayout>
      {/* ================= ABOUT HERO BANNER (image copy 25.png exact match + mobile support + working button!) ================= */}
      {/* Desktop exact full-bleed banner matching image copy 25.png with working Start Learning Today button */}
      <section className="hidden md:block relative overflow-hidden bg-[#002266]">
        <RevealOnScroll>
          <div className="relative max-w-[1440px] mx-auto">
            <img
              src={cms.about.imageUrl || '/images/about-hero-banner.png'}
              alt="About O-LEARNING PLATFORM — Learn, Practice, Grow"
              className="w-full h-auto max-h-[560px] object-cover object-center block"
            />
            {/* Exact interactive hotspot + visible accessible CTA over the Start Learning Today button area */}
            <Link
              to="/courses"
              aria-label="Start Learning Today"
              className="absolute left-[5.5%] bottom-[9.5%] px-7 py-3.5 rounded-full bg-gradient-to-r from-[#FF9A1F] to-[#FF6B00] hover:from-[#FFB038] hover:to-[#FF7A00] text-[#0F172A] font-display font-extrabold text-sm lg:text-base shadow-xl shadow-orange-500/35 inline-flex items-center gap-2 transition hover:scale-105"
            >
              Start Learning Today <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </RevealOnScroll>
      </section>

      {/* Mobile About Hero (clean mobile-compatible showcase of image copy 25.png + working CTA) */}
      <section className="md:hidden bg-gradient-to-br from-[#002266] via-[#003E9C] to-[#0052CC] text-white">
        <div className="relative">
          <img
            src={cms.about.imageUrl || '/images/about-hero-banner.png'}
            alt="About O-LEARNING PLATFORM"
            className="w-full aspect-[16/9] object-cover object-right"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#002266] via-transparent to-transparent" />
        </div>
        <div className="px-4 pb-8 -mt-4 relative z-10">
          <span className="inline-block px-3 py-1 rounded-full bg-white/15 text-orange-300 text-[11px] font-bold">
            LEARN • PRACTICE • GROW
          </span>
          <h1 className="font-display font-extrabold text-2xl mt-2">
            About <span className="text-[#FFB020]">O-LEARNING PLATFORM</span>
          </h1>
          <p className="text-xs text-blue-100 mt-2 leading-relaxed">
            {cms.brand.tagline} — {cms.brand.supportingTagline} Empowering learners across India from {cms.brand.location}.
          </p>
          <div className="grid grid-cols-2 gap-2 mt-4 text-[11px] font-semibold text-blue-50">
            <div className="p-2.5 rounded-xl bg-white/10">Expert Video Lessons</div>
            <div className="p-2.5 rounded-xl bg-white/10">Interactive Practice</div>
            <div className="p-2.5 rounded-xl bg-white/10">Track Your Progress</div>
            <div className="p-2.5 rounded-xl bg-white/10">Mentor Support</div>
          </div>
          <Link
            to="/courses"
            className="mt-5 w-full py-3 rounded-full bg-gradient-to-r from-[#FF9A1F] to-[#FF6B00] text-[#0F172A] font-display font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg"
          >
            Start Learning Today <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* ================= VISION & MISSION (Scroll Animations + Enriched Popups) ================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 grid grid-cols-1 md:grid-cols-2 gap-6">
        <RevealOnScroll>
          <button
            type="button"
            onClick={() =>
              setInfoPopup({
                title: VISION_MISSION_DETAILS.vision.title,
                subtitle: VISION_MISSION_DETAILS.vision.subtitle,
                body: cms.about.vision,
                points: VISION_MISSION_DETAILS.vision.points,
                metrics: VISION_MISSION_DETAILS.vision.metrics,
              })
            }
            className="w-full text-left bg-white rounded-3xl p-7 border border-slate-200 shadow-xs hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 cursor-pointer h-full flex flex-col"
          >
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#0052CC] flex items-center justify-center mb-4">
              <Compass className="w-6 h-6" />
            </div>
            <h2 className="font-display font-extrabold text-2xl text-[#002B7A]">Our Vision</h2>
            <p className="text-sm sm:text-base text-slate-600 mt-3 leading-relaxed flex-1">
              {cms.about.vision}
            </p>
            <span className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-[#0052CC]">
              Read Full Vision Roadmap <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </button>
        </RevealOnScroll>

        <RevealOnScroll delay={100}>
          <button
            type="button"
            onClick={() =>
              setInfoPopup({
                title: VISION_MISSION_DETAILS.mission.title,
                subtitle: VISION_MISSION_DETAILS.mission.subtitle,
                body: cms.about.mission,
                points: VISION_MISSION_DETAILS.mission.points,
                metrics: VISION_MISSION_DETAILS.mission.metrics,
              })
            }
            className="w-full text-left bg-white rounded-3xl p-7 border border-slate-200 shadow-xs hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 cursor-pointer h-full flex flex-col"
          >
            <div className="w-12 h-12 rounded-2xl bg-orange-50 text-[#FF7A00] flex items-center justify-center mb-4">
              <Target className="w-6 h-6" />
            </div>
            <h2 className="font-display font-extrabold text-2xl text-[#002B7A]">Our Mission</h2>
            <p className="text-sm sm:text-base text-slate-600 mt-3 leading-relaxed flex-1">
              {cms.about.mission}
            </p>
            <span className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-[#FF7A00]">
              Explore Mission Pillars <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </button>
        </RevealOnScroll>
      </section>

      {/* ================= CORE VALUES (Scroll Animations + Enriched Popups) ================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <RevealOnScroll>
          <div className="bg-white rounded-3xl p-7 sm:p-9 border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between flex-wrap gap-2 mb-6">
              <div className="flex items-center gap-3">
                <HeartHandshake className="w-7 h-7 text-[#FF7A00]" />
                <h2 className="font-display font-extrabold text-2xl text-[#002B7A]">Our Core Values</h2>
              </div>
              <span className="text-xs text-slate-500">Tap any core value to read our commitment</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {cms.about.coreValues.map((val, idx) => (
                <RevealOnScroll key={val} delay={idx * 45}>
                  <button
                    type="button"
                    onClick={() => {
                      const detail = VALUE_DETAILS[val] || {
                        summary: `${val} guides how we build courses, support learners, and measure outcomes.`,
                        points: [
                          'Student-first curriculum design and interactive mentorship',
                          'Transparent pricing, assessments, and verified credentials',
                        ],
                        impact: 'Trusted by 10,000+ learners across India.',
                      };
                      setInfoPopup({
                        title: val,
                        subtitle: 'O-LEARNING PLATFORM Core Value',
                        body: detail.summary,
                        points: detail.points,
                        metrics: [{ label: 'Student Impact', value: detail.impact }],
                      });
                    }}
                    className="w-full flex items-center justify-between gap-2.5 p-4 rounded-2xl bg-slate-50 hover:bg-blue-50 border border-slate-200/70 hover:border-[#0052CC] hover:-translate-y-1 transition-all duration-200 cursor-pointer text-left"
                  >
                    <span className="flex items-center gap-2.5">
                      <CheckCircle2 className="w-5 h-5 text-[#0052CC] shrink-0" />
                      <span className="text-sm font-bold text-slate-800">{val}</span>
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  </button>
                </RevealOnScroll>
              ))}
            </div>
          </div>
        </RevealOnScroll>
      </section>

      {/* ================= FACULTY SHOWCASE (Scroll Animations + Rich Faculty Popups) ================= */}
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
                  <span className="text-[#0052CC] font-bold">Full Bio →</span>
                </div>
              </button>
            </RevealOnScroll>
          ))}
        </div>
      </section>

      {/* ENRICHED VISION / MISSION / CORE VALUE POPUP (image copy 27.png & image copy 28.png) */}
      {infoPopup && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4"
          onClick={() => setInfoPopup(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto"
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
            <p className="text-sm text-slate-600 mt-2.5 leading-relaxed">{infoPopup.body}</p>

            {infoPopup.metrics && infoPopup.metrics.length > 0 && (
              <div
                className={`grid gap-2.5 my-4 p-3.5 rounded-2xl bg-blue-50/70 border border-blue-100 ${
                  infoPopup.metrics.length === 1 ? 'grid-cols-1' : 'grid-cols-3 text-center'
                }`}
              >
                {infoPopup.metrics.map((m) => (
                  <div key={m.label}>
                    <p className="text-[11px] font-semibold text-slate-500">{m.label}</p>
                    <p className="font-display font-bold text-sm text-[#00338D] mt-0.5">{m.value}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-2.5 mt-4">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                How We Put This Into Practice
              </p>
              {infoPopup.points.map((pt) => (
                <div key={pt} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-700">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>{pt}</span>
                </div>
              ))}
            </div>

            <div className="mt-6 flex gap-2.5">
              <Link
                to="/courses"
                onClick={() => setInfoPopup(null)}
                className="flex-1 py-3 rounded-xl bg-[#0052CC] hover:bg-[#003EB3] text-white text-center text-xs sm:text-sm font-bold shadow-md"
              >
                Explore Our Programs →
              </Link>
              <button
                type="button"
                onClick={() => setInfoPopup(null)}
                className="px-4 py-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ENRICHED FACULTY PROFILE POPUP */}
      {facultyPopup && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4"
          onClick={() => setFacultyPopup(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3.5">
                <div className="w-15 h-15 rounded-2xl bg-gradient-to-br from-[#0052CC] to-[#0B6FF4] text-white font-display font-extrabold text-2xl flex items-center justify-center shrink-0">
                  {facultyPopup.full_name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-display font-extrabold text-lg sm:text-xl text-[#002B7A]">
                    {facultyPopup.full_name}
                  </h3>
                  <p className="text-xs font-semibold text-[#FF7A00]">{facultyPopup.title}</p>
                </div>
              </div>
              <button onClick={() => setFacultyPopup(null)} className="p-1.5 rounded-full hover:bg-slate-100 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-slate-600 leading-relaxed">{facultyPopup.bio}</p>

            <div className="grid grid-cols-3 gap-2.5 my-4 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-center text-xs">
              <div>
                <p className="text-slate-400">Experience</p>
                <p className="font-bold text-[#00338D]">{facultyPopup.experience_years}+ Years</p>
              </div>
              <div>
                <p className="text-slate-400">Live Doubt Q&A</p>
                <p className="font-bold text-emerald-600">Weekly</p>
              </div>
              <div>
                <p className="text-slate-400">Focus</p>
                <p className="font-bold text-[#FF7A00]">Practical</p>
              </div>
            </div>

            <div className="space-y-2 text-xs sm:text-sm text-slate-700 mb-5">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-[#0052CC] shrink-0" />
                <span><strong>Qualifications:</strong> {facultyPopup.qualifications}</span>
              </div>
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#FF7A00] shrink-0" />
                <span><strong>Specialization:</strong> {facultyPopup.specialization}</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Mentors both live batch cohorts and self-paced recorded learners</span>
              </div>
            </div>

            <div className="flex gap-2.5">
              <Link
                to="/courses"
                onClick={() => setFacultyPopup(null)}
                className="flex-1 py-3 rounded-xl bg-[#FF7A00] hover:bg-[#E66D00] text-white text-center text-xs sm:text-sm font-bold shadow-md"
              >
                Browse Courses by {facultyPopup.full_name.split(' ')[0]} →
              </Link>
              <button
                type="button"
                onClick={() => setFacultyPopup(null)}
                className="px-4 py-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </PublicLayout>
  );
}
