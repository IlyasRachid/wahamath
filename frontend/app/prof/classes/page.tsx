'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, BookOpen, FileText, Loader2, Plus, Trash2 } from 'lucide-react';
import { apiUrl } from '@/lib/api-url';
import { cachedApiGet, invalidateCacheTags, peekApiCache } from '@/lib/api-cache';
import { supabase } from '@/lib/supabase/client';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { MathMotifAxes, MathMotifGrid, MathMotifTriangle } from '@/components/math/motifs';
import { toast } from 'sonner';

type ClassItem = { id: string; code: string; name: string; academic_year: string; exercise_count: number; chapters: { id: string; title: string }[] };
const motifs = [MathMotifAxes, MathMotifGrid, MathMotifTriangle];

function ChapterManager({ item, refresh }: { item: ClassItem; refresh: () => Promise<void> }) {
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const [target, setTarget] = useState<{ id: string; title: string } | null>(null);
  const request = async (path: string, options: RequestInit) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Veuillez vous reconnecter.');
    const response = await fetch(`${apiUrl}${path}`, { ...options, headers: { Authorization: `Bearer ${session.access_token}`, ...(options.headers ?? {}) } });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.detail ?? 'Action impossible.');
  };
  const create = async () => { if (!title.trim()) return; setSaving(true); try { await request(`/api/classes/${item.id}/chapters`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: title.trim() }) }); setTitle(''); await refresh(); toast.success(`Chapitre ajouté à ${item.code}.`); } catch (error) { toast.error(error instanceof Error ? error.message : 'Impossible de créer le chapitre.'); } finally { setSaving(false); } };
  const remove = async () => { if (!target) return; setSaving(true); try { await request(`/api/classes/${item.id}/chapters/${target.id}`, { method: 'DELETE' }); await refresh(); setTarget(null); toast.success('Chapitre supprimé.'); } catch (error) { toast.error(error instanceof Error ? error.message : 'Impossible de supprimer le chapitre.'); } finally { setSaving(false); } };
  return <div className="mt-5 border-t border-border pt-4"><p className="mb-2 text-xs font-medium text-muted-foreground">Chapitres</p><div className="flex flex-wrap gap-1.5">{item.chapters.length ? item.chapters.map((chapter) => <span key={chapter.id} className="inline-flex items-center gap-1 rounded-full bg-secondary py-1 pl-2.5 pr-1 text-xs font-medium text-foreground">{chapter.title}<button type="button" onClick={() => setTarget(chapter)} className="rounded-full p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" aria-label={`Supprimer ${chapter.title}`}><Trash2 className="h-3 w-3" /></button></span>) : <span className="text-xs text-muted-foreground">Aucun chapitre</span>}</div><div className="mt-3 flex gap-2"><Input value={title} onChange={(event) => setTitle(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void create(); }} placeholder={`Nouveau chapitre pour ${item.code}`} maxLength={100} /><Button size="sm" onClick={() => void create()} disabled={saving || !title.trim()}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}Ajouter</Button></div><AlertDialog open={Boolean(target)} onOpenChange={(open) => !open && setTarget(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Supprimer « {target?.title} » ?</AlertDialogTitle><AlertDialogDescription>La suppression est possible seulement si le chapitre ne contient aucun exercice publié. Les brouillons et exercices dépubliés seront conservés sans chapitre.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={saving}>Annuler</AlertDialogCancel><AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => void remove()} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}Supprimer</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></div>;
}

export default function TeacherClassesPage() {
  const cached = peekApiCache<{ items: ClassItem[] }>('/api/classes');
  const [classes, setClasses] = useState<ClassItem[]>(() => cached?.items ?? []);
  const [loading, setLoading] = useState(!cached);
  const [error, setError] = useState<string | null>(null);
  const refresh = async () => { invalidateCacheTags('classes'); const payload = await cachedApiGet<{ items: ClassItem[] }>('/api/classes', 5 * 60_000, ['classes']); setClasses(payload.items); };
  useEffect(() => { if (cached) return; void refresh().catch((reason) => setError(reason instanceof Error ? reason.message : 'Impossible de charger les classes.')).finally(() => setLoading(false)); }, []);
  return <div className="space-y-6"><PageHeader title="Classes" subtitle="Gérez les chapitres et les exercices de chaque classe." />{loading ? <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">Chargement des classes…</CardContent></Card> : error ? <Card><CardContent className="py-12 text-center text-sm text-destructive">{error}</CardContent></Card> : <div className="grid gap-4 sm:grid-cols-2">{classes.map((item, index) => { const Motif = motifs[index % motifs.length]; return <Card key={item.id} className="overflow-hidden"><CardHeader className="relative"><div className="absolute -right-3 -top-3 h-24 w-24 text-primary/10"><Motif className="h-full w-full" /></div><div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">{item.code}</div><div><CardTitle className="text-base">{item.name}</CardTitle><p className="text-sm text-muted-foreground">Année scolaire {item.academic_year}</p></div></div></CardHeader><CardContent><div className="grid grid-cols-2 gap-3 text-center"><div className="rounded-lg bg-secondary/40 p-3"><BookOpen className="mx-auto h-4 w-4 text-primary" /><p className="mt-1 text-lg font-bold text-foreground">{item.chapters.length}</p><p className="text-xs text-muted-foreground">Chapitres</p></div><div className="rounded-lg bg-secondary/40 p-3"><FileText className="mx-auto h-4 w-4 text-primary" /><p className="mt-1 text-lg font-bold text-foreground">{item.exercise_count}</p><p className="text-xs text-muted-foreground">Exercices</p></div></div><ChapterManager item={item} refresh={refresh} /><Link href={`/prof/exercices?classe=${item.code}`} className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary transition-all hover:gap-2.5">Gérer les exercices<ArrowRight className="h-4 w-4" /></Link></CardContent></Card>; })}</div>}</div>;
}
