import { cn } from '@/lib/utils';

type Props = { className?: string; variant?: number; label?: string };

const INK = '#1a2230';
const INK_LIGHT = '#3b4658';
const BLUE = '#1e3a8a';
const RED = '#9a2a2a';
const TEAL = '#0d9488';

function MiniGraph({ variant }: { variant: number }) {
  const v = ((variant - 1) % 14) + 1;
  if (v === 1) {
    return (
      <g>
        <line x1="10" y1="60" x2="110" y2="60" stroke={INK} strokeWidth="0.6" opacity="0.5" />
        <line x1="60" y1="10" x2="60" y2="110" stroke={INK} strokeWidth="0.6" opacity="0.5" />
        <path d="M 15 95 Q 40 30 60 28 Q 80 26 105 95" stroke={BLUE} strokeWidth="1.2" fill="none" />
      </g>
    );
  }
  if (v === 2) {
    return (
      <g>
        <line x1="10" y1="100" x2="110" y2="100" stroke={INK} strokeWidth="0.6" opacity="0.5" />
        <line x1="10" y1="10" x2="10" y2="100" stroke={INK} strokeWidth="0.6" opacity="0.5" />
        <path d="M 10 90 L 30 70 L 50 58 L 70 52 L 90 49 L 110 48" stroke={BLUE} strokeWidth="1.2" fill="none" />
      </g>
    );
  }
  if (v === 3) {
    return (
      <g>
        <line x1="10" y1="60" x2="110" y2="60" stroke={INK} strokeWidth="0.6" opacity="0.5" />
        <line x1="60" y1="10" x2="60" y2="110" stroke={INK} strokeWidth="0.6" opacity="0.5" />
        <path d="M 15 95 Q 45 20 60 40 Q 75 55 90 30 Q 100 20 105 60" stroke={BLUE} strokeWidth="1.2" fill="none" />
      </g>
    );
  }
  if (v === 4) {
    return (
      <g stroke={INK} strokeWidth="0.6" opacity="0.6">
        <line x1="30" y1="55" x2="65" y2="35" />
        <line x1="30" y1="55" x2="65" y2="75" />
        <line x1="65" y1="35" x2="95" y2="25" />
        <line x1="65" y1="35" x2="95" y2="45" />
        <line x1="65" y1="75" x2="95" y2="65" />
        <line x1="65" y1="75" x2="95" y2="85" />
        <text x="20" y="60" fontSize="7" fill={INK} fontFamily="Georgia, serif">E</text>
      </g>
    );
  }
  if (v === 5) {
    return (
      <g>
        <line x1="10" y1="100" x2="110" y2="100" stroke={INK} strokeWidth="0.6" opacity="0.5" />
        <line x1="10" y1="10" x2="10" y2="100" stroke={INK} strokeWidth="0.6" opacity="0.5" />
        <path d="M 10 90 Q 50 80 60 50 Q 70 30 110 25" stroke={BLUE} strokeWidth="1.2" fill="none" />
      </g>
    );
  }
  if (v === 6) {
    return (
      <g stroke={INK} strokeWidth="0.6" fill="none" opacity="0.6">
        <polygon points="60,20 95,90 25,90" />
        <line x1="60" y1="20" x2="60" y2="90" strokeDasharray="2 2" />
      </g>
    );
  }
  if (v === 7) {
    return (
      <g>
        <line x1="10" y1="60" x2="110" y2="60" stroke={INK} strokeWidth="0.6" opacity="0.5" />
        <line x1="60" y1="10" x2="60" y2="110" stroke={INK} strokeWidth="0.6" opacity="0.5" />
        <path d="M 15 60 Q 30 50 45 60 Q 60 70 75 60 Q 90 55 105 60" stroke={BLUE} strokeWidth="1.2" fill="none" />
      </g>
    );
  }
  if (v === 8) {
    return (
      <g>
        <line x1="10" y1="100" x2="110" y2="100" stroke={INK} strokeWidth="0.6" opacity="0.5" />
        <line x1="10" y1="10" x2="10" y2="100" stroke={INK} strokeWidth="0.6" opacity="0.5" />
        <path d="M 10 95 Q 60 95 60 30 Q 60 95 110 95" stroke={BLUE} strokeWidth="1.2" fill="none" />
      </g>
    );
  }
  if (v === 9) {
    return (
      <g stroke={INK} strokeWidth="0.6" fill="none" opacity="0.6">
        <circle cx="60" cy="60" r="35" />
        <line x1="25" y1="60" x2="95" y2="60" />
        <line x1="60" y1="25" x2="60" y2="95" />
        <line x1="60" y1="60" x2="85" y2="40" stroke={BLUE} strokeWidth="1.2" />
      </g>
    );
  }
  if (v === 10) {
    return (
      <g>
        <line x1="10" y1="100" x2="110" y2="100" stroke={INK} strokeWidth="0.6" opacity="0.5" />
        <line x1="10" y1="10" x2="10" y2="100" stroke={INK} strokeWidth="0.6" opacity="0.5" />
        {[[20,90],[35,75],[50,65],[65,58],[80,54],[95,52]].map(([x,y],i)=>(
          <circle key={i} cx={x} cy={y} r="2" fill={BLUE} />
        ))}
      </g>
    );
  }
  if (v === 11) {
    return (
      <g>
        <line x1="10" y1="60" x2="110" y2="60" stroke={INK} strokeWidth="0.6" opacity="0.5" />
        <line x1="60" y1="10" x2="60" y2="110" stroke={INK} strokeWidth="0.6" opacity="0.5" />
        <path d="M 15 95 Q 45 95 60 35 Q 75 95 105 95" stroke={BLUE} strokeWidth="1.2" fill="none" />
      </g>
    );
  }
  if (v === 12) {
    return (
      <g stroke={INK} strokeWidth="0.6" fill="none" opacity="0.6">
        <polygon points="30,35 90,30 60,90" />
        <circle cx="58" cy="48" r="2.5" fill={RED} />
      </g>
    );
  }
  if (v === 13) {
    return (
      <g>
        <line x1="10" y1="100" x2="110" y2="100" stroke={INK} strokeWidth="0.6" opacity="0.5" />
        <line x1="10" y1="10" x2="10" y2="100" stroke={INK} strokeWidth="0.6" opacity="0.5" />
        <path d="M 10 95 Q 60 93 75 70 Q 90 45 110 30" stroke={TEAL} strokeWidth="1.2" fill="none" />
      </g>
    );
  }
  return (
    <g stroke={INK} strokeWidth="0.6" opacity="0.6">
      <line x1="30" y1="40" x2="90" y2="40" />
      <line x1="30" y1="70" x2="90" y2="70" />
      <line x1="30" y1="40" x2="30" y2="70" />
      <line x1="50" y1="40" x2="50" y2="70" />
      <line x1="70" y1="40" x2="70" y2="70" />
      <line x1="90" y1="40" x2="90" y2="70" />
    </g>
  );
}

export function ExerciseThumb({ className, variant = 1, label }: Props) {
  return (
    <div className={cn('relative overflow-hidden rounded-md bg-[#fbfaf7] ring-1 ring-border', className)}>
      <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-full w-full">
        <rect width="120" height="120" fill="#fbfaf7" />
        <line x1="20" y1="10" x2="20" y2="110" stroke={RED} strokeWidth="0.3" opacity="0.3" strokeDasharray="2 2" />
        <text x="28" y="22" fontSize="6" fontWeight="700" fill={INK} fontFamily="Georgia, serif">WahaMath</text>
        <line x1="28" y1="26" x2="105" y2="26" stroke={INK} strokeWidth="0.4" opacity="0.4" />
        <text x="28" y="36" fontSize="5" fill={INK_LIGHT} fontFamily="Georgia, serif">Exercice {variant}</text>
        <MiniGraph variant={variant} />
      </svg>
      {label && (
        <div className="absolute bottom-1 left-1 rounded bg-primary/90 px-1.5 py-0.5 text-[9px] font-medium text-primary-foreground">
          {label}
        </div>
      )}
    </div>
  );
}
