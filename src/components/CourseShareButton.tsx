import React, { useState } from 'react';
import { Share2 } from 'lucide-react';
import type { Course } from '../types';
import { CourseShareModal } from './CourseShareModal';

interface CourseShareButtonProps {
  course: Course;
  variant?: 'card' | 'detail';
  presetReferralCode?: string;
}

export function CourseShareButton({
  course,
  variant = 'card',
  presetReferralCode,
}: CourseShareButtonProps) {
  const [open, setOpen] = useState(false);

  const handleOpen = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setOpen(true);
  };

  return (
    <>
      {variant === 'detail' ? (
        <button
          type="button"
          onClick={handleOpen}
          aria-label={`Share ${course.title} course`}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border-2 border-[#0052CC] text-[#0052CC] bg-blue-50/70 hover:bg-blue-100 font-bold text-sm transition cursor-pointer"
        >
          <Share2 className="w-4 h-4" />
          <span>Share Course</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={handleOpen}
          aria-label={`Share ${course.title} course`}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-[#0052CC] text-xs font-bold transition cursor-pointer shrink-0"
        >
          <Share2 className="w-3.5 h-3.5" />
          <span>Share</span>
        </button>
      )}

      <CourseShareModal
        course={course}
        open={open}
        onClose={() => setOpen(false)}
        presetReferralCode={presetReferralCode}
      />
    </>
  );
}

