import { useEffect, useState } from 'react';
import { BrandLogo } from './BrandLogo';

export function SplashScreen() {
  const [visible, setVisible] = useState(() => {
    try {
      return !sessionStorage.getItem('olearn_splash_seen');
    } catch {
      return false;
    }
  });
  const [fading, setFading] = useState(false);

  useEffect(() => {
    if (!visible) return;
    const t1 = setTimeout(() => setFading(true), 1200);
    const t2 = setTimeout(() => {
      setVisible(false);
      try {
        sessionStorage.setItem('olearn_splash_seen', '1');
      } catch {
        // ignore
      }
    }, 1600);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-gradient-to-br from-[#00256E] via-[#0044B4] to-[#0B6FF4] text-white transition-opacity duration-400 ${
        fading ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Subtle decorative radial glow behind transparent logo (no white patch box!) */}
      <div className="relative flex flex-col items-center text-center px-6">
        <div className="mb-5 animate-float-slow drop-shadow-[0_12px_30px_rgba(0,0,0,0.35)]">
          <BrandLogo dark large to="#" />
        </div>
        <p className="text-sm sm:text-base font-medium text-blue-100 tracking-wide">
          Your Learning Partner for a Better Future.
        </p>
        <div className="mt-6 w-40 h-1.5 rounded-full bg-white/20 overflow-hidden">
          <div className="h-full bg-[#FF7A00] rounded-full animate-[pulse_1s_ease-in-out_infinite] w-3/4" />
        </div>
      </div>
    </div>
  );
}
