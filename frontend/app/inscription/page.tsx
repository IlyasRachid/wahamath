'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertCircle, ArrowRight, Check, CheckCircle2, Eye, EyeOff, Loader2, Lock, Mail, Phone, UserRound } from 'lucide-react';
import { AuthLayout } from '@/components/shared/auth-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import type { ClassCode } from '@/lib/types';
import { supabase } from '@/lib/supabase/client';
import { Turnstile } from '@/components/shared/turnstile';

const classOptions: { code: ClassCode; title: string; description: string }[] = [
  { code: 'SM2', title: 'Sciences Mathématiques 2', description: 'Terminale — parcours mathématiques' },
  { code: 'SM1', title: 'Sciences Mathématiques 1', description: '1ère année — parcours mathématiques' },
  { code: 'PC2', title: 'Physique-Chimie 2', description: 'Terminale — parcours physique-chimie' },
  { code: 'TC', title: 'Tronc Commun', description: 'Tronc commun scientifique' },
];

type FormErrors = {
  name?: string;
  email?: string;
  phone?: string;
  password?: string;
  confirmPassword?: string;
  classCode?: string;
  terms?: string;
  captcha?: string;
  form?: string;
};

type SubmittedInfo = {
  name: string;
  email: string;
  phone: string;
  classCode: ClassCode;
};

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [classCode, setClassCode] = useState<ClassCode | ''>('');
  const [terms, setTerms] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState<SubmittedInfo | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);

  const clearError = (field: keyof FormErrors) => {
    if (errors[field]) setErrors((previous) => ({ ...previous, [field]: undefined }));
  };

  const validate = (): boolean => {
    const nextErrors: FormErrors = {};
    if (!name.trim()) nextErrors.name = 'Veuillez saisir votre prénom ou pseudonyme.';
    if (!email.trim()) nextErrors.email = 'Veuillez saisir votre adresse e-mail.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) nextErrors.email = 'Veuillez saisir une adresse e-mail valide.';
    if (!phone.trim()) nextErrors.phone = 'Veuillez saisir votre numéro de téléphone.';
    else if (!/^\+?[0-9 .()\-]{8,25}$/.test(phone.trim())) nextErrors.phone = 'Veuillez saisir un numéro de téléphone valide.';
    if (!password) nextErrors.password = 'Veuillez saisir un mot de passe.';
    else if (password.length < 8) nextErrors.password = 'Votre mot de passe doit contenir au moins 8 caractères.';
    else if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) nextErrors.password = 'Utilisez au moins une lettre et un chiffre.';
    if (!confirmPassword) nextErrors.confirmPassword = 'Veuillez confirmer votre mot de passe.';
    else if (password !== confirmPassword) nextErrors.confirmPassword = 'Les mots de passe ne correspondent pas.';
    if (!classCode) nextErrors.classCode = 'Veuillez sélectionner votre classe.';
    if (!terms) nextErrors.terms = 'Veuillez accepter le règlement.';
    if (!captchaToken) nextErrors.captcha = 'Veuillez confirmer que vous n’êtes pas un robot.';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validate()) return;
    if (!classCode) return;
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        captchaToken: captchaToken ?? undefined,
        emailRedirectTo: `${window.location.origin}/confirmation-inscription`,
        data: {
          display_name: name.trim(),
          requested_class_code: classCode,
          phone_number: phone.trim(),
          terms_version: '2026-08-23',
        },
      },
    });

    if (error || !data.user) {
      setLoading(false);
      setErrors({ form: error?.message ?? 'Impossible de créer votre compte. Veuillez réessayer.' });
      return;
    }

    setLoading(false);
    setSubmitted({ name: name.trim(), email: email.trim(), phone: phone.trim(), classCode });
  };

  if (submitted) {
    const selectedClass = classOptions.find((option) => option.code === submitted.classCode);
    return (
      <AuthLayout>
        <div className="animate-scale-in">
          <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-success/10 text-success">
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Confirmez votre adresse e-mail</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
            Un e-mail de confirmation a été envoyé à <span className="font-medium text-foreground">{submitted.email}</span>. Cliquez sur son lien pour confirmer votre adresse, puis votre demande sera envoyée au professeur pour validation.
          </p>

          <div className="mt-6 rounded-xl border border-border bg-secondary/35 p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-foreground">Récapitulatif</p>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-warning/25 bg-warning/10 px-2.5 py-1 text-xs font-medium text-warning-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-warning" />
                Confirmation requise
              </span>
            </div>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Pseudonyme</dt><dd className="font-medium text-foreground">{submitted.name}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Classe</dt><dd className="font-medium text-foreground">{submitted.classCode}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-muted-foreground">E-mail</dt><dd className="max-w-[65%] truncate font-medium text-foreground">{submitted.email}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Téléphone</dt><dd className="font-medium text-foreground">{submitted.phone}</dd></div>
            </dl>
            <div className="mt-4 border-t border-border pt-3 text-xs leading-relaxed text-muted-foreground">
              Après la confirmation de votre e-mail, vous verrez l’état d’attente de validation par le professeur.
            </div>
          </div>

          <Button className="mt-6 w-full" onClick={() => router.push('/connexion')}>
            Retour à la connexion
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <div className="mb-7">
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Créer votre compte</h1>
        <p className="mt-2 text-sm text-muted-foreground sm:text-base">Rejoignez votre classe sur WahaMath.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        {errors.form && <FieldError message={errors.form} />}
        <div className="space-y-1.5">
          <Label htmlFor="signup-name">Prénom ou pseudonyme</Label>
          <div className="relative">
            <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input id="signup-name" value={name} onChange={(event) => { setName(event.target.value); clearError('name'); }} placeholder="ex: Youssef ou youssef_a" className={cn('pl-9', errors.name && 'border-destructive focus-visible:ring-destructive')} autoComplete="name" aria-invalid={!!errors.name} />
          </div>
          {errors.name && <FieldError message={errors.name} />}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="signup-email">Adresse e-mail</Label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input id="signup-email" type="email" value={email} onChange={(event) => { setEmail(event.target.value); clearError('email'); }} placeholder="ex: youssef@lycee.edu.ma" className={cn('pl-9', errors.email && 'border-destructive focus-visible:ring-destructive')} autoComplete="email" aria-invalid={!!errors.email} />
          </div>
          {errors.email && <FieldError message={errors.email} />}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="signup-phone">Numéro de téléphone</Label>
          <div className="relative">
            <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input id="signup-phone" type="tel" value={phone} onChange={(event) => { setPhone(event.target.value); clearError('phone'); }} placeholder="ex : +212 6 12 34 56 78" className={cn('pl-9', errors.phone && 'border-destructive focus-visible:ring-destructive')} autoComplete="tel" aria-invalid={!!errors.phone} />
          </div>
          {errors.phone && <FieldError message={errors.phone} />}
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="signup-password">Mot de passe</Label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="signup-password" type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => { setPassword(event.target.value); clearError('password'); }} placeholder="8 caractères min." className={cn('pl-9 pr-9', errors.password && 'border-destructive focus-visible:ring-destructive')} autoComplete="new-password" aria-invalid={!!errors.password} />
              <PasswordToggle visible={showPassword} onClick={() => setShowPassword((visible) => !visible)} label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'} />
            </div>
            {errors.password ? <FieldError message={errors.password} /> : <p className="text-[11px] text-muted-foreground">8 caractères, dont une lettre et un chiffre.</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="signup-confirm">Confirmer le mot de passe</Label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="signup-confirm" type={showConfirmPassword ? 'text' : 'password'} value={confirmPassword} onChange={(event) => { setConfirmPassword(event.target.value); clearError('confirmPassword'); }} placeholder="Répétez-le" className={cn('pl-9 pr-9', errors.confirmPassword && 'border-destructive focus-visible:ring-destructive')} autoComplete="new-password" aria-invalid={!!errors.confirmPassword} />
              <PasswordToggle visible={showConfirmPassword} onClick={() => setShowConfirmPassword((visible) => !visible)} label={showConfirmPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'} />
            </div>
            {errors.confirmPassword && <FieldError message={errors.confirmPassword} />}
          </div>
        </div>

        <fieldset className="space-y-3">
          <legend className="text-sm font-medium text-foreground">Choisissez votre classe</legend>
          <div className="grid grid-cols-2 gap-3">
            {classOptions.map((option) => {
              const selected = classCode === option.code;
              return (
                <button
                  key={option.code}
                  type="button"
                  onClick={() => { setClassCode(option.code); clearError('classCode'); }}
                  className={cn(
                    'group relative rounded-xl border p-3.5 text-left transition-all focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                    selected ? 'border-primary bg-primary/[0.06] shadow-sm' : 'border-border bg-card hover:border-primary/35 hover:bg-secondary/40',
                  )}
                  aria-pressed={selected}
                >
                  <span className={cn('mb-2 inline-flex h-8 min-w-10 items-center justify-center rounded-md px-2 text-xs font-bold', selected ? 'bg-primary text-primary-foreground' : 'bg-secondary text-primary')}>
                    {option.code}
                  </span>
                  <span className="block text-xs font-semibold leading-snug text-foreground">{option.title}</span>
                  <span className="mt-1 block text-[11px] leading-snug text-muted-foreground">{option.description}</span>
                  {selected && <span className="absolute right-2.5 top-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground"><Check className="h-3 w-3" /></span>}
                </button>
              );
            })}
          </div>
          {errors.classCode && <FieldError message={errors.classCode} />}
        </fieldset>

        <div className="flex items-start gap-2.5 rounded-lg border border-border bg-secondary/25 p-3">
          <Checkbox id="terms" checked={terms} onCheckedChange={(checked) => { setTerms(checked === true); clearError('terms'); }} className="mt-0.5" aria-invalid={!!errors.terms} />
          <div>
            <Label htmlFor="terms" className="cursor-pointer text-xs font-normal leading-relaxed text-muted-foreground">
              J&apos;accepte le <Link href="/reglement" className="font-medium text-primary hover:underline">règlement et les règles de conduite de WahaMath</Link> ainsi que la <Link href="/confidentialite" className="font-medium text-primary hover:underline">politique de confidentialité</Link>.
            </Label>
            {errors.terms && <FieldError message={errors.terms} />}
          </div>
        </div>

        <div><Turnstile onToken={(token) => { setCaptchaToken(token); clearError('captcha'); }} />{errors.captcha && <FieldError message={errors.captcha} />}</div>

        <Button type="submit" className="w-full" size="lg" disabled={loading}>
          {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Création en cours...</> : <>Créer mon compte <ArrowRight className="h-4 w-4" /></>}
        </Button>
      </form>

      <div className="mt-7 text-center text-sm text-muted-foreground">
        Vous avez déjà un compte ?{' '}
        <Link href="/connexion" className="font-semibold text-primary transition-colors hover:text-primary/80">Se connecter</Link>
      </div>
    </AuthLayout>
  );
}

function FieldError({ message }: { message: string }) {
  return <p className="flex items-center gap-1 text-xs text-destructive animate-fade-in"><AlertCircle className="h-3 w-3" />{message}</p>;
}

function PasswordToggle({ visible, onClick, label }: { visible: boolean; onClick: () => void; label: string }) {
  return (
    <button type="button" onClick={onClick} className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground" aria-label={label}>
      {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
    </button>
  );
}
