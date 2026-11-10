import React from 'react';
import {
  AlertTriangle,
  BookOpen,
  Brain,
  Code2,
  GraduationCap,
  Inbox,
  Landmark,
  Loader2,
  MessageSquare,
  TrendingUp,
  Trophy,
  Users,
} from 'lucide-react';

export function LoadingState({ message = 'Loading content…' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#0052CC] flex items-center justify-center mb-3 shadow-sm">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
      <p className="text-sm font-medium text-slate-600">{message}</p>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-14 px-6 text-center bg-white rounded-2xl border border-slate-200/80 shadow-sm">
      <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center mb-4">
        {icon || <Inbox className="w-7 h-7" />}
      </div>
      <h3 className="text-base font-bold text-slate-900">{title}</h3>
      {description && <p className="text-sm text-slate-500 mt-1 max-w-md">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({
  message = 'Something went wrong. Please try again.',
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center bg-red-50/70 rounded-2xl border border-red-200">
      <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mb-3">
        <AlertTriangle className="w-6 h-6" />
      </div>
      <p className="text-sm font-semibold text-red-800">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-semibold hover:bg-red-700 transition cursor-pointer"
        >
          Try Again
        </button>
      )}
    </div>
  );
}

export function CourseIcon({ name, className = 'w-7 h-7' }: { name: string; className?: string }) {
  switch (name) {
    case 'MessageSquare':
      return <MessageSquare className={className} />;
    case 'Trophy':
      return <Trophy className={className} />;
    case 'GraduationCap':
      return <GraduationCap className={className} />;
    case 'Landmark':
      return <Landmark className={className} />;
    case 'Brain':
      return <Brain className={className} />;
    case 'Users':
      return <Users className={className} />;
    case 'Code2':
      return <Code2 className={className} />;
    case 'TrendingUp':
      return <TrendingUp className={className} />;
    default:
      return <BookOpen className={className} />;
  }
}
