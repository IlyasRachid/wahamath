'use client';

import { apiUrl } from '@/lib/api-url';
import { useEffect, useState } from 'react';
import { EyeOff, ShieldCheck, XCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { cachedApiGet, invalidateCacheTags, peekApiCache } from '@/lib/api-cache';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

type Report = { id: string; comment_id: string; reason: string; comment: string; author: string; exercise_title: string };

export default function ModerationPage() {
  const cachedReports = peekApiCache<{ items: Report[] }>('/api/moderation/reports');
  const [reports, setReports] = useState<Report[]>(() => cachedReports?.items ?? []);
  const [loading, setLoading] = useState(!cachedReports);
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
    if (cachedReports) return;
    try { setReports((await cachedApiGet<{ items: Report[] }>('/api/moderation/reports', 5 * 60_000, ['reports'])).items); setError(null); }
    catch (loadError) { setError(loadError instanceof Error ? loadError.message : 'Impossible de charger les signalements.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const act = async (report: Report, action: 'hide' | 'dismiss') => {
    setBusyId(report.id);
    try {
      if (action === 'hide') await request(`/api/comments/${report.comment_id}/moderate`, { method: 'POST', body: JSON.stringify({ action: 'hide' }) });
      else await request(`/api/moderation/reports/${report.id}/dismiss`, { method: 'POST' });
      invalidateCacheTags('reports', 'comments', 'questions');
      setReports((current) => current.filter((item) => item.id !== report.id));
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
  </div>;
}
