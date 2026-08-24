import Link from 'next/link';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-background px-5 py-10 sm:px-8">
      <article className="mx-auto max-w-3xl">
        <Button asChild variant="ghost" size="sm"><Link href="/inscription"><ArrowLeft className="h-4 w-4" />Retour à l’inscription</Link></Button>
        <div className="mt-8 rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-10">
          <ShieldCheck className="h-9 w-9 text-primary" aria-hidden="true" />
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-foreground">Politique de confidentialité</h1>
          <p className="mt-2 text-sm text-muted-foreground">Version du 23 août 2026</p>
          <div className="mt-8 space-y-7 text-sm leading-7 text-muted-foreground">
            <section><h2 className="text-lg font-semibold text-foreground">Données collectées</h2><p>Lors de l’inscription, WahaMath collecte un prénom ou pseudonyme, une adresse e-mail, un numéro de téléphone et la classe demandée. La plateforme conserve également les exercices, commentaires, signalements et notifications nécessaires à son fonctionnement.</p></section>
            <section><h2 className="text-lg font-semibold text-foreground">Pourquoi ces données sont utilisées</h2><p>Elles permettent de créer et sécuriser le compte, de valider l’inscription, de donner accès à la bonne classe, de contacter l’élève si nécessaire et de modérer les discussions.</p></section>
            <section><h2 className="text-lg font-semibold text-foreground">Qui peut y accéder</h2><p>L’élève accède à ses propres données. Le professeur responsable peut consulter les informations de contact, le statut et la classe des élèves afin d’administrer la plateforme. Les commentaires sont visibles dans le cadre pédagogique prévu par la plateforme.</p></section>
            <section><h2 className="text-lg font-semibold text-foreground">Conservation et sécurité</h2><p>Les données sont conservées tant que le compte est utile à la scolarité ou jusqu’à sa suppression. Des mesures d’authentification, de contrôle d’accès et de modération sont utilisées pour protéger les comptes.</p></section>
            <section><h2 className="text-lg font-semibold text-foreground">Vos droits et contact</h2><p>Vous pouvez demander l’accès, la correction ou la suppression des données d’un compte auprès de l’enseignant responsable. Un parent ou représentant légal peut également effectuer cette demande pour un élève mineur.</p></section>
          </div>
          <p className="mt-8 border-t border-border pt-5 text-sm text-muted-foreground">En créant un compte, vous acceptez également le <Link className="font-medium text-primary hover:underline" href="/reglement">règlement de WahaMath</Link>.</p>
        </div>
      </article>
    </main>
  );
}
