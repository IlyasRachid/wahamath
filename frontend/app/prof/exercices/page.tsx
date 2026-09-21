'use client';

import { apiUrl } from '@/lib/api-url';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Eye, FileX, Loader2, Plus, Send, Trash2, Undo2 } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { cachedApiGet, invalidateApiCache, peekApiCache } from '@/lib/api-cache';
import type { Exercise, PublicationStatus } from '@/lib/types';
import { PageHeader } from '@/components/shared/page-header';
import { SearchInput } from '@/components/shared/search-input';
import { FilterBar, type FilterOption } from '@/components/shared/filter-bar';
import { DifficultyBadge, PublicationBadge } from '@/components/shared/badges';
import { EmptyState } from '@/components/shared/empty-state';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

const difficultyOptions: FilterOption[] = [
  { label: 'Toutes difficultés', value: 'all' }, { label: 'Facile', value: 'facile' },
  { label: 'Moyen', value: 'moyen' }, { label: 'Difficile', value: 'difficile' },
];
const publicationOptions: FilterOption[] = [
  { label: 'Tous les statuts', value: 'all' }, { label: 'Publiés', value: 'publie' },
  { label: 'Brouillons', value: 'brouillon' }, { label: 'Dépubliés', value: 'depublie' },
];

type ClassItem = { code: string; chapters: { id: string; title: string }[] };

const dateValue = (value?: string) => value ? new Date(value).getTime() : Number.MAX_SAFE_INTEGER;

function toExercise(item: any, index: number): Exercise {
  return {
    id: item.id, number: index + 1, title: item.title, classCode: item.classes?.code ?? '', chapter: item.chapters?.title ?? 'Sans chapitre', difficulty: item.difficulty,
    status: 'nouveau', publicationStatus: item.publication_status, viewCount: 0, questionCount: 0, publishedAt: item.published_at ?? '', createdAt: item.created_at ?? item.published_at ?? '', tags: item.tags ?? [], artVariant: 1, imageUrl: item.image_url,
  };
}

