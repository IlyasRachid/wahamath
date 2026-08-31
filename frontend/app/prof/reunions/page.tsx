'use client';

import { FormEvent, useEffect, useState } from 'react';
import { CalendarDays, ExternalLink, Pencil, PlusCircle, Trash2 } from 'lucide-react';
import { apiUrl } from '@/lib/api-url';
import { cachedApiGet, invalidateCacheTags, peekApiCache } from '@/lib/api-cache';
import { supabase } from '@/lib/supabase/client';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

type StudentItem = { id: string; display_name: string; status: string };
type ClassItem = { id: string; code: string; name: string; students: StudentItem[] };
type Meeting = { id: string; title: string; description: string | null; starts_at: string; ends_at: string; meet_url: string; status: 'scheduled' | 'cancelled'; classes: ClassItem[]; participants: Pick<StudentItem, 'id' | 'display_name'>[] };
type FormState = { title: string; description: string; startsAt: string; endsAt: string; meetUrl: string; classIds: string[]; participantIds: string[] };

const initialForm = (): FormState => ({ title: '', description: '', startsAt: '', endsAt: '', meetUrl: '', classIds: [], participantIds: [] });
const datetimeLocal = (value: string) => new Date(value).toISOString().slice(0, 16);
const formatDate = (value: string) => new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
const visibleMeetings = (items: Meeting[]) => {
  const now = Date.now();
  const upcoming = items.filter((item) => new Date(item.ends_at).getTime() >= now);
  const past = items.filter((item) => new Date(item.ends_at).getTime() < now).sort((first, second) => new Date(second.ends_at).getTime() - new Date(first.ends_at).getTime()).slice(0, 4);
  return [...upcoming, ...past];
};

