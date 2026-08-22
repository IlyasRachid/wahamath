'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import { ArrowRight, BookOpen, FileText } from 'lucide-react';
import { MathMotifAxes, MathMotifGrid, MathMotifTriangle } from '@/components/math/motifs';

type Props = {
  code: string;
  label: string;
  description: string;
  chapterCount: number;
  exerciseCount: number;
  href: string;
  motifIndex?: number;
  className?: string;
};

const motifs = [MathMotifAxes, MathMotifGrid, MathMotifTriangle];

export function ClassCard({ code, label, description, chapterCount, exerciseCount, href, motifIndex = 0, className }: Props) {
  const Motif = motifs[motifIndex % motifs.length];
  return (
    <Link
      href={href}
      className={cn(
        'group relative overflow-hidden rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md',
        className,
      )}
    >
      <div className="absolute -right-4 -top-4 h-24 w-24 text-primary/20 transition-opacity group-hover:opacity-40">
        <Motif className="h-full w-full" />
      </div>
      <div className="relative">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-9 items-center rounded-lg bg-primary px-2.5 text-sm font-bold text-primary-foreground">
            {code}
          </span>
          <div>
            <p className="text-sm font-semibold text-foreground">{label}</p>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        </div>

        <div className="mt-5 flex items-center gap-4 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <BookOpen className="h-3.5 w-3.5" />
            {chapterCount} chapitres
          </span>
          <span className="inline-flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5" />
            {exerciseCount} exercices
          </span>
        </div>

        <div className="mt-4 flex items-center gap-1 text-sm font-medium text-primary transition-colors group-hover:gap-2">
          Voir les exercices
          <ArrowRight className="h-4 w-4" />
        </div>
      </div>
    </Link>
  );
}
