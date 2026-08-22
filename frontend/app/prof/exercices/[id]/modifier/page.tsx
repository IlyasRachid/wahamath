'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ImagePlus, Loader2, Save } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { cachedApiGet, invalidateCacheTags } from '@/lib/api-cache';
import { Breadcrumbs, PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

type ClassItem = { id: string; code: string; name: string; chapters: { id: string; title: string }[] };
type ExerciseDetails = { id: string; title: string; description: string | null; difficulty: string; tags: string[]; publication_status: string; image_url: string; classes: { code: string } | null; chapters: { title: string } | null };
const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

export default function EditExercisePage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [title, setTitle] = useState(''); const [description, setDescription] = useState(''); const [classCode, setClassCode] = useState(''); const [chapter, setChapter] = useState(''); const [difficulty, setDifficulty] = useState(''); const [tags, setTags] = useState(''); const [publicationStatus, setPublicationStatus] = useState('brouillon'); const [imageUrl, setImageUrl] = useState(''); const [imageFile, setImageFile] = useState<File | null>(null); const [previewUrl, setPreviewUrl] = useState<string | null>(null); const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false); const [error, setError] = useState<string | null>(null);
  const chapters = useMemo(() => classes.find((item) => item.code === classCode)?.chapters ?? [], [classes, classCode]);

  useEffect(() => { (async () => { try { const [exercise, classPayload] = await Promise.all([cachedApiGet<ExerciseDetails>(`/api/exercises/${params.id}`, 30_000, ['exercises']), cachedApiGet<{ items: ClassItem[] }>('/api/classes', 5 * 60_000, ['classes'])]); setClasses(classPayload.items); setTitle(exercise.title); setDescription(exercise.description ?? ''); setClassCode(exercise.classes?.code ?? ''); setChapter(exercise.chapters?.title ?? ''); setDifficulty(exercise.difficulty); setTags((exercise.tags ?? []).join(', ')); setPublicationStatus(exercise.publication_status); setImageUrl(exercise.image_url); } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Impossible de charger l’exercice.'); } finally { setLoading(false); } })(); }, [params.id]);
  useEffect(() => { if (!imageFile) { setPreviewUrl(null); return; } const url = URL.createObjectURL(imageFile); setPreviewUrl(url); return () => URL.revokeObjectURL(url); }, [imageFile]);

  const save = async () => {
    if (title.trim().length < 3 || !classCode || !chapter || !difficulty) { toast.error('Veuillez compléter tous les champs obligatoires.'); return; }
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push('/connexion'); return; }
    setSaving(true);
    try {
      const body = new FormData(); body.set('title', title.trim()); body.set('description', description.trim()); body.set('class_code', classCode); body.set('chapter_title', chapter); body.set('difficulty', difficulty); body.set('tags', tags); body.set('publication_status', publicationStatus); if (imageFile) body.set('image', imageFile);
      const response = await fetch(`${apiUrl}/api/exercises/${params.id}`, { method: 'PUT', headers: { Authorization: `Bearer ${session.access_token}` }, body });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.detail ?? 'Impossible de modifier l’exercice.');
      invalidateCacheTags('exercises', 'classes', 'notifications');
      toast.success('Exercice mis à jour');
      router.push(`/prof/exercices/${params.id}`); router.refresh();
    } catch (requestError) { toast.error('Modification impossible', { description: requestError instanceof Error ? requestError.message : undefined }); } finally { setSaving(false); }
  };

  if (loading) return <div className="py-16 text-center text-sm text-muted-foreground">Chargement de l’exercice…</div>;
  if (error) return <Card className="border-destructive/20"><CardContent className="py-12 text-center text-sm text-destructive">{error}</CardContent></Card>;
  return <div className="space-y-6"><Breadcrumbs items={[{ label: 'Exercices', href: '/prof/exercices' }, { label: title, href: `/prof/exercices/${params.id}` }, { label: 'Modifier' }]} /><PageHeader title="Modifier l’exercice" subtitle="Mettez à jour l’énoncé, ses métadonnées et sa publication." /><div className="grid gap-6 lg:grid-cols-3"><div className="space-y-6 lg:col-span-2"><Card><CardHeader><CardTitle className="text-base">Image de l’exercice</CardTitle></CardHeader><CardContent className="space-y-3"><img src={previewUrl ?? imageUrl} alt="Aperçu de l’exercice" className="mx-auto max-h-96 rounded-lg border border-border object-contain" /><Label htmlFor="replacement-image" className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-secondary"><ImagePlus className="h-4 w-4" />Remplacer l’image</Label><Input id="replacement-image" type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(event) => setImageFile(event.target.files?.[0] ?? null)} />{imageFile && <p className="text-xs text-muted-foreground">Nouvelle image : {imageFile.name}</p>}</CardContent></Card><Card><CardHeader><CardTitle className="text-base">Informations</CardTitle></CardHeader><CardContent className="space-y-4"><div><Label htmlFor="edit-title">Titre *</Label><Input id="edit-title" className="mt-1.5" value={title} onChange={(event) => setTitle(event.target.value)} /></div><div><Label htmlFor="edit-description">Description</Label><Textarea id="edit-description" className="mt-1.5 min-h-24" value={description} onChange={(event) => setDescription(event.target.value)} /></div><div className="grid gap-4 sm:grid-cols-2"><div><Label>Classe *</Label><Select value={classCode} onValueChange={(value) => { setClassCode(value); setChapter(''); }}><SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger><SelectContent>{classes.map((item) => <SelectItem key={item.id} value={item.code}>{item.code} — {item.name}</SelectItem>)}</SelectContent></Select></div><div><Label>Chapitre *</Label><Select value={chapter} onValueChange={setChapter} disabled={!classCode}><SelectTrigger className="mt-1.5"><SelectValue placeholder="Sélectionner" /></SelectTrigger><SelectContent>{chapters.map((item) => <SelectItem key={item.id} value={item.title}>{item.title}</SelectItem>)}</SelectContent></Select></div></div><div><Label>Difficulté *</Label><Select value={difficulty} onValueChange={setDifficulty}><SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="facile">Facile</SelectItem><SelectItem value="moyen">Moyen</SelectItem><SelectItem value="difficile">Difficile</SelectItem></SelectContent></Select></div><div><Label htmlFor="edit-tags">Tags</Label><Input id="edit-tags" className="mt-1.5" value={tags} onChange={(event) => setTags(event.target.value)} placeholder="limites, continuité, fonction" /><p className="mt-1 text-xs text-muted-foreground">Séparez les tags par des virgules, 10 maximum.</p></div></CardContent></Card></div><Card className="h-fit"><CardHeader><CardTitle className="text-base">Publication</CardTitle></CardHeader><CardContent className="space-y-4"><Select value={publicationStatus} onValueChange={setPublicationStatus}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="brouillon">Brouillon</SelectItem><SelectItem value="publie">Publié</SelectItem><SelectItem value="depublie">Dépublié</SelectItem></SelectContent></Select><Button className="w-full" disabled={saving} onClick={() => void save()}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{saving ? 'Enregistrement…' : 'Enregistrer'}</Button><Button className="w-full" variant="outline" disabled={saving} onClick={() => router.push(`/prof/exercices/${params.id}`)}>Annuler</Button></CardContent></Card></div></div>;
}
