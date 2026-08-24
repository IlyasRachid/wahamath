'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, Loader2, Mail, Lock, AlertCircle, GraduationCap, ShieldCheck } from 'lucide-react';
import { AuthLayout } from '@/components/shared/auth-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase/client';
import { Turnstile } from '@/components/shared/turnstile';

type FieldErrors = {
  email?: string;
  password?: string;
  form?: string;
};

type LoginRole = 'student' | 'teacher';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<LoginRole>(searchParams.get('role') === 'teacher' ? 'teacher' : 'student');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);

  const validate = (): boolean => {
    const e: FieldErrors = {};
    if (!email.trim()) {
      e.email = 'Veuillez saisir votre adresse e-mail.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      e.email = 'Veuillez saisir une adresse e-mail valide.';
    }
    if (!password) {
      e.password = 'Veuillez saisir votre mot de passe.';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setErrors({});
    if (!validate()) return;
    if (!captchaToken) { setErrors({ form: 'Veuillez confirmer que vous n’êtes pas un robot.' }); return; }

    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
      options: { captchaToken: captchaToken ?? undefined },
    });

    if (error || !data.user) {
      setLoading(false);
      const message = error?.code === 'email_not_confirmed'
        ? 'Veuillez confirmer votre adresse e-mail avant de vous connecter.'
        : error?.message?.toLowerCase().includes('captcha')
          ? 'La vérification de sécurité a échoué. Veuillez réessayer.'
          : error?.message?.toLowerCase().includes('api key')
            ? 'La configuration de connexion est invalide. Contactez le professeur.'
            : 'Adresse e-mail ou mot de passe incorrect.';
      setErrors({ form: message });
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, status')
      .eq('id', data.user.id)
      .single();

    if (profileError || !profile) {
      await supabase.auth.signOut();
      setLoading(false);
      setErrors({ form: 'Votre profil est indisponible. Contactez le professeur.' });
      return;
    }

    if (profile.status !== 'active') {
      await supabase.auth.signOut();
      setLoading(false);
      setErrors({ form: 'Votre compte est en attente de validation par le professeur.' });
      return;
    }

    const expectedRole = role === 'teacher' ? 'teacher' : 'student';
    if (profile.role !== expectedRole) {
      await supabase.auth.signOut();
      setLoading(false);
      setErrors({ form: role === 'teacher' ? 'Ce compte n’est pas autorisé comme professeur / admin.' : 'Utilisez l’option professeur / admin pour ce compte.' });
      return;
    }

    setLoading(false);
    setSuccess(true);
    setTimeout(() => router.push(role === 'teacher' ? '/prof' : '/eleve'), 1200);
  };

  if (success) {
    return (
      <AuthLayout>
        <div className="flex flex-col items-center text-center animate-scale-in">
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-success/10 text-success">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Connexion réussie</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Redirection vers votre espace {role === 'teacher' ? 'professeur' : 'élève'}...
          </p>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Bienvenue sur WahaMath
        </h1>
        <p className="mt-2 text-sm text-muted-foreground sm:text-base">
          Connectez-vous pour accéder à votre espace.
        </p>
      </div>

      {/* Form-level error */}
      {errors.form && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/5 px-3.5 py-2.5 text-sm text-destructive animate-fade-in">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {errors.form}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-foreground">Je me connecte en tant que</legend>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setRole('student')}
              className={`flex items-center gap-2 rounded-lg border p-3 text-left text-sm font-medium transition-colors ${role === 'student' ? 'border-primary bg-primary/5 text-primary' : 'border-border bg-card text-muted-foreground hover:border-primary/40'}`}
              aria-pressed={role === 'student'}
            >
              <GraduationCap className="h-4 w-4 shrink-0" />
              Élève
            </button>
            <button
              type="button"
              onClick={() => setRole('teacher')}
              className={`flex items-center gap-2 rounded-lg border p-3 text-left text-sm font-medium transition-colors ${role === 'teacher' ? 'border-primary bg-primary/5 text-primary' : 'border-border bg-card text-muted-foreground hover:border-primary/40'}`}
              aria-pressed={role === 'teacher'}
            >
              <ShieldCheck className="h-4 w-4 shrink-0" />
              Professeur / admin
            </button>
          </div>
          {role === 'teacher' && (
            <p className="text-xs text-muted-foreground">Accès réservé au professeur administrateur.</p>
          )}
        </fieldset>

        {/* Email */}
        <div className="space-y-1.5">
          <Label htmlFor="email">Adresse e-mail</Label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errors.email) setErrors((p) => ({ ...p, email: undefined }));
              }}
              placeholder="ex: youssef@lycee.edu.ma"
              className={`pl-9 ${errors.email ? 'border-destructive focus-visible:ring-destructive' : ''}`}
              autoComplete="email"
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? 'email-error' : undefined}
            />
          </div>
          {errors.email && (
            <p id="email-error" className="flex items-center gap-1 text-xs text-destructive animate-fade-in">
              <AlertCircle className="h-3 w-3" />
              {errors.email}
            </p>
          )}
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Mot de passe</Label>
            <Link
              href="/mot-de-passe-oublie"
              className="text-xs font-medium text-primary transition-colors hover:text-primary/80"
            >
              Mot de passe oublié ?
            </Link>
          </div>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errors.password) setErrors((p) => ({ ...p, password: undefined }));
              }}
              placeholder="••••••••"
              className={`pl-9 pr-10 ${errors.password ? 'border-destructive focus-visible:ring-destructive' : ''}`}
              autoComplete="current-password"
              aria-invalid={!!errors.password}
              aria-describedby={errors.password ? 'password-error' : undefined}
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.password && (
            <p id="password-error" className="flex items-center gap-1 text-xs text-destructive animate-fade-in">
              <AlertCircle className="h-3 w-3" />
              {errors.password}
            </p>
          )}
        </div>

        <Turnstile onToken={(token) => { setCaptchaToken(token); if (errors.form) setErrors((current) => ({ ...current, form: undefined })); }} />

        {/* Submit */}
        <Button type="submit" className="w-full" size="lg" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Connexion en cours...
            </>
          ) : (
            'Se connecter'
          )}
        </Button>
      </form>

      {/* Footer */}
      <div className="mt-8 text-center text-sm text-muted-foreground">
        Vous n&apos;avez pas encore de compte ?{' '}
        <Link href="/inscription" className="font-semibold text-primary transition-colors hover:text-primary/80">
          Créer un compte
        </Link>
      </div>
    </AuthLayout>
  );
}
