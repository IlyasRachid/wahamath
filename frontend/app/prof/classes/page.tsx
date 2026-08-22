'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, BookOpen, FileText, Users } from 'lucide-react';
import { cachedApiGet, invalidateCacheTags, peekApiCache } from '@/lib/api-cache';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MathMotifAxes, MathMotifGrid, MathMotifTriangle } from '@/components/math/motifs';
import { TeacherStudentRoster } from '@/components/shared/teacher-student-roster';

type ClassItem = { id: string; code: string; name: string; academic_year: string; exercise_count: number; student_count: number; chapters: { id: string; title: string }[]; students: { id: string; display_name: string; status: string }[] };
const motifs = [MathMotifAxes, MathMotifGrid, MathMotifTriangle];

export default function TeacherClassesPage() {
  const cachedClasses = peekApiCache<{ items: ClassItem[] }>('/api/classes');
  const [classes, setClasses] = useState<ClassItem[]>(() => cachedClasses?.items ?? []);
  const [loading, setLoading] = useState(!cachedClasses);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { (async () => {
    if (cachedClasses) return;
    try { const payload = await cachedApiGet<{ items: ClassItem[] }>('/api/classes', 5 * 60_000, ['classes']); setClasses(payload.items); }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Impossible de charger les classes.'); }
    finally { setLoading(false); }
  })(); }, []);
  const removeStudent = (studentId: string) => {
    invalidateCacheTags('classes');
    setClasses((current) => current.map((item) => {
      const students = item.students.filter((student) => student.id !== studentId);
      return students.length === item.students.length ? item : { ...item, students, student_count: students.length };
    }));
  };
  const refreshClasses = async () => {
    invalidateCacheTags('classes');
    const payload = await cachedApiGet<{ items: ClassItem[] }>('/api/classes', 5 * 60_000, ['classes']);
    setClasses(payload.items);
  };

  return <div className="space-y-6"><PageHeader title="Classes" subtitle="Vue d’ensemble de vos classes, leurs élèves et leur contenu." />
    {loading ? <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">Chargement des classes…</CardContent></Card>
      : error ? <Card className="border-destructive/20"><CardContent className="py-12 text-center text-sm text-destructive">{error}</CardContent></Card>
      : <><TeacherStudentRoster classes={classes} onStudentDeleted={removeStudent} onStudentChanged={refreshClasses} /><div className="grid gap-4 sm:grid-cols-2">{classes.map((item, index) => { const Motif = motifs[index % motifs.length]; return <Card key={item.id} className="overflow-hidden"><CardHeader className="relative"><div className="absolute -right-3 -top-3 h-24 w-24 text-primary/10"><Motif className="h-full w-full" /></div><div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">{item.code}</div><div><CardTitle className="text-base">{item.name}</CardTitle><p className="text-sm text-muted-foreground">Année scolaire {item.academic_year}</p></div></div></CardHeader><CardContent><div className="grid grid-cols-3 gap-3 text-center"><div className="rounded-lg bg-secondary/40 p-3"><BookOpen className="mx-auto h-4 w-4 text-primary" /><p className="mt-1 text-lg font-bold text-foreground">{item.chapters.length}</p><p className="text-xs text-muted-foreground">Chapitres</p></div><div className="rounded-lg bg-secondary/40 p-3"><FileText className="mx-auto h-4 w-4 text-primary" /><p className="mt-1 text-lg font-bold text-foreground">{item.exercise_count}</p><p className="text-xs text-muted-foreground">Exercices</p></div><div className="rounded-lg bg-secondary/40 p-3"><Users className="mx-auto h-4 w-4 text-primary" /><p className="mt-1 text-lg font-bold text-foreground">{item.student_count}</p><p className="text-xs text-muted-foreground">Élèves</p></div></div><div className="mt-4"><p className="mb-2 text-xs font-medium text-muted-foreground">Élèves inscrits</p><div className="flex flex-wrap gap-1.5">{item.students.length === 0 ? <p className="text-xs text-muted-foreground/70">Aucun élève inscrit</p> : item.students.map((student) => <span key={student.id} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-0.5 text-xs font-medium"><span className="h-2 w-2 rounded-full bg-primary" />{student.display_name}</span>)}</div></div><Link href={`/prof/exercices?classe=${item.code}`} className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary transition-all hover:gap-2.5">Gérer les exercices<ArrowRight className="h-4 w-4" /></Link></CardContent></Card>; })}</div></>}
  </div>;
}
