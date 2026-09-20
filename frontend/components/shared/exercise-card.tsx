'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Eye, MessageCircle } from 'lucide-react';
import type { Exercise } from '@/lib/types';
import { ExerciseThumb } from '@/components/math/exercise-thumb';
import { DifficultyBadge, StatusBadge } from './badges';

type Props = {
  exercise: Exercise;
  href: string;
  className?: string;
};

export function ExerciseCard({ exercise, href, className }: Props) {
  return (
    <Link
      href={href}
      className={cn(
        'group flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md',
        className,
      )}
      >
      <div className="relative aspect-[4/3] overflow-hidden border-b border-border bg-secondary">
        {exercise.imageUrl ? (
          <img src={exercise.imageUrl} alt={`Aperçu : ${exercise.title}`} className="h-full w-full object-cover" />
        ) : (
          <ExerciseThumb variant={exercise.artVariant} className="h-full w-full rounded-none ring-0" />
        )}
        <div className="absolute left-2 top-2">
          <StatusBadge status={exercise.status} className="bg-card/90 backdrop-blur-sm" />
        </div>
        <div className="absolute right-2 top-2 rounded-md bg-card/90 px-1.5 py-0.5 text-[10px] font-bold text-primary backdrop-blur-sm">
          N°{exercise.number}
        </div>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
          <span className="font-medium text-primary">{exercise.classCode}</span>
          <span className="text-muted-foreground/50">·</span>
          <span className="truncate">{exercise.chapter}</span>
        </div>

        <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-foreground transition-colors group-hover:text-primary">
          {exercise.title}
        </h3>

        <div className="mt-3 flex items-center justify-between">
          <DifficultyBadge difficulty={exercise.difficulty} />
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Eye className="h-3.5 w-3.5" />
              {exercise.viewCount}
            </span>
            <span className="inline-flex items-center gap-1">
              <MessageCircle className="h-3.5 w-3.5" />
              {exercise.questionCount}
            </span>
          </div>
        </div>
        <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary">
          <Eye className="h-4 w-4" />
          Apercue de l'exerice
        </span>
      </div>
    </Link>
  );
}
