import Link from 'next/link';
import { ArrowLeft, BookOpenCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function RulesPage() {
  return (
    <main className="min-h-screen bg-background px-5 py-10 sm:px-8">
      <article className="mx-auto max-w-3xl">
        <Button asChild variant="ghost" size="sm"><Link href="/inscription"><ArrowLeft className="h-4 w-4" />Retour à l’inscription</Link></Button>
        <div className="mt-8 rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-10">
          <BookOpenCheck className="h-9 w-9 text-primary" aria-hidden="true" />
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-foreground">Règlement et règles de conduite</h1>
          <p className="mt-2 text-sm text-muted-foreground">Version du 23 août 2026</p>
          <div className="mt-8 space-y-7 text-sm leading-7 text-muted-foreground">
            <section><h2 className="text-lg font-semibold text-foreground">1. Utilisation de la plateforme</h2><p>WahaMath est un espace pédagogique destiné à la pratique des mathématiques. Utilisez votre propre compte et choisissez un prénom ou pseudonyme respectueux.</p></section>
            <section><h2 className="text-lg font-semibold text-foreground">2. Respect des autres</h2><p>Les commentaires doivent rester liés aux exercices, bienveillants et respectueux. Les insultes, le harcèlement, la divulgation de données personnelles ou tout contenu inapproprié sont interdits.</p></section>
            <section><h2 className="text-lg font-semibold text-foreground">3. Modération</h2><p>Les élèves et le professeur peuvent signaler un commentaire. Le professeur peut le masquer, le restaurer, l’épingler, le verrouiller ou le marquer comme résolu afin de préserver un espace de travail sûr.</p></section>
            <section><h2 className="text-lg font-semibold text-foreground">4. Compte et accès</h2><p>Les demandes d’inscription sont validées par le professeur. Un compte peut être suspendu ou supprimé en cas de non-respect de ces règles. Ne partagez jamais votre mot de passe.</p></section>
            <section><h2 className="text-lg font-semibold text-foreground">5. Contact</h2><p>Pour toute question concernant le compte, les données ou le règlement, contactez l’enseignant responsable de la classe.</p></section>
          </div>
          <p className="mt-8 border-t border-border pt-5 text-sm text-muted-foreground">Consultez aussi notre <Link className="font-medium text-primary hover:underline" href="/confidentialite">politique de confidentialité</Link>.</p>
        </div>
      </article>
    </main>
  );
}
