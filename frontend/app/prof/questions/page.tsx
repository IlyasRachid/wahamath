'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, HelpCircle, Loader2, Lock, MessageCircle, Send } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { cachedApiGet, invalidateCacheTags } from '@/lib/api-cache';
import type { QuestionStatus } from '@/lib/types';
import { PageHeader } from '@/components/shared/page-header';
import { QuestionStatusBadge } from '@/components/shared/badges';
import { EmptyState } from '@/components/shared/empty-state';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

type Question = { id: string; exercise_id: string; exercise_title: string; body: string; author: string; reply_count: number; is_resolved: boolean; is_locked: boolean; created_at: string };
const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

function timeAgo(iso: string) {
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 3600) return `il y a ${Math.max(1, Math.floor(seconds / 60))} min`;
  if (seconds < 86400) return `il y a ${Math.floor(seconds / 3600)} h`;
  return `il y a ${Math.floor(seconds / 86400)} j`;
}

function status(question: Question): QuestionStatus {
  return question.is_resolved ? 'resolu' : question.reply_count > 0 ? 'repondu' : 'en_attente';
}

export default function TeacherQuestionsPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState('toutes');
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const { toast } = useToast();

  const request = async (path: string, options: RequestInit = {}) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Veuillez vous reconnecter.');
    const response = await fetch(`${apiUrl}${path}`, { ...options, headers: { Authorization: `Bearer ${session.access_token}`, ...(options.headers ?? {}) } });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.detail ?? 'Une erreur est survenue.');
    return payload;
  };

  useEffect(() => {
    const load = async () => {
      try { setQuestions((await cachedApiGet<{ items: Question[] }>('/api/questions', 60_000, ['questions'])).items); }
      catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Impossible de charger les questions.'); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  const reply = async (question: Question) => {
    const body = replyText[question.id]?.trim();
    if (!body) return;
    setBusyId(question.id);
    try {
      await request(`/api/exercises/${question.exercise_id}/comments`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ body, parent_id: question.id }) });
      invalidateCacheTags('questions', 'comments');
      setQuestions((current) => current.map((item) => item.id === question.id ? { ...item, reply_count: item.reply_count + 1 } : item));
      setReplyText((current) => ({ ...current, [question.id]: '' }));
      toast({ title: 'Réponse publiée' });
    } catch (requestError) { toast({ variant: 'destructive', title: 'Réponse impossible', description: requestError instanceof Error ? requestError.message : undefined }); }
    finally { setBusyId(null); }
  };

  const resolve = async (question: Question) => {
    setBusyId(question.id);
    try {
      const updated = await request(`/api/comments/${question.id}/moderate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'resolve' }) });
      invalidateCacheTags('questions', 'comments');
      setQuestions((current) => current.map((item) => item.id === question.id ? { ...item, is_resolved: updated.is_resolved } : item));
      toast({ title: updated.is_resolved ? 'Question marquée comme résolue' : 'Question rouverte' });
    } catch (requestError) { toast({ variant: 'destructive', title: 'Action impossible', description: requestError instanceof Error ? requestError.message : undefined }); }
    finally { setBusyId(null); }
  };

  const filtered = useMemo(() => questions.filter((question) => {
    const currentStatus = status(question);
    return tab === 'toutes' || (tab === 'en_attente' && currentStatus === 'en_attente') || (tab === 'repondues' && currentStatus === 'repondu') || (tab === 'resolues' && currentStatus === 'resolu');
  }), [questions, tab]);

  return <div className="space-y-6">
    <PageHeader title="Questions" subtitle="Répondez aux questions de vos élèves et suivez leur résolution." />
    <Tabs value={tab} onValueChange={setTab}>
      <TabsList className="w-full justify-start overflow-x-auto no-scrollbar sm:w-auto"><TabsTrigger value="toutes">Toutes</TabsTrigger><TabsTrigger value="en_attente">En attente</TabsTrigger><TabsTrigger value="repondues">Répondues</TabsTrigger><TabsTrigger value="resolues">Résolues</TabsTrigger></TabsList>
      <TabsContent value={tab} className="mt-4 space-y-3">
        {loading ? <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">Chargement des questions…</CardContent></Card>
          : error ? <Card className="border-destructive/20"><CardContent className="py-12 text-center text-sm text-destructive">{error}</CardContent></Card>
          : filtered.length === 0 ? <EmptyState icon={HelpCircle} title="Aucune question" description="Aucune question dans cette catégorie." />
          : filtered.map((question) => {
            const busy = busyId === question.id;
            const closed = question.is_resolved || question.is_locked;
            return <Card key={question.id}><CardContent className="p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0 flex-1"><Link href={`/prof/exercices/${question.exercise_id}`} className="text-xs font-medium text-primary hover:underline">{question.exercise_title}</Link><p className="mt-1 text-sm font-medium text-foreground">{question.body}</p><div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground"><span>{question.author}</span><span>·</span><span>{timeAgo(question.created_at)}</span><span>·</span><span className="inline-flex items-center gap-1"><MessageCircle className="h-3 w-3" />{question.reply_count} réponse{question.reply_count > 1 ? 's' : ''}</span>{question.is_locked && <span className="inline-flex items-center gap-1"><Lock className="h-3 w-3" />Fermée</span>}</div></div><QuestionStatusBadge status={status(question)} /></div>
              {!closed && <div className="mt-3 border-t border-border pt-3"><Textarea value={replyText[question.id] ?? ''} onChange={(event) => setReplyText((current) => ({ ...current, [question.id]: event.target.value }))} placeholder="Répondre en tant que professeur..." className="min-h-[60px] resize-none text-sm" /><div className="mt-2 flex justify-end gap-2"><Button variant="outline" size="sm" disabled={busy} onClick={() => resolve(question)} className="text-success hover:text-success"><CheckCircle2 className="h-4 w-4" />Marquer résolu</Button><Button size="sm" disabled={busy || !replyText[question.id]?.trim()} onClick={() => reply(question)}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}Répondre</Button></div></div>}
            </CardContent></Card>;
          })}
      </TabsContent>
    </Tabs>
  </div>;
}
