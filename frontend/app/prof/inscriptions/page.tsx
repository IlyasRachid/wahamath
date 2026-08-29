'use client';

import { apiUrl } from '@/lib/api-url';
import { useEffect, useState } from 'react';
import { Check, Clock3, Eye, MailCheck, MailWarning, Phone, UserRound, X } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { cachedApiGet, invalidateApiCache, invalidateCacheTags, peekApiCache } from '@/lib/api-cache';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';

type PendingStudent = {
  id: string;
  display_name: string;
  created_at: string;
  requested_class: { code: string; name: string } | null;
  email_confirmed: boolean;
  email: string | null;
  phone_number: string | null;
};

function whatsappUrl(phoneNumber: string) {
  return `https://wa.me/${phoneNumber.replace(/\D/g, '')}`;
}

export default function EnrollmentRequestsPage() {
  const cachedStudents = peekApiCache<{ items: PendingStudent[] }>('/api/admin/students/pending');
  const [students, setStudents] = useState<PendingStudent[]>(() => cachedStudents?.items ?? []);
  const [loading, setLoading] = useState(!cachedStudents);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<PendingStudent | null>(null);

  const loadRequests = async (force = false) => {
    if (cachedStudents && !force) return;
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
  useEffect(() => { const refresh = () => { void loadRequests(true); }; window.addEventListener('wahamath-enrollments-updated', refresh); return () => window.removeEventListener('wahamath-enrollments-updated', refresh); }, []);

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
                  <div className="min-w-0"><p className="truncate text-sm font-semibold text-foreground">{student.display_name}</p><p className="mt-0.5 text-xs text-muted-foreground">Classe demandée : <span className="font-medium text-foreground">{student.requested_class?.code ?? 'Non renseignée'}</span>{student.requested_class ? ` — ${student.requested_class.name}` : ''}</p><p className="mt-0.5 text-xs text-muted-foreground">Demande du {new Date(student.created_at).toLocaleDateString('fr-FR')}</p><p className={`mt-1 inline-flex items-center gap-1 text-xs font-medium ${student.email_confirmed ? 'text-success' : 'text-warning-foreground'}`}>{student.email_confirmed ? <MailCheck className="h-3.5 w-3.5" /> : <MailWarning className="h-3.5 w-3.5" />}{student.email_confirmed ? 'Adresse e-mail confirmée' : 'Adresse e-mail non confirmée'}</p></div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button size="sm" variant="outline" onClick={() => setSelectedStudent(student)}><Eye className="h-4 w-4" />Voir la fiche</Button>
                  <Button size="sm" onClick={() => decide(student, 'approve')} disabled={updatingId === student.id || !student.email_confirmed} title={!student.email_confirmed ? 'L’élève doit confirmer son adresse e-mail avant approbation.' : undefined}><Check className="h-4 w-4" />Accepter</Button>
                  <Button size="sm" variant="outline" className="text-destructive hover:text-destructive" onClick={() => decide(student, 'refuse')} disabled={updatingId === student.id}><X className="h-4 w-4" />Refuser</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <Dialog open={Boolean(selectedStudent)} onOpenChange={(open) => !open && setSelectedStudent(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Fiche de l’élève</DialogTitle><DialogDescription>Informations fournies avec la demande d’inscription.</DialogDescription></DialogHeader>
          {selectedStudent && <dl className="space-y-4 text-sm"><div><dt className="text-muted-foreground">Pseudonyme</dt><dd className="mt-1 font-medium text-foreground">{selectedStudent.display_name}</dd></div><div><dt className="text-muted-foreground">Classe demandée</dt><dd className="mt-1 font-medium text-foreground">{selectedStudent.requested_class ? `${selectedStudent.requested_class.code} — ${selectedStudent.requested_class.name}` : 'Non renseignée'}</dd></div><div><dt className="text-muted-foreground">Adresse e-mail</dt><dd className="mt-1 break-all font-medium text-foreground">{selectedStudent.email ? <a href={`mailto:${selectedStudent.email}`} className="text-primary hover:underline">{selectedStudent.email}</a> : 'Non renseignée'}</dd></div><div className="flex gap-2"><Phone className="mt-0.5 h-4 w-4 text-primary" /><div><dt className="text-muted-foreground">Téléphone</dt><dd className="mt-1 font-medium text-foreground">{selectedStudent.phone_number ? <a href={whatsappUrl(selectedStudent.phone_number)} target="_blank" rel="noreferrer" className="text-primary hover:underline">{selectedStudent.phone_number}</a> : 'Non renseigné'}</dd></div></div><div><dt className="text-muted-foreground">Demande envoyée le</dt><dd className="mt-1 font-medium text-foreground">{new Date(selectedStudent.created_at).toLocaleString('fr-FR')}</dd></div><div><dt className="text-muted-foreground">E-mail</dt><dd className={`mt-1 font-medium ${selectedStudent.email_confirmed ? 'text-success' : 'text-warning-foreground'}`}>{selectedStudent.email_confirmed ? 'Confirmé' : 'Non confirmé'}</dd></div></dl>}
        </DialogContent>
      </Dialog>
    </div>
  );
}
