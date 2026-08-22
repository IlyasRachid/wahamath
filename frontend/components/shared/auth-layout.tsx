'use client';

import { WahaLogo } from '@/components/brand/logo';
import {
  MathMotifAxes,
  MathMotifFormula,
  MathMotifGrid,
  MathMotifIntegral,
  MathMotifSigma,
  MathMotifTriangle,
} from '@/components/math/motifs';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export function AuthLayout({
  children,
  showBack = true,
}: {
  children: React.ReactNode;
  showBack?: boolean;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background lg:flex-row">
      {/* Left: decorative panel (desktop only) */}
      <aside className="relative hidden overflow-hidden bg-primary lg:flex lg:w-1/2 lg:flex-col lg:justify-between lg:p-12">
        {/* Math motifs */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute left-8 top-10 h-48 w-48 text-white/10">
            <MathMotifGrid className="h-full w-full" />
          </div>
          <div className="absolute right-12 top-1/4 h-56 w-56 text-accent/20">
            <MathMotifAxes className="h-full w-full" />
          </div>
          <div className="absolute bottom-1/3 left-1/4 h-44 w-44 text-white/10">
            <MathMotifIntegral className="h-full w-full" />
          </div>
          <div className="absolute right-1/4 bottom-10 h-52 w-52 text-accent/15">
            <MathMotifSigma className="h-full w-full" />
          </div>
          <div className="absolute left-10 bottom-1/4 h-40 w-40 text-white/10">
            <MathMotifFormula className="h-full w-full" />
          </div>
          <div className="absolute right-10 top-10 h-36 w-36 text-white/10">
            <MathMotifTriangle className="h-full w-full" />
          </div>
        </div>

        {/* Top: logo */}
        <div className="relative z-10">
          <WahaLogo variant="light" />
        </div>

        {/* Center: tagline */}
        <div className="relative z-10 max-w-md">
          <h2 className="text-3xl font-bold leading-tight text-white">
            Les mathématiques,
            <br />
            <span className="text-accent">claires et accessibles</span>
          </h2>
          <p className="mt-4 text-base leading-relaxed text-white/70">
            WahaMath accompagne les lycéens marocains dans la pratique des
            mathématiques avec des exercices, des discussions encadrées par
            les professeurs, et un suivi structuré par classe.
          </p>
        </div>

        {/* Bottom: feature pills */}
        <div className="relative z-10 flex flex-wrap gap-3">
          {[
            'Exercices par classe',
            'Questions encadrées',
            'Modération active',
          ].map((f) => (
            <span
              key={f}
              className="rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-sm text-white/80"
            >
              {f}
            </span>
          ))}
        </div>
      </aside>

      {/* Right: auth content */}
      <main className="flex flex-1 flex-col bg-background">
        {/* Mobile header */}
        <div className="flex items-center justify-between px-6 py-6 lg:hidden">
          <WahaLogo />
          {showBack && (
            <Link
              href="/"
              className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Accueil
            </Link>
          )}
        </div>

        {/* Desktop back link */}
        {showBack && (
          <div className="hidden px-12 pt-8 lg:block">
            <Link
              href="/"
              className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Retour à l'accueil
            </Link>
          </div>
        )}

        <div className="flex flex-1 items-center justify-center px-6 py-8 sm:px-8 lg:px-12 lg:py-12">
          <div className="w-full max-w-md animate-fade-in">{children}</div>
        </div>
      </main>
    </div>
  );
}
