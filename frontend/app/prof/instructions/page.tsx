'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { MessageSquare } from 'lucide-react';
import { apiUrl } from '@/lib/api-url';
import { supabase } from '@/lib/supabase/client';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { Card, CardContent } from '@/components/ui/card';

type Thread = { id: string; status: 'open' | 'closed'; created_at: string; exercises: { title: string } | null };
export default function TeacherInstructionsPage() {
  const [items, setItems] = useState<Thread[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null);
  useEffect(() => { (async () => { try { const { data: { session } } = await supabase.auth.getSession(); if (!session) throw new Error('Veuillez vous reconnecter.'); const headers = { Authorization: `Bearer ${session.access_token}` }; const [response, readResponse] = await Promise.all([fetch(`${apiUrl}/api/instruction-threads`, { headers }), fetch(`${apiUrl}/api/notifications/instructions/read`, { method: 'POST', headers })]); const payload = await response.json(); if (!response.ok) throw new Error(payload.detail); if (readResponse.ok) window.dispatchEvent(new Event('wahamath-notifications-updated')); setItems(payload.items); } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Impossible de charger les instructions.'); } finally { setLoading(false); } })(); }, []);
  return <div className="space-y-6"><PageHeader title="Instructions privées" subtitle="Suivez les échanges individuels avec vos élèves." />{loading ? <p className="py-12 text-center text-sm text-muted-foreground">Chargement des instructions…</p> : error ? <p className="py-12 text-center text-sm text-destructive">{error}</p> : !items.length ? <EmptyState icon={MessageSquare} title="Aucune instruction" description="Envoyez une instruction depuis la fiche d’un élève." /> : <div className="space-y-3">{items.map((item) => <Link key={item.id} href={`/prof/instructions/${item.id}`}><Card className="transition-colors hover:border-primary/40"><CardContent className="flex items-center justify-between gap-4 p-4"><div><p className="font-medium text-foreground">Instruction privée</p><p className="mt-1 text-sm text-muted-foreground">{item.exercises ? `Exercice : ${item.exercises.title}` : 'Sans exercice associé'}</p></div><span className={item.status === 'open' ? 'text-sm font-medium text-success' : 'text-sm text-muted-foreground'}>{item.status === 'open' ? 'Ouverte' : 'Clôturée'}</span></CardContent></Card></Link>)}</div>}</div>;
}
