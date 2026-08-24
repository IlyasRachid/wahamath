'use client';

import { apiUrl } from '@/lib/api-url';
import { useEffect, useState } from 'react';
import { ChevronDown, EyeOff, RotateCcw, ShieldCheck, XCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { cachedApiGet, invalidateCacheTags, peekApiCache } from '@/lib/api-cache';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

type Report = { id: string; comment_id: string; reason: string; comment: string; author: string; exercise_title: string };
type HiddenComment = { id: string; body: string; created_at: string; author: string; exercise_title: string };
type HiddenCommentsPage = { items: HiddenComment[]; next_offset: number; has_more: boolean };

const hiddenCommentsPath = '/api/moderation/hidden-comments?limit=5&offset=0';

export default function ModerationPage() {
  const cachedReports = peekApiCache<{ items: Report[] }>('/api/moderation/reports');
  const cachedHiddenComments = peekApiCache<HiddenCommentsPage>(hiddenCommentsPath);
  const [reports, setReports] = useState<Report[]>(() => cachedReports?.items ?? []);
  const [hiddenComments, setHiddenComments] = useState<HiddenComment[]>(() => cachedHiddenComments?.items ?? []);
  const [nextHiddenOffset, setNextHiddenOffset] = useState(() => cachedHiddenComments?.next_offset ?? 0);
  const [hasMoreHiddenComments, setHasMoreHiddenComments] = useState(() => cachedHiddenComments?.has_more ?? false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loading, setLoading] = useState(!cachedReports || !cachedHiddenComments);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const request = async (path: string, options?: RequestInit) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Votre session a expiré.');
    const response = await fetch(`${apiUrl}${path}`, { ...options, headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json', ...(options?.headers ?? {}) } });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.detail ?? 'Une erreur est survenue.');
    return payload;
  };

  const load = async () => {
    try {
      const [reportPayload, hiddenPayload] = await Promise.all([
        cachedReports ?? cachedApiGet<{ items: Report[] }>('/api/moderation/reports', 5 * 60_000, ['reports']),
        cachedHiddenComments ?? cachedApiGet<HiddenCommentsPage>(hiddenCommentsPath, 5 * 60_000, ['comments']),
      ]);
      setReports(reportPayload.items);
      setHiddenComments(hiddenPayload.items);
      setNextHiddenOffset(hiddenPayload.next_offset);
      setHasMoreHiddenComments(hiddenPayload.has_more);
      setError(null);
    }
    catch (loadError) { setError(loadError instanceof Error ? loadError.message : 'Impossible de charger les signalements.'); }
    finally { setLoading(false); }
  };

  const refreshHiddenComments = async () => {
    const payload = await cachedApiGet<HiddenCommentsPage>(hiddenCommentsPath, 5 * 60_000, ['comments']);
    setHiddenComments(payload.items);
    setNextHiddenOffset(payload.next_offset);
    setHasMoreHiddenComments(payload.has_more);
  };

  const loadMoreHiddenComments = async () => {
    setLoadingMore(true);
    try {
      const path = `/api/moderation/hidden-comments?limit=5&offset=${nextHiddenOffset}`;
      const payload = await cachedApiGet<HiddenCommentsPage>(path, 5 * 60_000, ['comments']);
      setHiddenComments((current) => [...current, ...payload.items]);
      setNextHiddenOffset(payload.next_offset);
      setHasMoreHiddenComments(payload.has_more);
    } catch (loadError) {
      toast.error(loadError instanceof Error ? loadError.message : 'Impossible de charger plus de commentaires.');
    } finally { setLoadingMore(false); }
  };

  const restore = async (comment: HiddenComment) => {
    setBusyId(comment.id);
    try {
      await request(`/api/comments/${comment.id}/moderate`, { method: 'POST', body: JSON.stringify({ action: 'restore' }) });
      invalidateCacheTags('comments', 'questions', 'reports');
      await refreshHiddenComments();
      toast.success('Commentaire restauré.');
    } catch (restoreError) {
      toast.error(restoreError instanceof Error ? restoreError.message : 'Impossible de restaurer ce commentaire.');
    } finally { setBusyId(null); }
  };
  useEffect(() => { load(); }, []);

  const act = async (report: Report, action: 'hide' | 'dismiss') => {
    setBusyId(report.id);
    try {
      if (action === 'hide') await request(`/api/comments/${report.comment_id}/moderate`, { method: 'POST', body: JSON.stringify({ action: 'hide' }) });
      else await request(`/api/moderation/reports/${report.id}/dismiss`, { method: 'POST' });
      invalidateCacheTags('reports', 'comments', 'questions');
      setReports((current) => current.filter((item) => item.id !== report.id));
      if (action === 'hide') await refreshHiddenComments();
      toast.success(action === 'hide' ? 'Commentaire masqué et signalement traité.' : 'Signalement ignoré.');
    } catch (actionError) { toast.error(actionError instanceof Error ? actionError.message : 'Impossible de traiter ce signalement.'); }
    finally { setBusyId(null); }
  };

  return <div className="space-y-6">
    <PageHeader title="Modération" subtitle={reports.length ? `${reports.length} signalement${reports.length > 1 ? 's' : ''} à traiter` : 'Aucun signalement en attente'} />
    {loading ? <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">Chargement des signalements…</CardContent></Card>
      : error ? <Card className="border-destructive/20"><CardContent className="py-12 text-center text-sm text-destructive">{error}</CardContent></Card>
      : reports.length === 0 ? <Card><CardContent className="py-12 text-center text-sm text-muted-foreground"><ShieldCheck className="mx-auto mb-2 h-8 w-8" />Aucun signalement en attente.</CardContent></Card>
      : <div className="space-y-3">{reports.map((report) => <Card key={report.id}><CardContent className="p-4"><p className="text-sm font-semibold text-foreground">{report.author} · {report.exercise_title}</p><p className="mt-2 rounded-lg bg-secondary p-3 text-sm">{report.comment}</p><p className="mt-2 text-xs text-muted-foreground">Motif : {report.reason}</p><div className="mt-3 flex gap-2"><Button variant="outline" size="sm" disabled={busyId === report.id} onClick={() => act(report, 'hide')}><EyeOff className="h-4 w-4" />Masquer le commentaire</Button><Button variant="ghost" size="sm" disabled={busyId === report.id} onClick={() => act(report, 'dismiss')}><XCircle className="h-4 w-4" />Ignorer</Button></div></CardContent></Card>)}</div>}
    <section className="space-y-3">
      <div><h2 className="text-lg font-semibold text-foreground">Commentaires masqués</h2><p className="text-sm text-muted-foreground">Restaurez un commentaire masqué par erreur.</p></div>
      {loading ? null : hiddenComments.length === 0 ? <p className="text-sm text-muted-foreground">Aucun commentaire masqué.</p> : <div className="space-y-3">{hiddenComments.map((comment) => <Card key={comment.id}><CardContent className="p-4"><p className="text-sm font-semibold text-foreground">{comment.author} · {comment.exercise_title}</p><p className="mt-2 rounded-lg bg-secondary p-3 text-sm">{comment.body}</p><Button className="mt-3" variant="outline" size="sm" disabled={busyId === comment.id} onClick={() => restore(comment)}><RotateCcw className="h-4 w-4" />Restaurer le commentaire</Button></CardContent></Card>)}{hasMoreHiddenComments && <Button className="w-full" variant="outline" disabled={loadingMore} onClick={loadMoreHiddenComments}><ChevronDown className="h-4 w-4" />{loadingMore ? 'Chargement…' : 'Charger plus de commentaires'}</Button>}</div>}
    </section>
  </div>;
}
