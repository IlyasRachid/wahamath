'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { CheckCircle2, Loader2, Lock, MessageSquare, RotateCcw, Send } from 'lucide-react';
import { apiUrl } from '@/lib/api-url';
import { supabase } from '@/lib/supabase/client';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { cachedApiGet, invalidateCacheTags, peekApiCache } from '@/lib/api-cache';

type Thread = { id: string; student_id: string; teacher_id: string; status: 'open' | 'closed'; created_at: string; closed_at: string | null; exercises: { id: string; title: string; chapters: { title: string } | null } | null };
type Message = { id: string; author_id: string; body: string; created_at: string };
type Payload = { thread: Thread; messages: Message[]; viewer_id: string; viewer_role: 'student' | 'teacher' };

function dateTime(value: string) { return new Date(value).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }); }

export function InstructionThread() {
  const params = useParams<{ id: string }>();
  const threadId = params.id;
  const cachedThread = peekApiCache<Payload>(`/api/instruction-threads/${threadId}`);
  const [data, setData] = useState<Payload | null>(() => cachedThread);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(!cachedThread);
  const [sending, setSending] = useState(false);
  const [closing, setClosing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const request = async (path: string, options: RequestInit = {}) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Veuillez vous reconnecter.');
    const response = await fetch(`${apiUrl}${path}`, { ...options, headers: { Authorization: `Bearer ${session.access_token}`, ...(options.headers ?? {}) } });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.detail ?? 'Une erreur est survenue.');
    return payload;
  };

  const load = async () => {
    try { setError(null); setData(await cachedApiGet<Payload>(`/api/instruction-threads/${threadId}`, 5 * 60_000, ['instructions'])); }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Impossible de charger la discussion.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { void load(); const refresh = () => void load(); window.addEventListener('wahamath-instructions-updated', refresh); return () => window.removeEventListener('wahamath-instructions-updated', refresh); }, [threadId]);

  const send = async () => {
    const body = message.trim();
    if (!body) return;
    setSending(true);
    try {
      const payload = await request(`/api/instruction-threads/${threadId}/messages`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ body }) });
      setData((current) => current ? { ...current, messages: [...current.messages, payload.message] } : current);
      invalidateCacheTags('instructions');
      setMessage('');
      toast({ title: 'Réponse envoyée' });
    } catch (requestError) { toast({ variant: 'destructive', title: 'Envoi impossible', description: requestError instanceof Error ? requestError.message : undefined }); }
    finally { setSending(false); }
  };

  const close = async () => {
    setClosing(true);
    try {
      await request(`/api/instruction-threads/${threadId}/close`, { method: 'POST' });
      setData((current) => current ? { ...current, thread: { ...current.thread, status: 'closed', closed_at: new Date().toISOString() } } : current);
      invalidateCacheTags('instructions');
      toast({ title: 'Discussion clôturée', description: 'L’élève ne peut plus y répondre.' });
    } catch (requestError) { toast({ variant: 'destructive', title: 'Action impossible', description: requestError instanceof Error ? requestError.message : undefined }); }
    finally { setClosing(false); }
  };

  const reopen = async () => {
    setClosing(true);
    try {
      await request(`/api/instruction-threads/${threadId}/reopen`, { method: 'POST' });
      setData((current) => current ? { ...current, thread: { ...current.thread, status: 'open', closed_at: null } } : current);
      invalidateCacheTags('instructions');
      toast({ title: 'Discussion rouverte', description: 'L’élève peut à nouveau répondre.' });
    } catch (requestError) { toast({ variant: 'destructive', title: 'Action impossible', description: requestError instanceof Error ? requestError.message : undefined }); }
    finally { setClosing(false); }
  };

  if (loading) return <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">Chargement de la discussion…</CardContent></Card>;
  if (error || !data) return <EmptyState icon={MessageSquare} title="Discussion indisponible" description={error ?? 'Cette instruction est introuvable.'} />;
  const closed = data.thread.status === 'closed';
  const canClose = data.viewer_role === 'teacher' && data.thread.teacher_id === data.viewer_id;
  const otherName = data.viewer_role === 'student' ? 'Professeur' : 'Élève';

  return <div className="mx-auto max-w-3xl space-y-5">
    <PageHeader title="Instruction privée" subtitle={closed ? 'Cette discussion est clôturée.' : 'Échange privé entre l’élève et le professeur.'}>
      {canClose && (closed ? <Button variant="outline" onClick={() => void reopen()} disabled={closing}>{closing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}Rouvrir</Button> : <Button variant="outline" onClick={() => void close()} disabled={closing} className="text-success hover:text-success">{closing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}Clôturer</Button>)}
    </PageHeader>
    <Card><CardContent className="p-4 text-sm"><div className="flex flex-wrap items-center justify-between gap-2"><span className={closed ? 'font-medium text-muted-foreground' : 'font-medium text-success'}>{closed ? 'Clôturée' : 'Ouverte'}</span><span className="text-muted-foreground">Créée le {dateTime(data.thread.created_at)}</span></div>{data.thread.exercises && <Link href={`${data.viewer_role === 'student' ? '/eleve' : '/prof'}/exercices/${data.thread.exercises.id}`} className="mt-3 inline-block text-primary hover:underline">Exercice : {data.thread.exercises.title}{data.thread.exercises.chapters && <> <span aria-hidden="true">·</span> Chapitre : {data.thread.exercises.chapters.title}</>}</Link>}</CardContent></Card>
    <div className="space-y-3">{data.messages.map((item) => { const mine = item.author_id === data.viewer_id; return <div key={item.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[85%] rounded-xl px-4 py-3 text-sm ${mine ? 'bg-primary text-primary-foreground' : 'bg-card border border-border text-foreground'}`}><p className="mb-1 text-xs opacity-75">{mine ? 'Vous' : otherName}</p><p className="whitespace-pre-wrap">{item.body}</p><p className="mt-2 text-right text-[11px] opacity-70">{dateTime(item.created_at)}</p></div></div>; })}</div>
    {closed ? <Card><CardContent className="flex items-center gap-2 p-4 text-sm text-muted-foreground"><Lock className="h-4 w-4" />Seul le professeur peut clôturer une instruction. Cette discussion ne peut plus recevoir de réponse.</CardContent></Card> : <Card><CardContent className="p-4"><Textarea value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Écrire une réponse…" className="min-h-[100px]" maxLength={2000} /><div className="mt-3 flex items-center justify-between gap-3"><span className="text-xs text-muted-foreground">{message.length}/2000</span><Button onClick={() => void send()} disabled={sending || !message.trim()}>{sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}Envoyer</Button></div></CardContent></Card>}
  </div>;
}
