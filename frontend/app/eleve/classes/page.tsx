'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, BookOpen, FileText } from 'lucide-react';
import { cachedApiGet, peekApiCache } from '@/lib/api-cache';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MathMotifAxes, MathMotifGrid, MathMotifTriangle } from '@/components/math/motifs';

type ClassItem = { id: string; code: string; name: string; academic_year: string; exercise_count: number; chapters: { id: string; title: string }[] };
const motifs = [MathMotifAxes, MathMotifGrid, MathMotifTriangle];

export default function StudentClassesPage() {
  const cachedClasses = peekApiCache<{ items: ClassItem[] }>('/api/classes');
  const [classes, setClasses] = useState<ClassItem[]>(() => cachedClasses?.items ?? []);
  const [loading, setLoading] = useState(!cachedClasses);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { (async () => {
    if (cachedClasses) return;
    try { const payload = await cachedApiGet<{ items: ClassItem[] }>('/api/classes', 5 * 60_000, ['classes']); setClasses(payload.items); }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Impossible de charger vos classes.'); }
    finally { setLoading(false); }
  })(); }, []);

  return <div className="space-y-6">
    <PageHeader title="Mes classes" subtitle="Votre classe approuvée, ses chapitres et ses exercices publiés." />
    {loading ? <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">Chargement de votre classe…</CardContent></Card>
      : error ? <Card className="border-destructive/20"><CardContent className="py-12 text-center text-sm text-destructive">{error}</CardContent></Card>
      : classes.length === 0 ? <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">Aucune classe n’est encore associée à votre compte.</CardContent></Card>
      : <div className="space-y-4">{classes.map((item, index) => { const Motif = motifs[index % motifs.length]; return <Card key={item.id} className="overflow-hidden"><CardHeader className="flex flex-row items-center gap-4 space-y-0"><div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">{item.code}</div><div className="flex-1"><CardTitle className="text-base">{item.name}</CardTitle><p className="text-sm text-muted-foreground">Année scolaire {item.academic_year}</p></div><div className="hidden text-right text-sm text-muted-foreground sm:block"><p>{item.chapters.length} chapitres</p><p>{item.exercise_count} exercices</p></div></CardHeader><CardContent><div className="relative"><div className="absolute -right-2 -top-2 h-20 w-20 text-primary/10"><Motif className="h-full w-full" /></div><div className="flex flex-wrap gap-2">{item.chapters.map((chapter) => <Link key={chapter.id} href={`/eleve/exercices?chapter=${encodeURIComponent(chapter.title)}`} className="group flex items-center gap-2 rounded-lg border border-border bg-secondary/40 px-3 py-2 text-sm transition-colors hover:border-primary/30 hover:bg-secondary"><BookOpen className="h-3.5 w-3.5 text-primary" /><span className="font-medium text-foreground">{chapter.title}</span></Link>)}</div><Link href="/eleve/exercices" className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary transition-all hover:gap-2.5"><FileText className="h-4 w-4" />Voir les {item.exercise_count} exercices<ArrowRight className="h-4 w-4" /></Link></div></CardContent></Card>; })}</div>}
  </div>;
}
