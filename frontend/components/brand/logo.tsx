import { cn } from '@/lib/utils';

type Props = { className?: string; showText?: boolean; variant?: 'light' | 'dark' };

export function WahaLogo({ className, showText = true, variant = 'dark' }: Props) {
  const ink = variant === 'light' ? '#fbfaf7' : 'hsl(224 76% 28%)';
  const accent = 'hsl(173 58% 39%)';
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
        <rect width="36" height="36" rx="9" fill={ink} />
        <path d="M 8 24 L 13 12 L 18 24 M 11 19 L 15 19" stroke="#fbfaf7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <path d="M 20 12 L 24 24 L 28 12" stroke={accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <circle cx="24" cy="24" r="1.5" fill={accent} />
      </svg>
      {showText && <span className="text-xl font-bold tracking-tight" style={{ color: variant === 'light' ? '#fbfaf7' : 'hsl(222 47% 11%)' }}>Waha<span style={{ color: accent }}>Math</span></span>}
    </div>
  );
}
