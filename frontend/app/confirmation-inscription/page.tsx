'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { AuthLayout } from '@/components/shared/auth-layout';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase/client';

export default function EnrollmentConfirmationPage() {
  const [checking, setChecking] = useState(true);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const complete = async () => {
      const url = new URL(window.location.href);
      const code = url.searchParams.get('code');
      let { data: { session } } = await supabase.auth.getSession();
      if (!session && code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) { if (active) { setError('Ce lien de confirmation est invalide ou a expiré.'); setChecking(false); } return; }
        ({ data: { session } } = await supabase.auth.getSession());
      }
      if (!active) return;
      if (!session) { setError('Ce lien de confirmation est invalide ou a expiré.'); setChecking(false); return; }
      await supabase.auth.signOut();
      if (active) { setConfirmed(true); setChecking(false); }
    };
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (active && event === 'SIGNED_IN' && session) void complete();
    });
    void complete();
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, []);

  return <AuthLayout>{checking ? <div className="py-12 text-center"><Loader2 className="mx-auto h-7 w-7 animate-spin text-primary" /><p className="mt-3 text-sm text-muted-foreground">Confirmation de votre adresse e-mail…</p></div> : error ? <div className="animate-scale-in"><div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive"><AlertCircle className="h-7 w-7" /></div><h1 className="mt-5 text-2xl font-bold text-foreground">Confirmation impossible</h1><p className="mt-3 text-sm leading-relaxed text-muted-foreground">{error}</p><Button asChild className="mt-6 w-full"><Link href="/connexion">Retour à la connexion</Link></Button></div> : confirmed ? <div className="animate-scale-in"><div className="flex h-14 w-14 items-center justify-center rounded-full bg-success/10 text-success"><CheckCircle2 className="h-7 w-7" /></div><h1 className="mt-5 text-2xl font-bold text-foreground">Adresse e-mail confirmée</h1><p className="mt-3 text-sm leading-relaxed text-muted-foreground">Votre demande est maintenant en attente de validation par le professeur. Vous pourrez vous connecter dès que votre compte sera accepté.</p><Button asChild className="mt-6 w-full"><Link href="/connexion">Retour à la connexion</Link></Button></div> : null}</AuthLayout>;
}
