'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FileQuestion, Maximize2, MessageCircle, Minimize2, Pencil, Send, ZoomIn, ZoomOut } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { cachedApiGet, invalidateApiCache, invalidateCacheTags, isApiCacheStale } from '@/lib/api-cache';
import { Breadcrumbs, PageHeader } from '@/components/shared/page-header';
import { DifficultyBadge } from '@/components/shared/badges';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { CommentThread } from '@/components/shared/comment-thread';
import type { Comment } from '@/lib/types';

type RemoteExercise = {
  id: string;
  title: string;
  description: string | null;
  difficulty: 'facile' | 'moyen' | 'difficile';
  published_at: string;
  image_url: string;
  classes: { code: string } | null;
  chapters: { title: string } | null;
};

function ExerciseViewer({
  params,
  basePath = '/eleve/exercices',
}: {
  params: { id: string };
  basePath?: string;
}) {
  const isTeacherView = usePathname().startsWith('/prof/');
  const activeBasePath = isTeacherView ? '/prof/exercices' : basePath;
  const [exercise, setExercise] = useState<RemoteExercise | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [fullscreen, setFullscreen] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);

  useEffect(() => {
    const loadExercise = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Veuillez vous reconnecter pour consulter cet exercice.');
        setLoading(false);
        return;
      }
      try {
        const payload = await cachedApiGet<RemoteExercise>(`/api/exercises/${params.id}`, 30_000, ['exercises']);
        setExercise(payload);
        const commentsPayload = await cachedApiGet<{ items: any[] }>(`/api/exercises/${params.id}/comments`, 30_000, ['comments']);
        setComments(buildCommentTree(commentsPayload.items, params.id));
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : 'Exercice introuvable.');
      } finally {
        setLoading(false);
      }
    };
    loadExercise();
  }, [params.id]);

  useEffect(() => {
    let cancelled = false;
    const revalidateExercise = async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        const exercisePath = `/api/exercises/${params.id}`;
        const commentsPath = `${exercisePath}/comments`;
        // Preserve the list cache. Only this exercise is refreshed, after its
        // short revalidation window or when the viewer remains open.
        invalidateApiCache(exercisePath);
        invalidateApiCache(commentsPath);
        const [exercisePayload, commentsPayload] = await Promise.all([
          cachedApiGet<RemoteExercise>(exercisePath, 30_000, ['exercises']),
          cachedApiGet<{ items: any[] }>(commentsPath, 30_000, ['comments']),
        ]);
        if (!cancelled) {
          setExercise(exercisePayload);
          setComments(buildCommentTree(commentsPayload.items, params.id));
        }
      } catch {
        // Cached content remains usable if a background refresh fails.
      }
    };
    const exercisePath = `/api/exercises/${params.id}`;
    const commentsPath = `${exercisePath}/comments`;
    if (isApiCacheStale(exercisePath) || isApiCacheStale(commentsPath)) void revalidateExercise();
    const interval = window.setInterval(revalidateExercise, 30_000);
    document.addEventListener('visibilitychange', revalidateExercise);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', revalidateExercise);
    };
  }, [params.id]);

  if (loading) return <div className="py-16 text-center text-sm text-muted-foreground">Chargement de l’exercice…</div>;

  if (error || !exercise) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-secondary"><FileQuestion className="h-8 w-8 text-muted-foreground" /></div>
        <h1 className="text-xl font-bold text-foreground">Exercice introuvable</h1>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">{error ?? 'Cet exercice n’est pas disponible dans vos classes.'}</p>
        <Button asChild className="mt-6"><Link href={activeBasePath}>Retour aux exercices</Link></Button>
      </div>
    );
  }

  const image = (
    <img
      src={exercise.image_url}
      alt={`Énoncé : ${exercise.title}`}
      className="w-full rounded-lg shadow-lg ring-1 ring-border"
      style={{ width: `${zoom * 100}%`, maxWidth: zoom > 1 ? 'none' : '720px' }}
    />
  );

  const postComment = async () => {
    if (!commentText.trim()) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    setPosting(true);
    setCommentError(null);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'}/api/exercises/${params.id}/comments`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: commentText, parent_id: replyingTo }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.detail ?? 'Impossible de publier votre message.');
      invalidateCacheTags('comments', 'questions');
      const added = toComment(payload, params.id);
      setComments((current) => {
        if (!replyingTo) return [...current, added];
        return current.map((comment) => comment.id === replyingTo ? { ...comment, replies: [...comment.replies, added] } : comment);
      });
      setCommentText('');
      setReplyingTo(null);
    } catch (requestError) {
      setCommentError(requestError instanceof Error ? requestError.message : 'Impossible de publier votre message.');
    } finally {
      setPosting(false);
    }
  };

  const moderateComment = async (commentId: string, action: 'hide' | 'pin' | 'resolve' | 'lock') => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'}/api/comments/${commentId}/moderate`, {
      method: 'POST', headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ action }),
    });
    if (response.ok) { invalidateCacheTags('comments', 'questions', 'reports'); window.location.reload(); }
    else setCommentError('Impossible de modérer ce commentaire.');
  };
  const reportComment = async (commentId: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'}/api/comments/${commentId}/report`, {
      method: 'POST', headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({}),
    });
    if (response.ok) invalidateCacheTags('reports');
    setCommentError(response.ok ? 'Commentaire signalé au professeur.' : 'Impossible de signaler ce commentaire.');
  };

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'Exercices', href: activeBasePath }, { label: exercise.classes?.code ?? 'Classe' }, { label: exercise.title }]} />
      <PageHeader title={exercise.title} subtitle={`${exercise.classes?.code ?? ''} · ${exercise.chapters?.title ?? 'Sans chapitre'}`}>
        <DifficultyBadge difficulty={exercise.difficulty} />
        {isTeacherView && <Button asChild size="sm" variant="outline"><Link href={`/prof/exercices/${params.id}/modifier`}><Pencil className="h-4 w-4" />Modifier</Link></Button>}
      </PageHeader>

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-border bg-secondary/30 px-4 py-2.5">
          <p className="text-sm font-medium text-foreground">Énoncé de l’exercice</p>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setZoom((value) => Math.max(0.5, value - 0.25))}><ZoomOut className="h-4 w-4" /></Button>
            <span className="px-1 text-xs text-muted-foreground">{Math.round(zoom * 100)}%</span>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setZoom((value) => Math.min(2.5, value + 0.25))}><ZoomIn className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setFullscreen(true)}><Maximize2 className="h-4 w-4" /></Button>
          </div>
        </div>
        <CardContent className="overflow-auto bg-[#f5f4f0] p-4 sm:p-8"><div className="mx-auto transition-transform duration-200">{image}</div></CardContent>
      </Card>

      <div className="space-y-1"><p className="text-xs text-muted-foreground">Publié le {new Date(exercise.published_at).toLocaleDateString('fr-FR')}</p>{exercise.description && <p className="text-sm text-muted-foreground">{exercise.description}</p>}</div>

      <section className="space-y-4">
        <div className="flex items-center gap-2"><MessageCircle className="h-5 w-5 text-primary" /><h2 className="text-lg font-semibold text-foreground">Questions et discussions</h2></div>
        <Card><CardContent className="p-4">
          {replyingTo && <p className="mb-2 text-xs text-muted-foreground">Vous répondez à un commentaire. <button className="font-medium text-primary" onClick={() => setReplyingTo(null)}>Annuler</button></p>}
          <Textarea value={commentText} onChange={(event) => setCommentText(event.target.value)} placeholder="Posez votre question ou partagez votre réflexion..." className="min-h-[80px] resize-none" />
          {commentError && <p className="mt-2 text-xs text-destructive">{commentError}</p>}
          <div className="mt-3 flex justify-end"><Button size="sm" disabled={!commentText.trim() || posting} onClick={postComment}><Send className="h-4 w-4" />{replyingTo ? 'Répondre' : 'Publier'}</Button></div>
        </CardContent></Card>
        {comments.length === 0 ? <p className="rounded-xl border border-dashed border-border px-6 py-10 text-center text-sm text-muted-foreground">Aucune question pour le moment.</p> : <CommentThread comments={comments} locked={false} onReply={setReplyingTo} onReport={reportComment} isTeacher={isTeacherView} onModerate={moderateComment} />}
      </section>

      {fullscreen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-background/95 backdrop-blur-sm">
          <div className="flex items-center justify-between border-b border-border px-4 py-3"><p className="text-sm font-medium text-foreground">{exercise.title}</p><Button variant="ghost" size="icon" onClick={() => setFullscreen(false)}><Minimize2 className="h-4 w-4" /></Button></div>
          <div className="flex-1 overflow-auto bg-[#f5f4f0] p-4 sm:p-8"><div className="mx-auto">{image}</div></div>
        </div>
      )}
    </div>
  );
}

function toComment(item: any, exerciseId: string): Comment {
  return { id: item.id, exerciseId, author: item.author, isTeacher: item.is_teacher, isPinned: item.is_pinned, resolved: item.is_resolved, text: item.body, createdAt: item.created_at, replies: [] };
}

function buildCommentTree(items: any[], exerciseId: string): Comment[] {
  const comments = new Map(items.map((item) => [item.id, toComment(item, exerciseId)]));
  const roots: Comment[] = [];
  for (const item of items) {
    const comment = comments.get(item.id)!;
    const parent = item.parent_id ? comments.get(item.parent_id) : null;
    if (parent) parent.replies.push(comment); else roots.push(comment);
  }
  return roots;
}

export default function StudentExerciseViewerPage({ params }: { params: { id: string } }) {
  return <ExerciseViewer params={params} basePath="/eleve/exercices" />;
}
