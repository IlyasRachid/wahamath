import { cn } from '@/lib/utils';

type Props = { className?: string; showText?: boolean; variant?: 'light' | 'dark' };

export function WahaLogo({ className, showText = true, variant = 'dark' }: Props) {
  const wordmarkColor = variant === 'light' ? 'text-white' : 'text-black dark:text-white';
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <div className="h-10 w-10 shrink-0" aria-hidden>
        <img
          src="/brand/wahamath-logo-v3.png"
          alt=""
          className="h-full w-full object-contain"
        />
      </div>
      {showText && <span className={cn('text-xl font-bold tracking-tight', wordmarkColor)}>WahaMath</span>}
    </div>
  );
}