export default function TeacherExercisesPage() {
  const searchParams = useSearchParams();
  const requestedClass = searchParams.get('classe') ?? 'all';
  const requestedSearch = searchParams.get('q') ?? '';
  const cachedExercises = peekApiCache<{ items: any[] }>('/api/exercises');
  const cachedClasses = peekApiCache<{ items: ClassItem[] }>('/api/classes');
  const [exercises, setExercises] = useState<Exercise[]>(() => cachedExercises ? cachedExercises.items.map(toExercise) : []);
  const [loading, setLoading] = useState(!cachedExercises || !cachedClasses);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState(requestedSearch);
  const [classFilter, setClassFilter] = useState(requestedClass);
  const [chapterFilter, setChapterFilter] = useState('all');
  const [difficultyFilter, setDifficultyFilter] = useState('all');
  const [publicationFilter, setPublicationFilter] = useState('all');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [exerciseToDelete, setExerciseToDelete] = useState<Exercise | null>(null);
  const [previewExercise, setPreviewExercise] = useState<Exercise | null>(null);
  const [classes, setClasses] = useState<ClassItem[]>(() => cachedClasses?.items ?? []);
  const [classOptions, setClassOptions] = useState<FilterOption[]>(() => cachedClasses ? [{ label: 'Toutes les classes', value: 'all' }, ...cachedClasses.items.map((item) => ({ label: item.code, value: item.code }))] : [{ label: 'Toutes les classes', value: 'all' }]);
  const { toast } = useToast();

  useEffect(() => {
    const loadExercises = async () => {
      if (cachedExercises && cachedClasses) return;
      try {
        const [payload, classesPayload] = await Promise.all([cachedApiGet<{ items: any[] }>('/api/exercises', 5 * 60_000, ['exercises']), cachedApiGet<{ items: ClassItem[] }>('/api/classes', 5 * 60_000, ['classes'])]);
        setExercises(payload.items.map(toExercise));
        setClasses(classesPayload.items);
        setClassOptions([{ label: 'Toutes les classes', value: 'all' }, ...classesPayload.items.map((item) => ({ label: item.code, value: item.code }))]);
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : 'Impossible de charger les exercices.');
      } finally { setLoading(false); }
    };
    loadExercises();
  }, []);

  useEffect(() => {
    setClassFilter(requestedClass);
    setChapterFilter('all');
  }, [requestedClass]);

  useEffect(() => {
    setSearch(requestedSearch);
  }, [requestedSearch]);

  const request = async (path: string, options: RequestInit) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Veuillez vous reconnecter.');
    const response = await fetch(`${apiUrl}${path}`, { ...options, headers: { Authorization: `Bearer ${session.access_token}`, ...(options.headers ?? {}) } });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.detail ?? 'Une erreur est survenue.');
    return payload;
  };

  const changePublication = async (exercise: Exercise, publicationStatus: PublicationStatus) => {
    setBusyId(exercise.id);
    try {
      const updated = await request(`/api/exercises/${exercise.id}/publication`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ publication_status: publicationStatus }) });
      invalidateApiCache('/api/exercises', ['exercises']);
      setExercises((current) => current.map((item) => item.id === exercise.id ? { ...item, publicationStatus: updated.publication_status, publishedAt: updated.published_at ?? item.publishedAt } : item));
      toast({ title: publicationStatus === 'publie' ? 'Exercice publié' : 'Exercice dépublié' });
    } catch (requestError) {
      toast({ variant: 'destructive', title: 'Action impossible', description: requestError instanceof Error ? requestError.message : undefined });
    } finally { setBusyId(null); }
  };

  const removeExercise = async () => {
    if (!exerciseToDelete) return;
    const exercise = exerciseToDelete;
    setBusyId(exercise.id);
    try {
      await request(`/api/exercises/${exercise.id}`, { method: 'DELETE' });
      invalidateApiCache('/api/exercises', ['exercises']);
      invalidateApiCache('/api/classes', ['classes']);
      setExercises((current) => current.filter((item) => item.id !== exercise.id));
      setExerciseToDelete(null);
      toast({ title: 'Exercice supprimé', description: 'L’exercice, son image et ses commentaires ont été retirés.' });
    } catch (requestError) {
      toast({ variant: 'destructive', title: 'Suppression impossible', description: requestError instanceof Error ? requestError.message : undefined });
    } finally { setBusyId(null); }
  };

  const chapterOptions = useMemo<FilterOption[]>(() => {
    const selectedClass = classes.find((item) => item.code === classFilter);
    return [{ label: 'Tous les chapitres', value: 'all' }, ...(selectedClass?.chapters.map((chapter) => ({ label: chapter.title, value: chapter.title })) ?? [])];
  }, [classes, classFilter]);

  const filtered = useMemo(() => {
    const matches = exercises.filter((exercise) => {
      const query = search.toLowerCase();
      return (!query || exercise.title.toLowerCase().includes(query) || exercise.chapter.toLowerCase().includes(query) || exercise.tags.some((tag) => tag.toLowerCase().includes(query)))
        && (classFilter === 'all' || exercise.classCode === classFilter)
        && (chapterFilter === 'all' || exercise.chapter === chapterFilter)
        && (difficultyFilter === 'all' || exercise.difficulty === difficultyFilter)
        && (publicationFilter === 'all' || exercise.publicationStatus === publicationFilter);
    });

    return matches.sort((left, right) => dateValue(left.createdAt ?? left.publishedAt) - dateValue(right.createdAt ?? right.publishedAt));
  }, [exercises, search, classFilter, chapterFilter, difficultyFilter, publicationFilter]);
  return <div className="space-y-6">
    <PageHeader title="Exercices" subtitle="Gérez les brouillons et les exercices visibles par vos élèves." />
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <SearchInput value={search} onChange={setSearch} placeholder="Rechercher un exercice..." className="max-w-md" />
      <Button asChild className="sm:shrink-0"><Link href="/prof/ajouter"><Plus className="h-4 w-4" />Ajouter un exercice</Link></Button>
    </div>
    <FilterBar filters={[
      { label: 'Classe', value: classFilter, options: classOptions, onChange: (value) => { setClassFilter(value); setChapterFilter('all'); } },
      { label: 'Chapitres', value: chapterFilter, options: chapterOptions, onChange: setChapterFilter, disabled: classFilter === 'all' },
      { label: 'Difficulté', value: difficultyFilter, options: difficultyOptions, onChange: setDifficultyFilter },
      { label: 'Publication', value: publicationFilter, options: publicationOptions, onChange: setPublicationFilter },
    ]} />
    {loading ? <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">Chargement des exercices…</CardContent></Card>
      : error ? <Card className="border-destructive/20"><CardContent className="py-12 text-center text-sm text-destructive">{error}</CardContent></Card>
      : filtered.length === 0 ? <EmptyState icon={FileX} title="Aucun exercice trouvé" description="Aucun exercice ne correspond à vos critères." />
      : <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{filtered.map((exercise) => {
        const busy = busyId === exercise.id;
        const isPublished = exercise.publicationStatus === 'publie';
        return <Card key={exercise.id} className="overflow-hidden">
          <CardContent className="space-y-2.5 p-3">
            <div><p className="text-xs font-medium text-primary">{exercise.classCode} · {exercise.chapter}</p><h2 className="mt-1 text-sm font-semibold text-foreground">{exercise.title}</h2></div>
            <div className="flex items-center justify-between"><DifficultyBadge difficulty={exercise.difficulty} /><PublicationBadge status={exercise.publicationStatus} /></div>
            <Button size="sm" variant="outline" className="w-full" disabled={!exercise.imageUrl} onClick={() => setPreviewExercise(exercise)}><Eye className="h-4 w-4" />Aperçu de l'exercice</Button>
            <div className="grid grid-cols-2 gap-2">
              <Button asChild variant="outline" size="sm"><Link href={`/prof/exercices/${exercise.id}`}><Eye className="h-4 w-4" />Ouvrir l'exercice</Link></Button>
              <Button size="sm" variant={isPublished ? 'secondary' : 'default'} disabled={busy} onClick={() => changePublication(exercise, isPublished ? 'depublie' : 'publie')}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : isPublished ? <Undo2 className="h-4 w-4" /> : <Send className="h-4 w-4" />}{isPublished ? 'Dépublier' : 'Publier'}
              </Button>
            </div>
            <Button size="sm" variant="ghost" className="w-full text-destructive hover:text-destructive" disabled={busy} onClick={() => setExerciseToDelete(exercise)}><Trash2 className="h-4 w-4" />Supprimer l'exercice</Button>
          </CardContent>
        </Card>;
      })}</div>}
    <Dialog open={Boolean(previewExercise)} onOpenChange={(open) => !open && setPreviewExercise(null)}>
      <DialogContent className="max-w-4xl">
        <DialogHeader><DialogTitle>Aperçu : Exercice n°{previewExercise?.number}</DialogTitle></DialogHeader>
        {previewExercise?.imageUrl && <img src={previewExercise.imageUrl} alt={`Aperçu : ${previewExercise.title}`} className="max-h-[70vh] w-full rounded-md object-contain" />}
      </DialogContent>
    </Dialog>
    <AlertDialog open={Boolean(exerciseToDelete)} onOpenChange={(open) => !open && setExerciseToDelete(null)}>
      <AlertDialogContent>
        <AlertDialogHeader><AlertDialogTitle>Supprimer cet exercice ?</AlertDialogTitle><AlertDialogDescription>Cette action retire définitivement l’exercice, son image et les commentaires associés. Elle ne peut pas être annulée.</AlertDialogDescription></AlertDialogHeader>
        <AlertDialogFooter><AlertDialogCancel disabled={Boolean(busyId)}>Annuler</AlertDialogCancel><AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={Boolean(busyId)} onClick={removeExercise}>{busyId ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}Supprimer définitivement</AlertDialogAction></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>;
}
