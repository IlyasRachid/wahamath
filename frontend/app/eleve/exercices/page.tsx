'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ArrowDownWideNarrow, ArrowUpWideNarrow, FileX } from 'lucide-react';
import type { Exercise } from '@/lib/types';
import { cachedApiGet, peekApiCache } from '@/lib/api-cache';
import { ExerciseCard } from '@/components/shared/exercise-card';
import { SearchInput } from '@/components/shared/search-input';
import { FilterBar, type FilterOption } from '@/components/shared/filter-bar';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const difficultyOptions: FilterOption[] = [
  { label: 'Toutes difficultés', value: 'all' },
  { label: 'Facile', value: 'facile' },
  { label: 'Moyen', value: 'moyen' },
  { label: 'Difficile', value: 'difficile' },
];

const PAGE_SIZE = 5;

export default function ExercisesPage() {
  const searchParams = useSearchParams();
  const requestedChapter = searchParams.get('chapter') ?? 'all';
  const requestedClass = searchParams.get('class') ?? 'all';
  const requestedSearch = searchParams.get('q') ?? '';
  const [search, setSearch] = useState(requestedSearch);
  const [chapterFilter, setChapterFilter] = useState(requestedChapter);
  const [classFilter, setClassFilter] = useState(requestedClass);
  const [difficultyFilter, setDifficultyFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState<'default' | 'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const cachedExercises = peekApiCache<{ items: any[] }>('/api/exercises');
  const cachedClasses = peekApiCache<{ items: { chapters: { id: string; title: string }[] }[] }>('/api/classes');
  const toExercises = (items: any[]) => {
    const mapped: Exercise[] = items.map((item: any) => ({
      id: item.id, number: 0, title: item.title, classCode: item.classes?.code ?? '', chapter: item.chapters?.title ?? 'Sans chapitre', difficulty: item.difficulty, status: 'nouveau' as const, publicationStatus: item.publication_status, viewCount: 0, questionCount: 0, publishedAt: item.published_at, createdAt: item.created_at ?? item.published_at, tags: item.tags ?? [], artVariant: 1, imageUrl: item.image_url,
    }));
    const ordered = [...mapped].sort((left, right) => {
      const leftTime = new Date(left.createdAt ?? left.publishedAt).getTime();
      const rightTime = new Date(right.createdAt ?? right.publishedAt).getTime();
      return left.classCode.localeCompare(right.classCode) || left.chapter.localeCompare(right.chapter, 'fr') || leftTime - rightTime;
    });
    const numbers = new Map<string, number>();
    let group = '';
    let number = 0;
    for (const exercise of ordered) {
      const key = `${exercise.classCode}\u0000${exercise.chapter}`;
      if (key !== group) { group = key; number = 0; }
      numbers.set(exercise.id, ++number);
    }
    return mapped.map((exercise) => ({ ...exercise, number: numbers.get(exercise.id) ?? 1 }));
  };
  const [exercises, setExercises] = useState<Exercise[]>(() => cachedExercises ? toExercises(cachedExercises.items) : []);
  const [loading, setLoading] = useState(!cachedExercises);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [classChapters, setClassChapters] = useState<{ id: string; title: string }[]>(() => cachedClasses?.items.flatMap((item) => item.chapters) ?? []);

  useEffect(() => {
    const loadExercises = async () => {
      if (cachedExercises) return;
      try {
        const payload = await cachedApiGet<{ items: any[] }>('/api/exercises', 5 * 60_000, ['exercises']);
        setExercises(toExercises(payload.items));
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : 'Impossible de charger les exercices.');
      } finally {
        setLoading(false);
      }
    };
    loadExercises();
  }, []);

  useEffect(() => {
    const loadChapters = async () => {
      if (cachedClasses) return;
      try {
        const payload = await cachedApiGet<{ items: { chapters: { id: string; title: string }[] }[] }>('/api/classes', 5 * 60_000, ['classes']);
        setClassChapters(payload.items.flatMap((item) => item.chapters));
      } catch {
        // Exercises stay usable if the chapter metadata is temporarily unavailable.
      }
    };
    void loadChapters();
  }, []);

  useEffect(() => {
    setChapterFilter(requestedChapter);
    setClassFilter(requestedClass);
    setPage(1);
  }, [requestedChapter, requestedClass]);

  useEffect(() => {
    setSearch(requestedSearch);
    setPage(1);
  }, [requestedSearch]);

  const filtered = useMemo(() => {
    // The server is the authority for publication and class access. At this
    // point every returned item is available to the connected student.
    let result = [...exercises];
    if (classFilter !== 'all') result = result.filter((e) => e.classCode === classFilter);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (e) => e.title.toLowerCase().includes(q) || e.chapter.toLowerCase().includes(q) || e.tags.some((t) => t.includes(q)),
      );
    }
    if (chapterFilter !== 'all') result = result.filter((e) => e.chapter === chapterFilter);
    if (difficultyFilter !== 'all') result = result.filter((e) => e.difficulty === difficultyFilter);

    if (sortOrder !== 'default') {
      const exerciseNumber = (title: string) => Number(title.match(/\d+/)?.[0] ?? Number.MAX_SAFE_INTEGER);
      result.sort((left, right) => {
        const groupComparison = left.classCode.localeCompare(right.classCode, 'fr') || left.chapter.localeCompare(right.chapter, 'fr');
        if (groupComparison) return groupComparison;
        const numberComparison = exerciseNumber(left.title) - exerciseNumber(right.title);
        return (sortOrder === 'asc' ? numberComparison : -numberComparison) || left.title.localeCompare(right.title, 'fr');
      });
    }
    return result;
  }, [exercises, search, classFilter, chapterFilter, difficultyFilter, sortOrder]);
  const chapterOptions: FilterOption[] = useMemo(() => [
    { label: 'Tous les chapitres', value: 'all' },
    ...Array.from(new Set(classChapters.map((chapter) => chapter.title))).sort((a, b) => a.localeCompare(b, 'fr')).map((chapter) => ({ label: chapter, value: chapter })),
  ], [classChapters]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const resetPage = () => setPage(1);

  return (
    <div className="space-y-6">
      <PageHeader title="Exercices" subtitle="Parcourez tous les exercices disponibles par classe, chapitre et difficulté." />

      {/* Search */}
      <SearchInput
        value={search}
        onChange={(v) => { setSearch(v); resetPage(); }}
        placeholder="Rechercher un exercice, un chapitre, un tag..."
        className="max-w-md"
      />
      {/* Filters */}
      <div className="flex min-w-0 items-center gap-2">
      <FilterBar className="min-w-0 flex-1"
        filters={[
          { label: 'Niveau', value: classFilter, options: [{ label: 'Tous les niveaux', value: 'all' }, ...Array.from(new Set(exercises.map((exercise) => exercise.classCode).filter(Boolean))).sort().map((code) => ({ label: code, value: code }))], onChange: (v) => { setClassFilter(v); resetPage(); } },
          { label: 'Chapitre', value: chapterFilter, options: chapterOptions, onChange: (v) => { setChapterFilter(v); resetPage(); } },
          { label: 'Difficulté', value: difficultyFilter, options: difficultyOptions, onChange: (v) => { setDifficultyFilter(v); resetPage(); } },
        ]}
      />
      <Button type="button" variant="outline" className="shrink-0 whitespace-nowrap" onClick={() => { setSortOrder((current) => current === 'asc' ? 'desc' : 'asc'); resetPage(); }}>
        {sortOrder === 'desc' ? <ArrowUpWideNarrow className="h-4 w-4" /> : <ArrowDownWideNarrow className="h-4 w-4" />}Trier par numéro {sortOrder === 'asc' ? 'décroissant' : 'croissant'}
      </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        {filtered.length} exercice{filtered.length > 1 ? 's' : ''} trouvé{filtered.length > 1 ? 's' : ''}
      </p>

      {/* Grid */}
      {loading ? (
        <div className="rounded-xl border border-border bg-card px-6 py-12 text-center text-sm text-muted-foreground">Chargement des exercices…</div>
      ) : loadError ? (
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-6 py-12 text-center text-sm text-destructive">{loadError}</div>
      ) : paged.length === 0 ? (
        <EmptyState
          icon={FileX}
          title="Aucun exercice trouvé"
          description="Essayez de modifier vos filtres ou votre recherche pour trouver des exercices."
          action={<Button variant="outline" onClick={() => { setSearch(''); setChapterFilter('all'); setDifficultyFilter('all'); resetPage(); }}>Réinitialiser les filtres</Button>}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {paged.map((ex) => (
            <ExerciseCard key={ex.id} exercise={ex} href={`/eleve/exercices/${ex.id}`} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft className="h-4 w-4" />
            Précédent
          </Button>
          <span className="px-3 text-sm text-muted-foreground">
            Page {page} sur {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page === totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Suivant
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
