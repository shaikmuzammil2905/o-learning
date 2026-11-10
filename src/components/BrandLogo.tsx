import { Link } from 'react-router-dom';

interface BrandLogoProps {
  compact?: boolean;
  dark?: boolean;
  large?: boolean;
  to?: string;
}

export function BrandLogo({ compact = false, dark = false, large = false, to = '/' }: BrandLogoProps) {
  const src = dark ? '/images/logo-footer.png' : '/images/logo-transparent.png';
  const heightClass = large
    ? 'h-16 sm:h-20'
    : compact
    ? 'h-10 sm:h-11'
    : 'h-12 sm:h-14';

  const imgEl = (
    <img
      src={src}
      alt="O-LEARNING PLATFORM — Learn Today, Lead Tomorrow!"
      className={`${heightClass} w-auto object-contain select-none transition-transform duration-200 group-hover:scale-[1.02]`}
    />
  );

  if (to === '#') {
    return <span className="inline-flex items-center group shrink-0">{imgEl}</span>;
  }

  return (
    <Link to={to} className="inline-flex items-center group shrink-0">
      {imgEl}
    </Link>
  );
}
