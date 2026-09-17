'use client';

import { useEffect, useState } from 'react';
import { apiUrl } from '@/lib/api-url';
import { supabase } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type PresenceUser = { id: string; display_name: string; last_seen: string | null; online: boolean };
const REFRESH_INTERVAL_MS = 15_000;

function formatLastSeen(lastSeen: string | null) {
  if (!lastSeen) return 'Jamais';
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long', timeStyle: 'short' }).format(new Date(lastSeen));
}

/** This panel is only rendered in the teacher moderation workspace. */
export function OnlineStatusPanel() {
  const [users, setUsers] = useState<PresenceUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('Votre session a expiré.');
        const response = await fetch(`${apiUrl}/api/moderation/presence`, { headers: { Authorization: `Bearer ${session.access_token}` } });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.detail ?? 'Impossible de charger les statuts.');
        if (mounted) { setUsers(payload.items ?? []); setError(null); }
      } catch (reason) {
        if (mounted) setError(reason instanceof Error ? reason.message : 'Impossible de charger les statuts.');
      } finally { if (mounted) setLoading(false); }
    };
    void load();
    const interval = window.setInterval(() => void load(), REFRESH_INTERVAL_MS);
    const handleVisibility = () => { if (document.visibilityState === 'visible') void load(); };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => { mounted = false; window.clearInterval(interval); document.removeEventListener('visibilitychange', handleVisibility); };
  }, []);
  return <section className="space-y-3">
    <div><h2 className="text-lg font-semibold text-foreground">Statut en ligne</h2><p className="text-sm text-muted-foreground">Actualisé toutes les 15 secondes.</p></div>
    <Card><CardHeader className="pb-3"><CardTitle className="text-base">Utilisateurs</CardTitle></CardHeader><CardContent>
      {loading ? <p className="text-sm text-muted-foreground">Chargement des statuts…</p>
        : error ? <p className="text-sm text-destructive">{error}</p>
          : users.length === 0 ? <p className="text-sm text-muted-foreground">Aucun utilisateur actif.</p>
            : <div className="divide-y divide-border">{users.map((user) => <div key={user.id} className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0"><p className="min-w-0 truncate text-sm font-medium text-foreground">{user.display_name}</p><div className="shrink-0 text-right text-sm"><p className={user.online ? 'font-medium text-success' : 'font-medium text-muted-foreground'}><span aria-hidden="true">{user.online ? '●' : '○'}</span> {user.online ? 'En ligne' : 'Hors ligne'}</p>{!user.online && <p className="mt-1 text-xs text-muted-foreground">Dernière connexion : {formatLastSeen(user.last_seen)}</p>}</div></div>)}</div>}
    </CardContent></Card>
  </section>;
}