export default function TeacherMeetingsPage() {
  const cachedMeetings = peekApiCache<{ items: Meeting[] }>('/api/meetings');
  const cachedClasses = peekApiCache<{ items: ClassItem[] }>('/api/classes');
  const [meetings, setMeetings] = useState<Meeting[]>(() => cachedMeetings?.items ?? []);
  const [classes, setClasses] = useState<ClassItem[]>(() => cachedClasses?.items ?? []);
  const [form, setForm] = useState<FormState>(initialForm);
  const [editing, setEditing] = useState<Meeting | null>(null);
  const [loading, setLoading] = useState(!cachedMeetings || !cachedClasses);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const [meetingPayload, classPayload] = await Promise.all([
        cachedApiGet<{ items: Meeting[] }>('/api/meetings', 5 * 60_000, ['meetings']),
        cachedApiGet<{ items: ClassItem[] }>('/api/classes', 5 * 60_000, ['classes']),
      ]);
      setMeetings(meetingPayload.items); setClasses(classPayload.items);
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Impossible de charger les réunions.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { if (!cachedMeetings || !cachedClasses) void load(); }, []);
  useEffect(() => { const refresh = () => { invalidateCacheTags('meetings'); void load(); }; window.addEventListener('wahamath-meetings-updated', refresh); return () => window.removeEventListener('wahamath-meetings-updated', refresh); }, []);

  const request = async (path: string, method: 'POST' | 'PATCH', body?: unknown) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Veuillez vous reconnecter.');
    const response = await fetch(`${apiUrl}${path}`, { method, headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
    const payload = await response.json(); if (!response.ok) throw new Error(payload.detail ?? 'Une erreur est survenue.'); return payload;
  };
  const reset = () => { setEditing(null); setForm(initialForm()); };
  const edit = (meeting: Meeting) => { setEditing(meeting); setForm({ title: meeting.title, description: meeting.description ?? '', startsAt: datetimeLocal(meeting.starts_at), endsAt: datetimeLocal(meeting.ends_at), meetUrl: meeting.meet_url, classIds: meeting.classes.map((item) => item.id), participantIds: meeting.participants.map((item) => item.id) }); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const toggleClass = (classId: string, checked: boolean) => {
    const studentIds = classes.find((item) => item.id === classId)?.students.filter((student) => student.status === 'active').map((student) => student.id) ?? [];
    setForm((current) => ({ ...current, classIds: checked ? [...current.classIds, classId] : current.classIds.filter((id) => id !== classId), participantIds: checked ? Array.from(new Set([...current.participantIds, ...studentIds])) : current.participantIds.filter((id) => !studentIds.includes(id)) }));
  };
  const allStudents = classes.flatMap((classItem) => classItem.students.filter((student) => student.status === 'active').map((student) => ({ ...student, classCode: classItem.code })));
  const displayedMeetings = visibleMeetings(meetings);
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setSaving(true);
    try {
      await request(editing ? `/api/meetings/${editing.id}` : '/api/meetings', editing ? 'PATCH' : 'POST', { title: form.title, description: form.description || null, starts_at: new Date(form.startsAt).toISOString(), ends_at: new Date(form.endsAt).toISOString(), meet_url: form.meetUrl, class_ids: form.classIds, participant_ids: form.participantIds });
      invalidateCacheTags('meetings'); await load(); reset(); window.dispatchEvent(new Event('wahamath-meetings-updated')); toast.success(editing ? 'Réunion modifiée.' : 'Réunion créée et élèves notifiés.');
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Impossible d’enregistrer la réunion.'); }
    finally { setSaving(false); }
  };
  const cancel = async (meeting: Meeting) => {
    if (!window.confirm(`Annuler « ${meeting.title} » ? Les élèves concernés seront avertis.`)) return;
    try { await request(`/api/meetings/${meeting.id}/cancel`, 'POST'); invalidateCacheTags('meetings'); await load(); window.dispatchEvent(new Event('wahamath-meetings-updated')); toast.success('Réunion annulée.'); } catch (error) { toast.error(error instanceof Error ? error.message : 'Impossible d’annuler la réunion.'); }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Réunions" subtitle="Planifiez une réunion par classe avec un lien Google Meet." />
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><PlusCircle className="h-4 w-4 text-primary" />{editing ? 'Modifier la réunion' : 'Planifier une réunion'}</CardTitle></CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-2" onSubmit={submit}>
            <div className="md:col-span-2"><Label htmlFor="meeting-title">Titre</Label><Input id="meeting-title" required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Révision du chapitre 2" className="mt-1.5" /></div>
            <div><Label htmlFor="meeting-start">Début</Label><Input id="meeting-start" type="datetime-local" required value={form.startsAt} onChange={(event) => setForm({ ...form, startsAt: event.target.value })} className="mt-1.5" /></div>
            <div><Label htmlFor="meeting-end">Fin</Label><Input id="meeting-end" type="datetime-local" required value={form.endsAt} onChange={(event) => setForm({ ...form, endsAt: event.target.value })} className="mt-1.5" /></div>
            <div className="md:col-span-2"><Label htmlFor="meet-url">Lien Google Meet</Label><Input id="meet-url" type="url" required value={form.meetUrl} onChange={(event) => setForm({ ...form, meetUrl: event.target.value })} placeholder="https://meet.google.com/abc-defg-hij" className="mt-1.5" /></div>
            <div className="md:col-span-2"><Label htmlFor="meeting-description">Précisions (facultatif)</Label><Textarea id="meeting-description" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Matériel à préparer, thème de la séance…" className="mt-1.5" /></div>
            <fieldset className="md:col-span-2"><legend className="text-sm font-medium text-foreground">Classes concernées</legend><div className="mt-2 flex flex-wrap gap-2">{classes.map((item) => <label key={item.id} className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary/5"><input type="checkbox" checked={form.classIds.includes(item.id)} onChange={(event) => toggleClass(item.id, event.target.checked)} />{item.code}</label>)}</div></fieldset>
            <fieldset className="md:col-span-2"><legend className="text-sm font-medium text-foreground">Élèves participants</legend><p className="mt-1 text-xs text-muted-foreground">Tous les élèves des classes sélectionnées sont ajoutés automatiquement. Décochez pour les exclure, ou cochez un élève d’une autre classe.</p><div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{allStudents.map((student) => <label key={student.id} className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary/5"><input type="checkbox" checked={form.participantIds.includes(student.id)} onChange={(event) => setForm((current) => ({ ...current, participantIds: event.target.checked ? [...current.participantIds, student.id] : current.participantIds.filter((id) => id !== student.id) }))} /><span className="min-w-0 flex-1 truncate">{student.display_name}</span><span className="text-xs text-muted-foreground">{student.classCode}</span></label>)}</div>{form.classIds.length > 0 && !allStudents.length && <p className="mt-2 text-sm text-muted-foreground">Aucun élève actif dans les classes disponibles.</p>}</fieldset>
            <div className="flex gap-2 md:col-span-2"><Button type="submit" disabled={saving}>{saving ? 'Enregistrement…' : editing ? 'Enregistrer les modifications' : 'Créer la réunion'}</Button>{editing && <Button type="button" variant="outline" onClick={reset}>Annuler</Button>}</div>
          </form>
        </CardContent>
      </Card>
      {loading ? <p className="py-8 text-center text-sm text-muted-foreground">Chargement des réunions…</p> : !displayedMeetings.length ? <EmptyState icon={CalendarDays} title="Aucune réunion" description="Créez votre première réunion Google Meet ci-dessus." /> : <div className="space-y-3">{displayedMeetings.map((meeting) => <Card key={meeting.id} className={meeting.status === 'cancelled' ? 'opacity-60' : ''}><CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex items-center gap-2"><p className="font-semibold text-foreground">{meeting.title}</p>{meeting.status === 'cancelled' && <span className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">Annulée</span>}</div><p className="mt-1 text-sm text-muted-foreground">{formatDate(meeting.starts_at)} · {meeting.classes.map((item) => item.code).join(', ')}</p><p className="mt-1 text-xs text-muted-foreground">{meeting.participants.length} élève{meeting.participants.length > 1 ? 's' : ''} invité{meeting.participants.length > 1 ? 's' : ''}</p>{meeting.description && <p className="mt-1 text-sm text-muted-foreground">{meeting.description}</p>}</div><div className="flex gap-2"><a href={meeting.meet_url} target="_blank" rel="noreferrer"><Button size="sm" variant="outline"><ExternalLink className="h-4 w-4" />Meet</Button></a>{meeting.status === 'scheduled' && <><Button size="sm" variant="outline" onClick={() => edit(meeting)}><Pencil className="h-4 w-4" />Modifier</Button><Button size="sm" variant="outline" className="text-destructive hover:text-destructive" onClick={() => cancel(meeting)}><Trash2 className="h-4 w-4" />Annuler</Button></>}</div></CardContent></Card>)}</div>}
    </div>
  );
}
