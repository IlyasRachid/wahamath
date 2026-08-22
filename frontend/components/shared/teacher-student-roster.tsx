'use client';

import { useMemo, useState } from 'react';
import { BookOpen, Eye, Loader2, Mail, Phone, ShieldCheck, ShieldOff, Trash2, Users } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

type Student = { id: string; display_name: string; status: string };
type ClassRoster = { id: string; code: string; name: string; students: Student[] };
type StudentDetails = { id: string; display_name: string; email: string | null; phone_number: string | null; status: string; created_at: string; classes: { id: string; code: string; name: string }[] };

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

export function TeacherStudentRoster({ classes, onStudentDeleted, onStudentChanged }: { classes: ClassRoster[]; onStudentDeleted: (studentId: string) => void; onStudentChanged: () => Promise<void> }) {
  const [classId, setClassId] = useState('all');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [details, setDetails] = useState<StudentDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [managing, setManaging] = useState(false);
  const visibleClasses = useMemo(() => classId === 'all' ? classes : classes.filter((item) => item.id === classId), [classId, classes]);
  const studentCount = visibleClasses.reduce((total, item) => total + item.students.length, 0);

  const openStudent = async (student: Student) => {
    setSelectedStudent(student); setDetails(null); setConfirmingDelete(false); setLoadingDetails(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Veuillez vous reconnecter.');
      const response = await fetch(`${apiUrl}/api/admin/students/${student.id}`, { headers: { Authorization: `Bearer ${session.access_token}` } });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.detail ?? 'Impossible de charger la fiche de l’élève.');
      setDetails(payload);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Impossible de charger la fiche de l’élève.');
    } finally { setLoadingDetails(false); }
  };

  const removeStudent = async () => {
    if (!selectedStudent) return;
    setDeleting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Veuillez vous reconnecter.');
      const response = await fetch(`${apiUrl}/api/admin/students/${selectedStudent.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${session.access_token}` } });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.detail ?? 'Impossible de supprimer l’élève.');
      onStudentDeleted(selectedStudent.id);
      setSelectedStudent(null); setDetails(null); setConfirmingDelete(false);
      toast.success('Élève supprimé', { description: 'Son compte et ses données associées ont été supprimés.' });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Impossible de supprimer l’élève.');
    } finally { setDeleting(false); }
  };

  const manageStudent = async (action: 'suspend' | 'activate' | 'move_class', classId?: string) => {
    if (!selectedStudent) return;
    setManaging(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Veuillez vous reconnecter.');
      const response = await fetch(`${apiUrl}/api/admin/students/${selectedStudent.id}`, { method: 'PATCH', headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ action, class_id: classId }) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.detail ?? 'Impossible de mettre à jour l’élève.');
      await onStudentChanged();
      setSelectedStudent(null); setDetails(null);
      toast.success(action === 'move_class' ? 'Classe de l’élève mise à jour.' : action === 'suspend' ? 'Compte élève suspendu.' : 'Compte élève réactivé.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Impossible de mettre à jour l’élève.');
    } finally { setManaging(false); }
  };

  return <>
    <Card>
      <CardHeader className="gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div><CardTitle className="flex items-center gap-2 text-base"><Users className="h-4 w-4 text-primary" />Élèves</CardTitle><p className="mt-1 text-sm text-muted-foreground">{studentCount} élève{studentCount > 1 ? 's' : ''} {classId === 'all' ? 'au total' : 'dans cette classe'}</p></div>
        <Select value={classId} onValueChange={setClassId}><SelectTrigger className="w-full sm:w-56"><SelectValue placeholder="Choisir une classe" /></SelectTrigger><SelectContent><SelectItem value="all">Toutes les classes</SelectItem>{classes.map((item) => <SelectItem key={item.id} value={item.id}>{item.code} — {item.name}</SelectItem>)}</SelectContent></Select>
      </CardHeader>
      <CardContent className="space-y-4">
        {visibleClasses.map((item) => <section key={item.id} className="rounded-lg border border-border"><div className="flex items-center justify-between border-b border-border bg-secondary/30 px-4 py-3"><div><p className="font-medium text-foreground">{item.code} — {item.name}</p><p className="text-xs text-muted-foreground">{item.students.length} élève{item.students.length > 1 ? 's' : ''}</p></div></div>{item.students.length === 0 ? <p className="px-4 py-5 text-sm text-muted-foreground">Aucun élève approuvé dans cette classe.</p> : <div className="divide-y divide-border">{item.students.map((student) => { const initials = student.display_name.split(' ').filter(Boolean).map((part) => part[0]).join('').slice(0, 2).toUpperCase() || 'E'; return <div key={student.id} className="flex items-center gap-3 px-4 py-3"><div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">{initials}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-foreground">{student.display_name}</p><p className="text-xs text-muted-foreground">Élève de {item.code} · {student.status === 'active' ? 'Actif' : 'Suspendu'}</p></div><Button size="sm" variant="outline" onClick={() => void openStudent(student)}><Eye className="h-4 w-4" />Fiche</Button></div>; })}</div>}</section>)}
      </CardContent>
    </Card>

    <Dialog open={Boolean(selectedStudent)} onOpenChange={(open) => { if (!open && !deleting) { setSelectedStudent(null); setDetails(null); setConfirmingDelete(false); } }}>
      <DialogContent>
        <DialogHeader><DialogTitle>Fiche élève</DialogTitle><DialogDescription>Informations réservées au professeur administrateur.</DialogDescription></DialogHeader>
        {loadingDetails ? <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div> : details && <div className="space-y-4"><div className="rounded-lg bg-secondary/40 p-4"><p className="text-lg font-semibold text-foreground">{details.display_name}</p><p className="mt-1 text-sm text-muted-foreground">Compte créé le {new Date(details.created_at).toLocaleDateString('fr-FR')} · {details.status === 'active' ? 'Actif' : 'Suspendu'}</p></div><dl className="space-y-3 text-sm"><div className="flex gap-3"><Mail className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><div><dt className="text-muted-foreground">E-mail</dt><dd className="font-medium text-foreground">{details.email ?? 'Non renseigné'}</dd></div></div><div className="flex gap-3"><Phone className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><div><dt className="text-muted-foreground">Téléphone</dt><dd className="font-medium text-foreground">{details.phone_number ?? 'Non renseigné'}</dd></div></div><div className="flex gap-3"><BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><div><dt className="text-muted-foreground">Classe{details.classes.length > 1 ? 's' : ''}</dt><dd className="font-medium text-foreground">{details.classes.length ? details.classes.map((item) => `${item.code} — ${item.name}`).join(', ') : 'Aucune classe'}</dd></div></div></dl><div className="rounded-lg border border-border p-3"><p className="text-sm font-medium text-foreground">Changer de classe</p><Select defaultValue={details.classes[0]?.id} onValueChange={(value) => void manageStudent('move_class', value)} disabled={managing}><SelectTrigger className="mt-2"><SelectValue placeholder="Sélectionner une classe" /></SelectTrigger><SelectContent>{classes.map((item) => <SelectItem key={item.id} value={item.id}>{item.code} — {item.name}</SelectItem>)}</SelectContent></Select></div>{confirmingDelete ? <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3"><p className="text-sm font-medium text-destructive">Supprimer définitivement ce compte et ses données ?</p><div className="mt-3 flex justify-end gap-2"><Button size="sm" variant="outline" disabled={deleting} onClick={() => setConfirmingDelete(false)}>Annuler</Button><Button size="sm" variant="destructive" disabled={deleting} onClick={() => void removeStudent()}>{deleting && <Loader2 className="h-4 w-4 animate-spin" />}Supprimer définitivement</Button></div></div> : null}</div>}
        {details && !confirmingDelete ? <DialogFooter><Button variant="outline" disabled={managing} onClick={() => void manageStudent(details.status === 'active' ? 'suspend' : 'activate')}>{managing ? <Loader2 className="h-4 w-4 animate-spin" /> : details.status === 'active' ? <ShieldOff className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}{details.status === 'active' ? 'Suspendre le compte' : 'Réactiver le compte'}</Button><Button variant="destructive" onClick={() => setConfirmingDelete(true)}><Trash2 className="h-4 w-4" />Supprimer l’élève</Button></DialogFooter> : null}
      </DialogContent>
    </Dialog>
  </>;
}
