'use client';

import { AlertTriangle, RefreshCw } from 'lucide-react';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('Route error:', error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <AlertTriangle className="h-7 w-7" aria-hidden="true" />
        </div>
        <h1 className="mt-5 text-xl font-bold text-foreground">Une erreur est survenue</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">La page n’a pas pu être chargée. Vos données ne sont pas perdues.</p>
        <Button className="mt-6" onClick={reset}><RefreshCw className="h-4 w-4" />Réessayer</Button>
      </div>
    </main>
  );
}
