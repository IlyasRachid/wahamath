'use client';

import { apiUrl } from '@/lib/api-url';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Save, Send, ArrowLeft } from 'lucide-react';
import { PageHeader, Breadcrumbs } from '@/components/shared/page-header';
import { UploadDropzone } from '@/components/shared/upload-dropzone';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { X } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { cachedApiGet, invalidateApiCache } from '@/lib/api-cache';

export default function AddExercisePage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [classCode, setClassCode] = useState('');
  const [chapter, setChapter] = useState('');
  // New exercises default to medium difficulty; choosing another value remains optional.
  const [difficulty, setDifficulty] = useState('moyen');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [publish, setPublish] = useState(false);
  const [hasImage, setHasImage] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [classes, setClasses] = useState<{ id: string; code: string; name: string; chapters: { id: string; title: string }[] }[]>([]);
  const [metadataError, setMetadataError] = useState<string | null>(null);

  const availableChapters = classes.find((item) => item.code === classCode)?.chapters ?? [];

  useEffect(() => { (async () => { try { setClasses((await cachedApiGet<{ items: { id: string; code: string; name: string; chapters: { id: string; title: string }[] }[] }>('/api/classes', 5 * 60_000, ['classes'])).items); } catch (error) { setMetadataError(error instanceof Error ? error.message : 'Impossible de charger les classes.'); } })(); }, []);

  const addTag = () => {
    const t = tagInput.trim().toLowerCase();
    if (t && !tags.includes(t)) {
      setTags([...tags, t]);
    }
    setTagInput('');
  };

  const removeTag = (t: string) => setTags(tags.filter((x) => x !== t));

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!hasImage) e.image = 'Veuillez téléverser une image de l\'exercice.';
    if (!title.trim()) e.title = 'Le titre est obligatoire.';
    if (!classCode) e.classCode = 'Veuillez sélectionner une classe.';
    if (!chapter) e.chapter = 'Veuillez sélectionner un chapitre.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (isPublish: boolean) => {
    if (!validate()) {
      toast.error('Veuillez corriger les erreurs avant de continuer.');
      return;
    }
    if (!imageFile) return;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.error('Votre session a expiré. Veuillez vous reconnecter.');
      router.push('/connexion');
      return;
    }

    const formData = new FormData();
    formData.set('title', title.trim());
    formData.set('class_code', classCode);
    formData.set('chapter_title', chapter);
    formData.set('difficulty', difficulty);
    formData.set('tags', tags.join(','));
    formData.set('description', description.trim());
    formData.set('publication_status', isPublish ? 'publie' : 'brouillon');
    formData.set('image', imageFile);

    try {
      const response = await fetch(`${apiUrl}/api/exercises`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: formData,
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.detail ?? 'Impossible d’enregistrer l’exercice.');
      }
      invalidateApiCache('/api/exercises', ['exercises']);
      invalidateApiCache('/api/classes', ['classes']);
      toast.success(isPublish ? 'Exercice publié avec succès' : 'Brouillon enregistré');
      router.push('/prof/exercices');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Une erreur est survenue.');
    }
  };

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'Exercices', href: '/prof/exercices' }, { label: 'Ajouter un exercice' }]} />
      <PageHeader title="Ajouter un exercice" subtitle="Téléversez une image d'exercice et renseignez ses métadonnées." />

      {metadataError && <p className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">{metadataError}</p>}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Upload + preview */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Image de l’exercice</CardTitle>
            </CardHeader>
            <CardContent>
              <UploadDropzone onUploaded={setHasImage} onFileChange={setImageFile} />
              {errors.image && !hasImage && (
                <p className="mt-2 text-sm text-destructive">{errors.image}</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Détails de l’exercice</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="title">Titre <span className="text-destructive">*</span></Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Étude d'une fonction rationnelle"
                  className="mt-1.5"
                />
                {errors.title && <p className="mt-1 text-xs text-destructive">{errors.title}</p>}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Classe <span className="text-destructive">*</span></Label>
                  <Select value={classCode} onValueChange={(v) => { setClassCode(v); setChapter(''); }}>
                    <SelectTrigger className="mt-1.5"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                    <SelectContent>
                      {classes.map((c) => (
                        <SelectItem key={c.code} value={c.code}>{c.code} — {c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.classCode && <p className="mt-1 text-xs text-destructive">{errors.classCode}</p>}
                </div>

                <div>
                  <Label>Chapitre <span className="text-destructive">*</span></Label>
                  <Select value={chapter} onValueChange={setChapter} disabled={!classCode}>
                    <SelectTrigger className="mt-1.5"><SelectValue placeholder={classCode ? 'Sélectionner' : 'Choisir une classe d\'abord'} /></SelectTrigger>
                    <SelectContent>
                      {availableChapters.map((c) => (
                        <SelectItem key={c.id} value={c.title}>{c.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.chapter && <p className="mt-1 text-xs text-destructive">{errors.chapter}</p>}
                </div>
              </div>

              <div>
                <Label>Difficulté (optionnel)</Label>
                <Select value={difficulty} onValueChange={setDifficulty}>
                  <SelectTrigger className="mt-1.5"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="facile">Facile</SelectItem>
                    <SelectItem value="moyen">Moyen</SelectItem>
                    <SelectItem value="difficile">Difficile</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="tags">Tags</Label>
                <div className="mt-1.5 flex gap-2">
                  <Input
                    id="tags"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                    placeholder="Ajouter un tag et appuyer sur Entrée"
                  />
                  <Button type="button" variant="outline" onClick={addTag}>Ajouter</Button>
                </div>
                {tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {tags.map((t) => (
                      <Badge key={t} variant="secondary" className="gap-1">
                        {t}
                        <button onClick={() => removeTag(t)} className="ml-0.5 rounded-full hover:bg-muted">
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="description">Description (optionnel)</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Brève description de l'exercice, consignes particulières..."
                  className="mt-1.5 min-h-[80px] resize-none"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar: publication settings */}
        <div className="space-y-4">
          <Card className="sticky top-20">
            <CardHeader>
              <CardTitle className="text-base">Statut de publication</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/30 p-3">
                <div>
                  <p className="text-sm font-medium text-foreground">Publier immédiatement</p>
                  <p className="text-xs text-muted-foreground">Si désactivé, l’exercice sera enregistré comme brouillon.</p>
                </div>
                <Switch checked={publish} onCheckedChange={setPublish} />
              </div>

              <div className="space-y-2">
                <Button className="w-full" onClick={() => handleSubmit(publish)}>
                  <Send className="h-4 w-4" />
                  {publish ? 'Publier l\'exercice' : 'Enregistrer comme brouillon'}
                </Button>
                <Button variant="outline" className="w-full" onClick={() => handleSubmit(false)}>
                  <Save className="h-4 w-4" />
                  Enregistrer comme brouillon
                </Button>
                <Button variant="ghost" className="w-full" onClick={() => router.back()}>
                  <ArrowLeft className="h-4 w-4" />
                  Annuler
                </Button>
              </div>

              <div className="rounded-lg bg-secondary/40 p-3 text-xs text-muted-foreground">
                <p className="font-medium text-foreground">Récapitulatif</p>
                <p className="mt-1">Titre: {title || '—'}</p>
                <p>Classe: {classCode || '—'}</p>
                <p>Chapitre: {chapter || '—'}</p>
                <p>Difficulté: {difficulty || '—'}</p>
                <p>Tags: {tags.length > 0 ? tags.join(', ') : '—'}</p>
                <p>Image: {hasImage ? 'Téléversée' : 'Aucune'}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
