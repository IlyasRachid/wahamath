'use client';

import Link from 'next/link';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Eye, FileText, MessageCircle } from 'lucide-react';
import type { Exercise } from '@/lib/types';
import { DifficultyBadge, StatusBadge } from './badges';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

type Props = {
  exercise: Exercise;
  href: string;
  className?: string;
};

export function ExerciseCard({ exercise, href, className }: Props) {
  const [previewOpen, setPreviewOpen] = useState(false);

  return (
    <div
      className={cn(
        'group flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md',
        className,
      )}
    >
      <div className="flex flex-1 flex-col p-3">
        <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
          <span className="font-medium text-primary">{exercise.classCode}</span>
          <span className="text-muted-foreground/50">·</span>
          <span className="truncate">{exercise.chapter}</span>
          <span className="ml-auto rounded-md bg-secondary px-1.5 py-0.5 text-[10px] font-bold text-primary">N°{exercise.number}</span>
        </div>

        <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">{exercise.title}</h3>

        <div className="mt-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5"><DifficultyBadge difficulty={exercise.difficulty} /><StatusBadge status={exercise.status} /></div>
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
        <Button asChild size="sm" className="mt-3 w-full"><Link href={href}><FileText className="h-4 w-4" />Ouvrir l'exercice</Link></Button>
      <Button size="sm" variant="outline" className="mt-2 w-full" disabled={!exercise.imageUrl} onClick={() => setPreviewOpen(true)}><Eye className="h-4 w-4" />Aperçu de l'exercice</Button>
      </div>
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader><DialogTitle>Aperçu : Exercice n°{exercise.number}</DialogTitle></DialogHeader>
          {exercise.imageUrl && <img src={exercise.imageUrl} alt={`Aperçu : ${exercise.title}`} className="max-h-[70vh] w-full rounded-md object-contain" />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
