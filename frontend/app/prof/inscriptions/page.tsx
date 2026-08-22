'use client';

import { useEffect, useState } from 'react';
import { Check, Clock3, UserRound, X } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { cachedApiGet, invalidateApiCache, invalidateCacheTags, peekApiCache } from '@/lib/api-cache';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';

type PendingStudent = {
  id: string;
  display_name: string;
  created_at: string;
  requested_class: { code: string; name: string } | null;
};

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

export default function EnrollmentRequestsPage() {
  const cachedStudents = peekApiCache<{ items: PendingStudent[] }>('/api/admin/students/pending');
  const [students, setStudents] = useState<PendingStudent[]>(() => cachedStudents?.items ?? []);
  const [loading, setLoading] = useState(!cachedStudents);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadRequests = async () => {
    if (cachedStudents) return;
    try {
      const payload = await cachedApiGet<{ items: PendingStudent[] }>('/api/admin/students/pending', 30_000, ['enrollments']);
      setStudents(payload.items);
      setError(null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Impossible de charger les demandes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadRequests(); }, []);

  const decide = async (student: PendingStudent, decision: 'approve' | 'refuse') => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    setUpdatingId(student.id);
    try {
      const response = await fetch(`${apiUrl}/api/admin/students/${student.id}/decision`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.detail ?? 'Impossible de traiter la demande.');
      invalidateApiCache('/api/classes', ['classes']);
      invalidateCacheTags('enrollments');
      setStudents((current) => current.filter((item) => item.id !== student.id));
      toast.success(decision === 'approve' ? `${student.display_name} a été accepté(e).` : `${student.display_name} a été refusé(e).`);
    } catch (requestError) {
      toast.error(requestError instanceof Error ? requestError.message : 'Une erreur est survenue.');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Demandes d’inscription" subtitle="Acceptez les élèves dans leur classe ou refusez leur demande." />

      {loading ? (
        <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">Chargement des demandes…</CardContent></Card>
      ) : error ? (
        <Card className="border-destructive/20"><CardContent className="py-12 text-center text-sm text-destructive">{error}</CardContent></Card>
      ) : students.length === 0 ? (
        <Card><CardContent className="py-14 text-center"><Clock3 className="mx-auto h-9 w-9 text-muted-foreground/50" /><p className="mt-3 text-sm font-medium text-foreground">Aucune demande en attente</p><p className="mt-1 text-xs text-muted-foreground">Les nouvelles inscriptions apparaîtront ici.</p></CardContent></Card>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">{students.length} demande{students.length > 1 ? 's' : ''} en attente</p>
          {students.map((student) => (
            <Card key={student.id}>
              <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"><UserRound className="h-5 w-5" /></div>
                  <div className="min-w-0"><p className="truncate text-sm font-semibold text-foreground">{student.display_name}</p><p className="mt-0.5 text-xs text-muted-foreground">Classe demandée : <span className="font-medium text-foreground">{student.requested_class?.code ?? 'Non renseignée'}</span>{student.requested_class ? ` — ${student.requested_class.name}` : ''}</p><p className="mt-0.5 text-xs text-muted-foreground">Demande du {new Date(student.created_at).toLocaleDateString('fr-FR')}</p></div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button size="sm" onClick={() => decide(student, 'approve')} disabled={updatingId === student.id}><Check className="h-4 w-4" />Accepter</Button>
                  <Button size="sm" variant="outline" className="text-destructive hover:text-destructive" onClick={() => decide(student, 'refuse')} disabled={updatingId === student.id}><X className="h-4 w-4" />Refuser</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
