'use client';

import Link from 'next/link';
import { ArrowRight, BookOpen, GraduationCap, MessageSquare, ShieldCheck } from 'lucide-react';
import { WahaLogo } from '@/components/brand/logo';
import { MathMotifAxes, MathMotifFormula, MathMotifGrid, MathMotifIntegral, MathMotifSigma } from '@/components/math/motifs';
import { Button } from '@/components/ui/button';

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      {/* Decorative math motifs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-20 -top-20 h-64 w-64 text-primary/10">
          <MathMotifGrid className="h-full w-full" />
        </div>
        <div className="absolute right-10 top-32 h-56 w-56 text-accent/15">
          <MathMotifAxes className="h-full w-full" />
        </div>
        <div className="absolute -right-16 top-1/2 h-72 w-72 text-primary/10">
          <MathMotifIntegral className="h-full w-full" />
        </div>
        <div className="absolute bottom-20 left-1/4 h-48 w-48 text-accent/10">
          <MathMotifSigma className="h-full w-full" />
        </div>
        <div className="absolute -bottom-10 right-1/3 h-56 w-56 text-primary/10">
          <MathMotifFormula className="h-full w-full" />
        </div>
      </div>

      {/* Header */}
      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <WahaLogo />
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link href="/inscription">Inscription</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/connexion">Connexion</Link>
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 pt-12 pb-16 sm:pt-20 sm:pb-24">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card/80 px-4 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur-sm">
            <span className="flex h-2 w-2 rounded-full bg-success" />
            Année scolaire 2026–2027
          </div>
          <h1 className="text-balance text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl">
            Les mathématiques,
            <br />
            <span className="text-primary">claires et accessibles</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-balance text-base leading-relaxed text-muted-foreground sm:text-lg">
            WahaMath accompagne les lycéens marocains dans la pratique des mathématiques
            avec des exercices, des discussions encadrées par les professeurs, et un suivi
            structuré par classe et chapitre.
          </p>
        </div>

        {/* Role selection */}
        <div className="mx-auto mt-14 grid max-w-3xl gap-5 sm:grid-cols-2">
          <Link
            href="/connexion?role=student"
            className="group relative overflow-hidden rounded-2xl border border-border bg-card p-7 shadow-sm transition-all hover:-translate-y-1 hover:border-primary/30 hover:shadow-xl"
          >
            <div className="absolute -right-6 -top-6 h-28 w-28 text-primary/10 transition-opacity group-hover:opacity-30">
              <MathMotifAxes className="h-full w-full" />
            </div>
            <div className="relative">
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <GraduationCap className="h-7 w-7" />
              </div>
              <h2 className="text-xl font-bold text-foreground">Je suis élève</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Accède à tes classes, résous des exercices et pose tes questions
                à tes professeurs et camarades.
              </p>
              <div className="mt-6 flex items-center gap-1.5 text-sm font-medium text-primary transition-all group-hover:gap-2.5">
                Accéder à l'espace élève
                <ArrowRight className="h-4 w-4" />
              </div>
            </div>
          </Link>

          <Link
            href="/connexion?role=teacher"
            className="group relative overflow-hidden rounded-2xl border border-border bg-card p-7 shadow-sm transition-all hover:-translate-y-1 hover:border-accent/30 hover:shadow-xl"
          >
            <div className="absolute -right-6 -top-6 h-28 w-28 text-accent/10 transition-opacity group-hover:opacity-30">
              <MathMotifGrid className="h-full w-full" />
            </div>
            <div className="relative">
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-xl bg-accent/10 text-accent">
                <ShieldCheck className="h-7 w-7" />
              </div>
              <h2 className="text-xl font-bold text-foreground">Je suis professeur</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Publie des exercices, encadre les discussions, modère les échanges
                et suis l'activité de tes classes.
              </p>
              <div className="mt-6 flex items-center gap-1.5 text-sm font-medium text-accent transition-all group-hover:gap-2.5">
                Accéder à l'espace professeur
                <ArrowRight className="h-4 w-4" />
              </div>
            </div>
          </Link>
        </div>

        {/* Feature highlights */}
        <div className="mx-auto mt-20 grid max-w-4xl gap-6 sm:grid-cols-3">
          {[
            { icon: BookOpen, title: 'Exercices par classe', desc: 'SM2, SM1, PC2, TC — organisés par chapitre' },
            { icon: MessageSquare, title: 'Questions encadrées', desc: 'Discussions modérées par les professeurs' },
            { icon: ShieldCheck, title: 'Environnement sain', desc: 'Modération et bienveillance garanties' },
          ].map((f) => (
            <div key={f.title} className="flex flex-col items-center text-center">
              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-lg bg-secondary text-primary">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">{f.title}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border bg-card/50">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-6 text-xs text-muted-foreground sm:flex-row">
          <div className="flex items-center gap-2">
            <WahaLogo showText={false} />
            <span>WahaMath — Prototype de validation</span>
          </div>
          <p>Conçu pour les lycées marocains · Interface en français</p>
        </div>
      </footer>
    </div>
  );
}
