'use client';

import './globals.css';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function RootError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="fr">
      <body className="font-sans antialiased">
        <main className="flex min-h-screen items-center justify-center bg-background px-6">
          <div className="max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <AlertTriangle className="h-7 w-7" aria-hidden="true" />
            </div>
            <h1 className="mt-5 text-xl font-bold text-foreground">WahaMath rencontre un problème</h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Veuillez réessayer. Si le problème persiste, revenez dans quelques instants.</p>
            <button className="mt-6 inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground" onClick={reset}>
              <RefreshCw className="h-4 w-4" aria-hidden="true" />Réessayer
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
