import { cn } from '@repo/ui-core';

export const MiriondonSymbol = ({ className, tone = 'brand' }: { className?: string; tone?: 'brand' | 'mono-light' }) => {
  const isMonoLight = tone === 'mono-light';
  const primaryColor = isMonoLight ? '#FFFFFF' : 'hsl(var(--primary))';
  const secondaryColor = isMonoLight ? 'rgba(255, 255, 255, 0.45)' : 'hsl(var(--positive))';
  const echoColor = isMonoLight ? 'rgba(255, 255, 255, 0.34)' : 'hsl(var(--primary))';

  return (
    <svg viewBox="0 0 48 48" fill="none" aria-hidden="true" className={className}>
      {/* Back scheduled-expense card (segmented border) */}
      <rect
        x="21"
        y="10"
        width="18"
        height="26"
        rx="4.5"
        transform="rotate(14 30 23)"
        stroke={echoColor}
        strokeOpacity={isMonoLight ? 0.65 : 0.52}
        strokeWidth="3.2"
        strokeDasharray="6 3.5"
        strokeLinecap="round"
      />
      {/* Front confirmed card tilted to form M valley */}
      <rect x="8.5" y="11" width="18.5" height="26" rx="4.5" transform="rotate(-12 17.75 24)" fill={primaryColor} />
      {/* Card magnetic / chip accent */}
      <rect x="13" y="17.5" width="7" height="3.2" rx="1.6" transform="rotate(-12 16.5 19.1)" fill={isMonoLight ? 'hsl(var(--hero-to))' : 'hsl(var(--card))'} />
      {/* Future anchor accent on front-right edge */}
      <path d="M29.5 28.5 L35.5 22.5" stroke={secondaryColor} strokeWidth="3.2" strokeLinecap="round" />
    </svg>
  );
};

export const MiriondonWordmark = ({ tone = 'brand', size = 'md', className }: { tone?: 'brand' | 'mono-light'; size?: 'sm' | 'md' | 'lg'; className?: string }) => {
  const isMonoLight = tone === 'mono-light';
  const sizeClass = size === 'sm' ? 'text-base' : size === 'lg' ? 'text-2xl' : 'text-lg';

  return (
    <span className={cn('inline-flex items-baseline leading-none font-black tracking-[-0.055em] select-none', sizeClass, className)}>
      <span className={isMonoLight ? 'text-white' : 'text-primary'}>미리</span>
      <span className={isMonoLight ? 'text-white/75' : 'text-foreground'}>온돈</span>
    </span>
  );
};
