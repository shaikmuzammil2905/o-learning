import { useEffect, useState } from 'react';
import { Calendar, Clock, ExternalLink, PlayCircle, Radio, UserCheck } from 'lucide-react';
import { DashboardLayout, STUDENT_LINKS } from '../../components/DashboardLayout';
import { EmptyState, LoadingState } from '../../components/ui/StateViews';
import { api, formatDateTime } from '../../lib/api';
import type { LiveClass } from '../../types';

export function LiveClassesPage() {
  const [classes, setClasses] = useState<LiveClass[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<LiveClass[]>('/api/student/live-classes')
      .then(setClasses)
      .finally(() => setLoading(false));
  }, []);

  const liveNow = classes.filter((c) => c.status === 'live');
  const upcoming = classes.filter((c) => c.status === 'upcoming');
  const previous = classes.filter((c) => c.status === 'completed');

  return (
    <DashboardLayout
      title="Live Classes"
      subtitle="Join today’s interactive live sessions or watch previous class recordings"
      links={STUDENT_LINKS}
    >
      {loading ? (
        <LoadingState message="Loading live class schedule…" />
      ) : classes.length === 0 ? (
        <EmptyState title="No live classes scheduled." description="Check back soon for upcoming sessions." />
      ) : (
        <div className="space-y-8">
          {/* Today's Live */}
          <div>
            <h2 className="font-display font-bold text-lg text-[#002B7A] flex items-center gap-2 mb-4">
              <Radio className="w-5 h-5 text-red-500 animate-pulse" /> Today&apos;s Live Classes
            </h2>
            {liveNow.length === 0 ? (
              <p className="text-sm text-slate-500 bg-white p-5 rounded-2xl border border-slate-200">
                No session is live right this minute. See upcoming classes below.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {liveNow.map((lc) => (
                  <div
                    key={lc.id}
                    className="bg-gradient-to-br from-[#00338D] to-[#0052CC] text-white rounded-3xl p-6 shadow-xl"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-3 py-1 rounded-full bg-white/15 text-xs font-bold">
                        {lc.course_title}
                      </span>
                      <span className="px-3 py-1 rounded-full bg-red-500 text-white text-xs font-bold animate-pulse">
                        ● LIVE NOW
                      </span>
                    </div>
                    <h3 className="font-display font-bold text-xl mt-3">{lc.title}</h3>
                    <p className="text-xs text-blue-100 mt-1.5">{lc.description}</p>
                    <div className="flex flex-wrap items-center gap-4 text-xs text-blue-100 mt-4">
                      <span className="inline-flex items-center gap-1.5">
                        <UserCheck className="w-4 h-4 text-[#FF9B3D]" /> {lc.faculty_name}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-[#FF9B3D]" /> {lc.duration_minutes} mins
                      </span>
                    </div>
                    <a
                      href={lc.meeting_url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-5 w-full py-3 rounded-xl bg-[#FF7A00] hover:bg-[#E66D00] text-white font-bold text-sm flex items-center justify-center gap-2"
                    >
                      Join Live Session <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Upcoming */}
          <div>
            <h2 className="font-display font-bold text-lg text-[#002B7A] mb-4">Upcoming Classes</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {upcoming.map((lc) => (
                <div key={lc.id} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col">
                  <span className="text-[11px] font-bold text-[#0052CC] bg-blue-50 px-3 py-1 rounded-full self-start">
                    {lc.course_title}
                  </span>
                  <h3 className="font-display font-bold text-base text-slate-900 mt-3">{lc.title}</h3>
                  <p className="text-xs text-slate-500 mt-1 flex-1">{lc.description}</p>
                  <div className="mt-4 space-y-1.5 text-xs text-slate-600">
                    <p className="flex items-center gap-1.5">
                      <UserCheck className="w-3.5 h-3.5 text-[#0052CC]" /> {lc.faculty_name}
                    </p>
                    <p className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-[#FF7A00]" /> {formatDateTime(lc.scheduled_at)}
                    </p>
                  </div>
                  <a
                    href={lc.meeting_url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 w-full py-2.5 rounded-xl bg-[#0052CC] text-white text-xs font-bold text-center hover:bg-[#003EB3]"
                  >
                    Join Class Link
                  </a>
                </div>
              ))}
            </div>
          </div>

          {/* Previous / Recorded */}
          {previous.length > 0 && (
            <div>
              <h2 className="font-display font-bold text-lg text-[#002B7A] mb-4">
                Previous & Recorded Classes
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {previous.map((lc) => (
                  <div key={lc.id} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
                    <span className="text-[11px] font-bold text-slate-500">{lc.course_title}</span>
                    <h3 className="font-display font-bold text-base text-slate-900 mt-1">{lc.title}</h3>
                    <p className="text-xs text-slate-500 mt-1">
                      {lc.faculty_name} · {formatDateTime(lc.scheduled_at)}
                    </p>
                    {lc.recording_url && (
                      <a
                        href={lc.recording_url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold"
                      >
                        <PlayCircle className="w-4 h-4 text-[#0052CC]" /> Watch Recording
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </DashboardLayout>
  );
}

