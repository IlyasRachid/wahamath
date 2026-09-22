'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { MessageSquare } from 'lucide-react';
import { cachedApiGet, peekApiCache } from '@/lib/api-cache';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { Card, CardContent } from '@/components/ui/card';

type Thread = { id: string; status: 'open' | 'closed'; created_at: string; exercises: { title: string; chapters: { title: string } | null } | null };
export default function StudentInstructionsPage() {
  const cached = peekApiCache<{ items: Thread[] }>('/api/instruction-threads');
  const [items, setItems] = useState<Thread[]>(() => cached?.items ?? []); const [loading, setLoading] = useState(!cached); const [error, setError] = useState<string | null>(null);
  const load = async () => { try { setError(null); setItems((await cachedApiGet<{ items: Thread[] }>('/api/instruction-threads', 5 * 60_000, ['instructions'])).items); } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Impossible de charger les instructions.'); } finally { setLoading(false); } };
  useEffect(() => { void load(); const refresh = () => void load(); window.addEventListener('wahamath-instructions-updated', refresh); return () => window.removeEventListener('wahamath-instructions-updated', refresh); }, []);
  return <div className="space-y-6"><PageHeader title="Instructions" subtitle="Vos échanges privés avec le professeur." />{loading ? <p className="py-12 text-center text-sm text-muted-foreground">Chargement des instructions…</p> : error ? <p className="py-12 text-center text-sm text-destructive">{error}</p> : !items.length ? <EmptyState icon={MessageSquare} title="Aucune instruction" description="Les instructions privées du professeur apparaîtront ici." /> : <div className="space-y-3">{items.map((item) => <Link key={item.id} href={`/eleve/instructions/${item.id}`}><Card className="transition-colors hover:border-primary/40"><CardContent className="flex items-center justify-between gap-4 p-4"><div><p className="font-medium text-foreground">Instruction du professeur</p><p className="mt-1 text-sm text-muted-foreground">{item.exercises ? <>Exercice : {item.exercises.title}{item.exercises.chapters && <> <span aria-hidden="true">·</span> Chapitre : {item.exercises.chapters.title}</>}</> : 'Sans exercice associé'}</p></div><span className={item.status === 'open' ? 'text-sm font-medium text-success' : 'text-sm text-muted-foreground'}>{item.status === 'open' ? 'Ouverte' : 'Clôturée'}</span></CardContent></Card></Link>)}</div>}</div>;
}
