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
    const t1 = setTimeout(() => setFading(true), 1150);
    const t2 = setTimeout(() => {
      setVisible(false);
      try {
        sessionStorage.setItem('olearn_splash_seen', '1');
      } catch {
        // ignore
      }
    }, 1550);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-gradient-to-br from-[#002D85] via-[#0052CC] to-[#0B6FF4] text-white transition-opacity duration-400 ${
        fading ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      <div className="relative flex flex-col items-center text-center px-6">
        <div className="bg-white/95 px-6 py-5 rounded-3xl shadow-2xl mb-5 animate-float-slow">
          <BrandLogo to="/" />
        </div>
        <p className="text-sm sm:text-base font-medium text-blue-100 tracking-wide">
          Your Learning Partner for a Better Future.
        </p>
        <div className="mt-6 w-36 h-1.5 rounded-full bg-white/20 overflow-hidden">
          <div className="h-full bg-[#FF7A00] rounded-full animate-[pulse_1s_ease-in-out_infinite] w-2/3" />
        </div>
      </div>
    </div>
  );
}
