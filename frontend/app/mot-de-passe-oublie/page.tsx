'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AlertCircle, ArrowLeft, CheckCircle2, Loader2, Mail } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { AuthLayout } from '@/components/shared/auth-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const cleanEmail = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) { setError('Veuillez saisir une adresse e-mail valide.'); return; }
    setLoading(true); setError(null);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(cleanEmail, { redirectTo: `${window.location.origin}/reinitialiser-mot-de-passe` });
    setLoading(false);
    if (resetError) { setError(resetError.message.includes('rate limit') ? 'Trop de demandes ont été envoyées. Veuillez réessayer plus tard.' : 'Impossible d’envoyer l’e-mail de récupération.'); return; }
    setSent(true);
  };

  return <AuthLayout>{sent ? <div className="text-center animate-scale-in"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success/10 text-success"><CheckCircle2 className="h-7 w-7" /></div><h1 className="mt-5 text-2xl font-bold text-foreground">Vérifiez votre boîte e-mail</h1><p className="mt-3 text-sm leading-relaxed text-muted-foreground">Si un compte correspond à <span className="font-medium text-foreground">{email.trim()}</span>, vous recevrez un lien sécurisé pour choisir un nouveau mot de passe.</p><Button asChild variant="outline" className="mt-6 w-full"><Link href="/connexion"><ArrowLeft className="h-4 w-4" />Retour à la connexion</Link></Button></div> : <><h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Mot de passe oublié</h1><p className="mt-2 text-sm text-muted-foreground">Saisissez votre adresse e-mail pour recevoir un lien de récupération.</p>{error && <div className="mt-5 flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/5 px-3.5 py-2.5 text-sm text-destructive"><AlertCircle className="h-4 w-4 shrink-0" />{error}</div>}<form className="mt-6 space-y-5" onSubmit={submit} noValidate><div className="space-y-1.5"><Label htmlFor="recovery-email">Adresse e-mail</Label><div className="relative"><Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input id="recovery-email" type="email" value={email} onChange={(event) => { setEmail(event.target.value); setError(null); }} className="pl-9" autoComplete="email" placeholder="votre@email.com" /></div></div><Button className="w-full" size="lg" disabled={loading}>{loading ? <><Loader2 className="h-4 w-4 animate-spin" />Envoi…</> : 'Envoyer le lien de récupération'}</Button></form><p className="mt-6 text-center text-sm"><Link href="/connexion" className="font-medium text-primary hover:underline"><ArrowLeft className="mr-1 inline h-4 w-4" />Retour à la connexion</Link></p></>}</AuthLayout>;
}
