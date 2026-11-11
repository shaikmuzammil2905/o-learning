import { Link } from 'react-router-dom';
import { ArrowRight, Clock, Layers, Star } from 'lucide-react';
import type { Course } from '../types';
import { formatCurrency } from '../lib/api';
import { CourseShareButton } from './CourseShareButton';

export function CourseCard({ course }: { course: Course }) {
  const effectivePrice = course.discount_price ?? course.price;
  const hasDiscount =
    !course.is_free && course.discount_price !== null && course.discount_price < course.price;

  return (
    <Link
      to={`/courses/${course.slug}`}
      className="group bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-200 overflow-hidden flex flex-col"
    >
      <div className="relative aspect-[16/9] bg-blue-50 overflow-hidden">
        <img
          src={course.thumbnail_url}
          alt={course.title}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute top-3 left-3 flex items-center gap-1.5">
          {course.is_free === 1 ? (
            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500 text-white shadow">
              FREE
            </span>
          ) : hasDiscount ? (
            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#FF7A00] text-white shadow">
              {Math.round(((course.price - effectivePrice) / course.price) * 100)}% OFF
            </span>
          ) : null}
          {course.category_name && (
            <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-white/95 text-[#0052CC] shadow-sm">
              {course.category_name}
            </span>
          )}
        </div>
      </div>

      <div className="p-5 flex-1 flex flex-col">
        <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
          <span className="inline-flex items-center gap-1 font-medium">
            <Clock className="w-3.5 h-3.5 text-[#0052CC]" />
            {course.duration}
          </span>
          <span className="inline-flex items-center gap-1 font-medium">
            <Layers className="w-3.5 h-3.5 text-[#FF7A00]" />
            {course.modules_count || 2} Modules
          </span>
        </div>

        <h3 className="font-display font-bold text-base sm:text-lg text-slate-900 group-hover:text-[#0052CC] transition-colors line-clamp-2">
          {course.title}
        </h3>
        <p className="text-xs sm:text-sm text-slate-600 mt-1.5 line-clamp-2 flex-1">
          {course.short_description}
        </p>

        <div className="flex items-center justify-between text-xs text-slate-500 mt-3 pt-3 border-t border-slate-100">
          <span className="truncate font-medium text-slate-700">
            {course.faculty_name || 'Expert Faculty'}
          </span>
          <span className="inline-flex items-center gap-1 font-semibold text-amber-500 shrink-0">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            {course.avg_rating || '4.9'}
          </span>
        </div>

        <div className="mt-4 flex items-center justify-between gap-2">
          <div className="flex items-baseline gap-2">
            <span className="font-display font-extrabold text-lg text-[#00338D]">
              {course.is_free === 1 ? 'Free' : formatCurrency(effectivePrice)}
            </span>
            {hasDiscount && (
              <span className="text-xs text-slate-400 line-through">
                {formatCurrency(course.price)}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <CourseShareButton course={course} variant="card" />
            <span className="inline-flex items-center gap-1 text-xs font-bold text-[#FF7A00] group-hover:translate-x-0.5 transition-transform">
              Enroll <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

