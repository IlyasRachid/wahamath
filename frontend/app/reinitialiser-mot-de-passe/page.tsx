'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, CheckCircle2, Eye, EyeOff, Loader2, Lock } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { AuthLayout } from '@/components/shared/auth-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function ResetPasswordPage() {
  const [ready, setReady] = useState(false); const [checking, setChecking] = useState(true); const [password, setPassword] = useState(''); const [confirmation, setConfirmation] = useState(''); const [showPassword, setShowPassword] = useState(false); const [loading, setLoading] = useState(false); const [success, setSuccess] = useState(false); const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    const prepare = async () => {
      const url = new URL(window.location.href);
      const code = url.searchParams.get('code');
      let { data: { session } } = await supabase.auth.getSession();
      if (!session && code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError && active) { setError('Ce lien de récupération est invalide ou a expiré.'); setChecking(false); return; }
        ({ data: { session } } = await supabase.auth.getSession());
      }
      if (!active) return;
      setReady(Boolean(session));
      if (!session) setError('Ce lien de récupération est invalide ou a expiré.');
      setChecking(false);
    };
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => { if (active && event === 'PASSWORD_RECOVERY' && session) { setReady(true); setError(null); setChecking(false); } });
    void prepare();
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setError(null);
    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) { setError('Utilisez au moins 8 caractères, dont une lettre et un chiffre.'); return; }
    if (password !== confirmation) { setError('Les mots de passe ne correspondent pas.'); return; }
    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) { setError(updateError.message); setLoading(false); return; }
    await supabase.auth.signOut(); setLoading(false); setSuccess(true);
  };

  return <AuthLayout>{checking ? <div className="py-12 text-center"><Loader2 className="mx-auto h-7 w-7 animate-spin text-primary" /><p className="mt-3 text-sm text-muted-foreground">Vérification du lien…</p></div> : success ? <div className="text-center animate-scale-in"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success/10 text-success"><CheckCircle2 className="h-7 w-7" /></div><h1 className="mt-5 text-2xl font-bold text-foreground">Mot de passe modifié</h1><p className="mt-2 text-sm text-muted-foreground">Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.</p><Button asChild className="mt-6 w-full"><Link href="/connexion">Se connecter</Link></Button></div> : <><h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Nouveau mot de passe</h1><p className="mt-2 text-sm text-muted-foreground">Choisissez un mot de passe sécurisé pour votre compte.</p>{error && <div className="mt-5 flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/5 px-3.5 py-2.5 text-sm text-destructive"><AlertCircle className="h-4 w-4 shrink-0" />{error}</div>}{ready ? <form className="mt-6 space-y-5" onSubmit={submit}><PasswordField id="new-password" label="Nouveau mot de passe" value={password} onChange={setPassword} visible={showPassword} toggle={() => setShowPassword((value) => !value)} /><PasswordField id="confirm-password" label="Confirmer le mot de passe" value={confirmation} onChange={setConfirmation} visible={showPassword} toggle={() => setShowPassword((value) => !value)} /><Button className="w-full" size="lg" disabled={loading}>{loading ? <><Loader2 className="h-4 w-4 animate-spin" />Modification…</> : 'Enregistrer le nouveau mot de passe'}</Button></form> : <Button asChild variant="outline" className="mt-6 w-full"><Link href="/mot-de-passe-oublie">Demander un nouveau lien</Link></Button>}</>}</AuthLayout>;
}

function PasswordField({ id, label, value, onChange, visible, toggle }: { id: string; label: string; value: string; onChange: (value: string) => void; visible: boolean; toggle: () => void }) {
  return <div className="space-y-1.5"><Label htmlFor={id}>{label}</Label><div className="relative"><Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input id={id} type={visible ? 'text' : 'password'} value={value} onChange={(event) => onChange(event.target.value)} className="pl-9 pr-10" autoComplete="new-password" /><button type="button" onClick={toggle} className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:bg-secondary" aria-label={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}>{visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></div>;
}
