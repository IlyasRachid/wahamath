'use client';

import { useEffect, useState } from 'react';
import { CalendarDays, ExternalLink, Video } from 'lucide-react';
import { cachedApiGet, peekApiCache } from '@/lib/api-cache';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

type Meeting = {
  id: string;
  title: string;
  description: string | null;
  starts_at: string;
  ends_at: string;
  meet_url: string;
  status: 'scheduled';
  classes: { id: string; code: string; name: string }[];
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'full', timeStyle: 'short' }).format(new Date(value));
}

function visibleMeetings(items: Meeting[]) {
  const now = Date.now();
  const upcoming = items.filter((item) => new Date(item.ends_at).getTime() >= now);
  const past = items
    .filter((item) => new Date(item.ends_at).getTime() < now)
    .sort((first, second) => new Date(second.ends_at).getTime() - new Date(first.ends_at).getTime())
    .slice(0, 4);
  return [...upcoming, ...past];
}

export default function StudentMeetingsPage() {
  const cached = peekApiCache<{ items: Meeting[] }>('/api/meetings');
  const [meetings, setMeetings] = useState<Meeting[]>(() => cached?.items ?? []);
  const [loading, setLoading] = useState(!cached);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { if (cached) return; (async () => { try { setMeetings((await cachedApiGet<{ items: Meeting[] }>('/api/meetings', 5 * 60_000, ['meetings'])).items); } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Impossible de charger les réunions.'); } finally { setLoading(false); } })(); }, []);
  useEffect(() => { const refresh = () => { void cachedApiGet<{ items: Meeting[] }>('/api/meetings', 5 * 60_000, ['meetings']).then((payload) => setMeetings(payload.items)); }; window.addEventListener('wahamath-meetings-updated', refresh); return () => window.removeEventListener('wahamath-meetings-updated', refresh); }, []);

  const displayedMeetings = visibleMeetings(meetings);
  return <div className="space-y-6"><PageHeader title="Réunions" subtitle="Retrouvez les réunions Google Meet prévues pour vos classes." />{loading ? <p className="py-12 text-center text-sm text-muted-foreground">Chargement des réunions…</p> : error ? <p className="py-12 text-center text-sm text-destructive">{error}</p> : !displayedMeetings.length ? <EmptyState icon={CalendarDays} title="Aucune réunion prévue" description="Les réunions annoncées par votre professeur apparaîtront ici." /> : <div className="grid gap-4 lg:grid-cols-2">{displayedMeetings.map((meeting) => <Card key={meeting.id}><CardHeader className="pb-3"><div className="flex items-start justify-between gap-3"><div><CardTitle className="text-base">{meeting.title}</CardTitle><p className="mt-1.5 text-sm text-muted-foreground">{formatDate(meeting.starts_at)}</p></div><div className="rounded-lg bg-primary/10 p-2 text-primary"><Video className="h-5 w-5" /></div></div></CardHeader><CardContent className="space-y-4"><p className="min-h-5 text-sm text-muted-foreground">{meeting.description || 'Aucune précision supplémentaire.'}</p><p className="text-xs text-muted-foreground">Classes : {meeting.classes.map((item) => item.code).join(', ')}</p><a href={meeting.meet_url} target="_blank" rel="noreferrer"><Button className="w-full"><ExternalLink className="h-4 w-4" />Ouvrir Google Meet</Button></a></CardContent></Card>)}</div>}</div>;
}
