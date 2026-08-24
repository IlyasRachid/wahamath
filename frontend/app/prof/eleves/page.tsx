'use client';

import { useEffect, useState } from 'react';
import { cachedApiGet, invalidateCacheTags, peekApiCache } from '@/lib/api-cache';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { TeacherStudentRoster } from '@/components/shared/teacher-student-roster';

type ClassItem = { id: string; code: string; name: string; students: { id: string; display_name: string; status: string }[] };

export default function TeacherStudentsPage() {
  const cached = peekApiCache<{ items: ClassItem[] }>('/api/classes');
  const [classes, setClasses] = useState<ClassItem[]>(() => cached?.items ?? []);
  const [loading, setLoading] = useState(!cached);
  const [error, setError] = useState<string | null>(null);
  const refresh = async () => { invalidateCacheTags('classes'); const payload = await cachedApiGet<{ items: ClassItem[] }>('/api/classes', 5 * 60_000, ['classes']); setClasses(payload.items); };
  useEffect(() => { if (cached) return; void refresh().catch((reason) => setError(reason instanceof Error ? reason.message : 'Impossible de charger les élèves.')).finally(() => setLoading(false)); }, []);
  const removeStudent = (studentId: string) => { invalidateCacheTags('classes'); setClasses((current) => current.map((item) => ({ ...item, students: item.students.filter((student) => student.id !== studentId) }))); };
  return <div className="space-y-6"><PageHeader title="Élèves" subtitle="Consultez et gérez les élèves de toutes vos classes." />{loading ? <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">Chargement des élèves…</CardContent></Card> : error ? <Card><CardContent className="py-12 text-center text-sm text-destructive">{error}</CardContent></Card> : <TeacherStudentRoster classes={classes} onStudentDeleted={removeStudent} onStudentChanged={refresh} />}</div>;
}
