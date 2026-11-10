import { Link } from 'react-router-dom';

interface BrandLogoProps {
  compact?: boolean;
  dark?: boolean;
  to?: string;
}

export function BrandLogo({ compact = false, dark = false, to = '/' }: BrandLogoProps) {
  return (
    <Link to={to} className="inline-flex items-center gap-2.5 group select-none shrink-0">
      {/* Emblem matching the reference globe + orange orbital swoosh */}
      <svg
        viewBox="0 0 64 56"
        className={compact ? 'w-9 h-8' : 'w-11 h-10'}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="logoBlue" x1="12" y1="6" x2="50" y2="48" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#0B6FF4" />
            <stop offset="100%" stopColor="#003EB3" />
          </linearGradient>
          <linearGradient id="logoOrange" x1="4" y1="36" x2="60" y2="12" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FF7A00" />
            <stop offset="100%" stopColor="#FFB020" />
          </linearGradient>
        </defs>
        <circle cx="32" cy="27" r="19" fill="url(#logoBlue)" />
        {/* Stylized 'O' / 'e' inner ring */}
        <circle cx="32" cy="27" r="10.5" stroke="#FFFFFF" strokeWidth="4.2" />
        <circle cx="32" cy="27" r="4" fill="#FFFFFF" />
        {/* Orange orbital swoosh */}
        <path
          d="M7 39C14 48 33 49 48 39C59 31 61 19 52 13C47 10 40 10 34 12"
          stroke="url(#logoOrange)"
          strokeWidth="4.5"
          strokeLinecap="round"
        />
        <circle cx="54" cy="14" r="3.2" fill="#FF7A00" />
      </svg>

      <div className="flex flex-col leading-none">
        <div className="flex items-center gap-1.5">
          <span
            className={`font-display font-extrabold tracking-tight ${
              compact ? 'text-base' : 'text-lg sm:text-xl'
            } ${dark ? 'text-white' : 'text-[#002B7A]'}`}
          >
            O-LEARNING
          </span>
          <span className="px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase rounded-full bg-[#0052CC] text-white">
            PLATFORM
          </span>
        </div>
        <span
          className={`text-[10.5px] font-semibold italic mt-0.5 ${
            dark ? 'text-orange-300' : 'text-[#FF7A00]'
          }`}
        >
          Learn Today, Lead Tomorrow!
        </span>
      </div>
    </Link>
  );
}
