import { cn } from '@/lib/utils';

type Props = { className?: string };

export function MathMotifGrid({ className }: Props) {
  return (
    <svg
      className={cn('pointer-events-none', className)}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <defs>
        <pattern id="motif-grid" width="12" height="12" patternUnits="userSpaceOnUse">
          <path d="M 12 0 L 0 0 0 12" fill="none" stroke="currentColor" strokeWidth="0.4" opacity="0.25" />
        </pattern>
      </defs>
      <rect width="120" height="120" fill="url(#motif-grid)" />
      <circle cx="60" cy="60" r="3" fill="currentColor" opacity="0.3" />
      <line x1="20" y1="100" x2="100" y2="20" stroke="currentColor" strokeWidth="0.6" opacity="0.2" />
    </svg>
  );
}

export function MathMotifAxes({ className }: Props) {
  return (
    <svg
      className={cn('pointer-events-none', className)}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <line x1="10" y1="60" x2="110" y2="60" stroke="currentColor" strokeWidth="0.8" opacity="0.3" />
      <line x1="60" y1="10" x2="60" y2="110" stroke="currentColor" strokeWidth="0.8" opacity="0.3" />
      <path d="M 20 90 Q 45 30 100 40" stroke="currentColor" strokeWidth="1" opacity="0.35" fill="none" />
      <path d="M 25 70 L 35 70 L 35 80 L 25 80 Z" stroke="currentColor" strokeWidth="0.5" opacity="0.25" fill="none" />
      <text x="105" y="55" fontSize="6" fill="currentColor" opacity="0.3" fontFamily="serif">x</text>
      <text x="63" y="14" fontSize="6" fill="currentColor" opacity="0.3" fontFamily="serif">y</text>
    </svg>
  );
}

export function MathMotifFormula({ className }: Props) {
  return (
    <svg
      className={cn('pointer-events-none', className)}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <text x="20" y="40" fontSize="9" fill="currentColor" opacity="0.25" fontFamily="serif" fontStyle="italic">∫ f(x)dx</text>
      <text x="25" y="60" fontSize="8" fill="currentColor" opacity="0.2" fontFamily="serif">lim x→∞</text>
      <text x="30" y="80" fontSize="9" fill="currentColor" opacity="0.25" fontFamily="serif" fontStyle="italic">a² + b² = c²</text>
      <text x="20" y="100" fontSize="8" fill="currentColor" opacity="0.2" fontFamily="serif">Σ u(n)</text>
    </svg>
  );
}

export function MathMotifTriangle({ className }: Props) {
  return (
    <svg
      className={cn('pointer-events-none', className)}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <polygon points="60,15 105,100 15,100" stroke="currentColor" strokeWidth="0.8" opacity="0.3" fill="none" />
      <line x1="60" y1="15" x2="60" y2="100" stroke="currentColor" strokeWidth="0.4" opacity="0.2" strokeDasharray="2 2" />
      <circle cx="60" cy="15" r="2" fill="currentColor" opacity="0.3" />
      <circle cx="105" cy="100" r="2" fill="currentColor" opacity="0.3" />
      <circle cx="15" cy="100" r="2" fill="currentColor" opacity="0.3" />
    </svg>
  );
}

export function MathMotifSigma({ className }: Props) {
  return (
    <svg
      className={cn('pointer-events-none', className)}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <text x="40" y="70" fontSize="48" fill="currentColor" opacity="0.12" fontFamily="serif">Σ</text>
    </svg>
  );
}

export function MathMotifIntegral({ className }: Props) {
  return (
    <svg
      className={cn('pointer-events-none', className)}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <text x="38" y="80" fontSize="56" fill="currentColor" opacity="0.12" fontFamily="serif">∫</text>
    </svg>
  );
}

export function MathMotifPi({ className }: Props) {
  return (
    <svg
      className={cn('pointer-events-none', className)}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <text x="35" y="75" fontSize="44" fill="currentColor" opacity="0.12" fontFamily="serif">π</text>
    </svg>
  );
}

export const mathMotifs = [
  MathMotifGrid,
  MathMotifAxes,
  MathMotifFormula,
  MathMotifTriangle,
  MathMotifSigma,
  MathMotifIntegral,
  MathMotifPi,
];
