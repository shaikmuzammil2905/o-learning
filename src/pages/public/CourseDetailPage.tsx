import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Award,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Clock,
  FileText,
  HelpCircle,
  Layers,
  Lock,
  PlayCircle,
  Star,
  UserCheck,
} from 'lucide-react';
import { PublicLayout } from '../../components/PublicLayout';
import { PaymentModal } from '../../components/PaymentModal';
import { ErrorState, LoadingState } from '../../components/ui/StateViews';
import { useAuth } from '../../context/AuthContext';
import { api, formatCurrency } from '../../lib/api';
import type { Course } from '../../types';

export function CourseDetailPage() {
  const { courseId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'overview' | 'curriculum' | 'faculty' | 'reviews' | 'faqs'>('overview');
  const [payOpen, setPayOpen] = useState(false);
  const [enrollingFree, setEnrollingFree] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewStatus, setReviewStatus] = useState('');

  const loadCourse = () => {
    setLoading(true);
    setError('');
    api<Course>(`/api/public/courses/${courseId}`)
      .then((data) => setCourse(data))
      .catch((err) => setError(err instanceof Error ? err.message : 'Unable to load course'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadCourse();
  }, [courseId]);

  const handleEnrollClick = async () => {
    if (!course) return;
    if (!user) {
      navigate(`/login?redirect=/courses/${course.slug}`);
      return;
    }
    if (course.is_enrolled) {
      navigate(`/student/learn/${course.slug}`);
      return;
    }

    const effectivePrice = course.discount_price ?? course.price;
    if (course.is_free === 1 || effectivePrice === 0) {
      setEnrollingFree(true);
      try {
        await api('/api/student/enroll/free', {
          method: 'POST',
          body: JSON.stringify({ course_id: course.id }),
        });
        navigate(`/student/learn/${course.slug}`);
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Could not enroll');
      } finally {
        setEnrollingFree(false);
      }
      return;
    }

    // Paid course -> try subscription-free enroll? Only if user specifically pays or has active sub
    setPayOpen(true);
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!course) return;
    setReviewStatus('');
    try {
      await api(`/api/student/courses/${course.id}/review`, {
        method: 'POST',
        body: JSON.stringify({ rating: reviewRating, comment: reviewComment }),
      });
      setReviewComment('');
      setReviewStatus('Review submitted!');
      loadCourse();
    } catch (err) {
      setReviewStatus(err instanceof Error ? err.message : 'Unable to post review.');
    }
  };

  if (loading) {
    return (
      <PublicLayout>
        <LoadingState message="Loading course details…" />
      </PublicLayout>
    );
  }

  if (error || !course) {
    return (
      <PublicLayout>
        <div className="max-w-4xl mx-auto px-4 py-12">
          <ErrorState message={error || 'Course not found.'} onRetry={loadCourse} />
        </div>
      </PublicLayout>
    );
  }

  const effectivePrice = course.is_free === 1 ? 0 : course.discount_price ?? course.price;
  const discountAmount = course.is_free === 1 ? 0 : Math.max(0, course.price - effectivePrice);

  return (
    <PublicLayout>
      {/* Top Dark Royal Blue Course Header */}
      <section className="bg-gradient-to-br from-[#002B7A] via-[#0046B8] to-[#005CE6] text-white py-8 sm:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 text-xs text-blue-200 mb-5 flex-wrap">
            <Link to="/" className="hover:text-white">Home</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <Link to="/courses" className="hover:text-white">Courses</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-white font-semibold">{course.title}</span>
          </nav>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7 space-y-4">
              {course.category_name && (
                <span className="inline-block px-3 py-1 rounded-full bg-white/15 border border-white/20 text-xs font-bold text-orange-300">
                  {course.category_name}
                </span>
              )}
              <h1 className="font-display font-extrabold text-2xl sm:text-4xl leading-tight">
                {course.title}
              </h1>
              <p className="text-sm sm:text-base text-blue-100 leading-relaxed">
                {course.description}
              </p>

              <div className="flex flex-wrap items-center gap-4 pt-2 text-xs sm:text-sm text-blue-100">
                <span className="inline-flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-[#FF9B3D]" />
                  Faculty: <strong className="text-white">{course.faculty_name}</strong>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-[#FF9B3D]" />
                  {course.duration}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-[#FF9B3D]" />
                  {course.modules?.length || 0} Modules
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-[#FF9B3D]" />
                  {course.level}
                </span>
              </div>
            </div>

            {/* Thumbnail & Pricing Enrollment Card */}
            <div className="lg:col-span-5">
              <div className="bg-white text-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-white/20">
                <div className="aspect-[16/9] bg-blue-50 relative">
                  <img
                    src={course.thumbnail_url}
                    alt={course.title}
                    className="w-full h-full object-cover"
                  />
                  {course.is_enrolled && (
                    <span className="absolute top-3 right-3 px-3 py-1 rounded-full bg-emerald-500 text-white text-xs font-bold shadow">
                      Enrolled
                    </span>
                  )}
                </div>
                <div className="p-5 sm:p-6">
                  <div className="flex items-baseline gap-2.5">
                    <span className="font-display font-extrabold text-3xl text-[#00338D]">
                      {course.is_free === 1 ? 'FREE' : formatCurrency(effectivePrice)}
                    </span>
                    {discountAmount > 0 && (
                      <>
                        <span className="text-base text-slate-400 line-through">
                          {formatCurrency(course.price)}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-orange-100 text-[#FF7A00] text-xs font-bold">
                          Save {formatCurrency(discountAmount)}
                        </span>
                      </>
                    )}
                  </div>

                  <button
                    type="button"
                    disabled={enrollingFree}
                    onClick={handleEnrollClick}
                    className="mt-4 w-full py-3.5 rounded-xl bg-[#FF7A00] hover:bg-[#E66D00] text-white font-bold text-sm shadow-lg shadow-orange-500/25 transition cursor-pointer disabled:opacity-60"
                  >
                    {enrollingFree
                      ? 'Enrolling…'
                      : course.is_enrolled
                      ? 'Continue Learning →'
                      : course.is_free === 1
                      ? 'Enroll for Free →'
                      : 'Enroll Now →'}
                  </button>
                  <p className="text-[11px] text-slate-500 text-center mt-2.5">
                    Includes live doubt sessions, study materials & official certificate
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tabs Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-2 overflow-x-auto border-b border-slate-200 pb-3 mb-7">
          {(
            [
              { id: 'overview', label: 'Overview' },
              { id: 'curriculum', label: 'Curriculum' },
              { id: 'faculty', label: 'Faculty' },
              { id: 'reviews', label: `Reviews (${course.reviews?.length || 0})` },
              { id: 'faqs', label: 'FAQs' },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 rounded-xl text-sm font-bold shrink-0 transition cursor-pointer ${
                tab === t.id
                  ? 'bg-[#0052CC] text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* OVERVIEW */}
        {tab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
                <h2 className="font-display font-bold text-xl text-[#002B7A] mb-4">
                  What You&apos;ll Learn
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {course.what_you_learn.map((item) => (
                    <div key={item} className="flex items-start gap-2.5 text-sm text-slate-700">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
                <h2 className="font-display font-bold text-xl text-[#002B7A] mb-3">
                  About This Program
                </h2>
                <p className="text-sm text-slate-600 leading-relaxed">{course.description}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
                <h3 className="font-display font-bold text-base text-[#002B7A] mb-4">
                  Program Highlights
                </h3>
                <ul className="space-y-3 text-sm text-slate-700">
                  <li className="flex items-center gap-2.5">
                    <PlayCircle className="w-4 h-4 text-[#0052CC]" /> HD Recorded Video Lectures
                  </li>
                  <li className="flex items-center gap-2.5">
                    <FileText className="w-4 h-4 text-[#FF7A00]" /> Downloadable Notes & PDFs
                  </li>
                  <li className="flex items-center gap-2.5">
                    <BookOpen className="w-4 h-4 text-[#0052CC]" /> Quizzes & Assignments
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Award className="w-4 h-4 text-[#FF7A00]" /> Verified Completion Certificate
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* CURRICULUM */}
        {tab === 'curriculum' && (
          <div className="space-y-4 max-w-4xl">
            {course.modules?.map((mod, mIdx) => (
              <div
                key={mod.id}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs"
              >
                <div className="bg-slate-50 px-5 py-4 border-b border-slate-200 flex items-center justify-between">
                  <h3 className="font-display font-bold text-base text-[#002B7A]">
                    {mod.title || `Module ${mIdx + 1}`}
                  </h3>
                  <span className="text-xs font-semibold text-slate-500">
                    {mod.lessons.length} Lessons
                  </span>
                </div>
                <div className="divide-y divide-slate-100">
                  {mod.lessons.map((lesson) => (
                    <div
                      key={lesson.id}
                      className="px-5 py-3.5 flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                            lesson.unlocked
                              ? 'bg-blue-50 text-[#0052CC]'
                              : 'bg-slate-100 text-slate-400'
                          }`}
                        >
                          {lesson.unlocked ? (
                            <PlayCircle className="w-4 h-4" />
                          ) : (
                            <Lock className="w-4 h-4" />
                          )}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-800 truncate">
                            {lesson.title}
                          </p>
                          <p className="text-xs text-slate-500 capitalize">
                            {lesson.lesson_type} · {lesson.duration_minutes} mins
                          </p>
                        </div>
                      </div>
                      {lesson.is_preview === 1 && !course.is_enrolled && (
                        <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold shrink-0">
                          Free Preview
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* FACULTY */}
        {tab === 'faculty' && (
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs max-w-3xl">
            <div className="flex flex-col sm:flex-row sm:items-center gap-5">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#0052CC] to-[#0B6FF4] text-white font-display font-extrabold text-2xl flex items-center justify-center shrink-0">
                {course.faculty_name?.charAt(0) || 'F'}
              </div>
              <div>
                <h3 className="font-display font-bold text-xl text-[#002B7A]">
                  {course.faculty_name}
                </h3>
                <p className="text-sm font-semibold text-[#FF7A00]">{course.faculty_title}</p>
                <p className="text-xs text-slate-500 mt-1">
                  {course.faculty_qualifications} · {course.faculty_experience || 10}+ Years Teaching Experience
                </p>
              </div>
            </div>
            <p className="mt-5 text-sm text-slate-600 leading-relaxed">{course.faculty_bio}</p>
          </div>
        )}

        {/* REVIEWS */}
        {tab === 'reviews' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              {course.reviews && course.reviews.length > 0 ? (
                course.reviews.map((rev) => (
                  <div
                    key={rev.id}
                    className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs"
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-sm text-slate-900">{rev.student_name}</p>
                      <div className="flex items-center gap-0.5 text-amber-400">
                        {Array.from({ length: rev.rating }).map((_, idx) => (
                          <Star key={idx} className="w-4 h-4 fill-amber-400" />
                        ))}
                      </div>
                    </div>
                    <p className="text-sm text-slate-600 mt-2">{rev.comment}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">No reviews yet. Be the first enrolled learner to review!</p>
              )}
            </div>

            {course.is_enrolled && (
              <form
                onSubmit={handleReviewSubmit}
                className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3 h-fit"
              >
                <h4 className="font-display font-bold text-base text-[#002B7A]">Write a Review</h4>
                <select
                  value={reviewRating}
                  onChange={(e) => setReviewRating(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                >
                  <option value={5}>5 Stars — Excellent</option>
                  <option value={4}>4 Stars — Very Good</option>
                  <option value={3}>3 Stars — Good</option>
                  <option value={2}>2 Stars — Fair</option>
                </select>
                <textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  rows={3}
                  required
                  placeholder="Share your learning experience…"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm outline-none"
                />
                {reviewStatus && <p className="text-xs font-semibold text-[#0052CC]">{reviewStatus}</p>}
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-[#0052CC] text-white text-sm font-bold cursor-pointer"
                >
                  Submit Review
                </button>
              </form>
            )}
          </div>
        )}

        {/* FAQS */}
        {tab === 'faqs' && (
          <div className="space-y-3 max-w-3xl">
            {course.faqs?.map((faq, i) => (
              <div key={i} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
                <h4 className="font-bold text-sm text-[#002B7A] flex items-start gap-2">
                  <HelpCircle className="w-4 h-4 text-[#FF7A00] shrink-0 mt-0.5" />
                  {faq.q}
                </h4>
                <p className="text-sm text-slate-600 mt-2 pl-6">{faq.a}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      <PaymentModal
        open={payOpen}
        onClose={() => setPayOpen(false)}
        itemType="course"
        itemId={course.id}
        itemTitle={course.title}
        amount={course.price}
        discountAmount={discountAmount}
        finalAmount={effectivePrice}
        onSuccess={() => {
          navigate(`/student/learn/${course.slug}`);
        }}
      />
    </PublicLayout>
  );
}
