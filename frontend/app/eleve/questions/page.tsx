'use client';

import { apiUrl } from '@/lib/api-url';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { HelpCircle, Lock, MessageCircle, Search } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { cachedApiGet } from '@/lib/api-cache';
import type { QuestionStatus } from '@/lib/types';
import { PageHeader } from '@/components/shared/page-header';
import { QuestionStatusBadge } from '@/components/shared/badges';
import { EmptyState } from '@/components/shared/empty-state';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

type Question = { id: string; exercise_id: string; exercise_title: string; body: string; reply_count: number; is_resolved: boolean; is_locked: boolean; created_at: string };

function timeAgo(iso: string) {
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 3600) return `il y a ${Math.max(1, Math.floor(seconds / 60))} min`;
  if (seconds < 86400) return `il y a ${Math.floor(seconds / 3600)} h`;
  return `il y a ${Math.floor(seconds / 86400)} j`;
}

function status(question: Question): QuestionStatus {
  return question.is_resolved ? 'resolu' : question.reply_count > 0 ? 'repondu' : 'en_attente';
}

export default function StudentQuestionsPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState('toutes');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const payload = await cachedApiGet<{ items: Question[] }>('/api/questions', 60_000, ['questions']);
        setQuestions(payload.items);
      } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Impossible de charger vos questions.'); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  const filtered = useMemo(() => questions.filter((question) => {
    const currentStatus = status(question);
    const query = search.trim().toLowerCase();
    return (!query || question.body.toLowerCase().includes(query) || question.exercise_title.toLowerCase().includes(query))
      && (tab === 'toutes' || (tab === 'en_attente' && currentStatus === 'en_attente') || (tab === 'repondues' && currentStatus === 'repondu') || (tab === 'resolues' && currentStatus === 'resolu'));
  }), [questions, search, tab]);

  return <div className="space-y-6">
    <PageHeader title="Mes questions" subtitle="Suivez les discussions que vous avez ouvertes sur vos exercices." />
    <div className="relative max-w-md"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher une question..." className="pl-9" /></div>
    <Tabs value={tab} onValueChange={setTab}>
      <TabsList className="w-full justify-start overflow-x-auto no-scrollbar sm:w-auto"><TabsTrigger value="toutes">Toutes</TabsTrigger><TabsTrigger value="en_attente">En attente</TabsTrigger><TabsTrigger value="repondues">Répondues</TabsTrigger><TabsTrigger value="resolues">Résolues</TabsTrigger></TabsList>
      <TabsContent value={tab} className="mt-4">
        {loading ? <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">Chargement des questions…</CardContent></Card>
          : error ? <Card className="border-destructive/20"><CardContent className="py-12 text-center text-sm text-destructive">{error}</CardContent></Card>
          : filtered.length === 0 ? <EmptyState icon={HelpCircle} title="Aucune question" description="Vous n'avez pas encore posé de question dans cette catégorie." />
          : <div className="space-y-3">{filtered.map((question) => <Link key={question.id} href={`/eleve/exercices/${question.exercise_id}`}><Card className="transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"><CardContent className="p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0 flex-1"><p className="text-xs font-medium text-primary">{question.exercise_title}</p><p className="mt-1 line-clamp-2 text-sm font-medium text-foreground">{question.body}</p><div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground"><span>{timeAgo(question.created_at)}</span><span>·</span><span className="inline-flex items-center gap-1"><MessageCircle className="h-3 w-3" />{question.reply_count} réponse{question.reply_count > 1 ? 's' : ''}</span>{question.is_locked && <span className="inline-flex items-center gap-1"><Lock className="h-3 w-3" />Fermée</span>}</div></div><QuestionStatusBadge status={status(question)} /></div></CardContent></Card></Link>)}</div>}
      </TabsContent>
    </Tabs>
  </div>;
}
