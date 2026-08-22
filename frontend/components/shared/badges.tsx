import { cn } from '@/lib/utils';
import { CheckCircle2, Circle, Clock, Lock } from 'lucide-react';
import type { Difficulty, ExerciseStatus, PublicationStatus, QuestionStatus } from '@/lib/types';

export function DifficultyBadge({ difficulty, className }: { difficulty: Difficulty; className?: string }) {
  const map: Record<Difficulty, { label: string; cls: string }> = {
    facile: { label: 'Facile', cls: 'bg-success/10 text-success border-success/20' },
    moyen: { label: 'Moyen', cls: 'bg-warning/10 text-warning border-warning/20' },
    difficile: { label: 'Difficile', cls: 'bg-destructive/10 text-destructive border-destructive/20' },
  };
  const { label, cls } = map[difficulty];
  return (
    <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium', cls, className)}>
      {label}
    </span>
  );
}

export function StatusBadge({ status, className }: { status: ExerciseStatus; className?: string }) {
  const map: Record<ExerciseStatus, { label: string; cls: string; icon: React.ReactNode }> = {
    nouveau: { label: 'Nouveau', cls: 'bg-accent/10 text-accent border-accent/20', icon: <Circle className="h-3 w-3" /> },
    consulte: { label: 'Déjà consulté', cls: 'bg-secondary text-secondary-foreground border-border', icon: <Circle className="h-3 w-3" /> },
    en_cours: { label: 'En cours', cls: 'bg-primary/10 text-primary border-primary/20', icon: <Clock className="h-3 w-3" /> },
    termine: { label: 'Terminé', cls: 'bg-success/10 text-success border-success/20', icon: <CheckCircle2 className="h-3 w-3" /> },
  };
  const { label, cls, icon } = map[status];
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium', cls, className)}>
      {icon}
      {label}
    </span>
  );
}

export function PublicationBadge({ status, className }: { status: PublicationStatus; className?: string }) {
  const map: Record<PublicationStatus, { label: string; cls: string }> = {
    publie: { label: 'Publié', cls: 'bg-success/10 text-success border-success/20' },
    brouillon: { label: 'Brouillon', cls: 'bg-secondary text-secondary-foreground border-border' },
    depublie: { label: 'Dépublié', cls: 'bg-destructive/10 text-destructive border-destructive/20' },
  };
  const { label, cls } = map[status];
  return (
    <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium', cls, className)}>
      {label}
    </span>
  );
}

export function QuestionStatusBadge({ status, className }: { status: QuestionStatus; className?: string }) {
  const map: Record<QuestionStatus, { label: string; cls: string; icon: React.ReactNode }> = {
    en_attente: { label: 'En attente', cls: 'bg-warning/10 text-warning border-warning/20', icon: <Clock className="h-3 w-3" /> },
    repondu: { label: 'Répondu', cls: 'bg-primary/10 text-primary border-primary/20', icon: <Circle className="h-3 w-3" /> },
    resolu: { label: 'Résolu', cls: 'bg-success/10 text-success border-success/20', icon: <CheckCircle2 className="h-3 w-3" /> },
  };
  const { label, cls, icon } = map[status];
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium', cls, className)}>
      {icon}
      {label}
    </span>
  );
}

export function LockedBadge({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full border border-border bg-secondary px-2.5 py-0.5 text-xs font-medium text-muted-foreground', className)}>
      <Lock className="h-3 w-3" />
      Discussion fermée
    </span>
  );
}
