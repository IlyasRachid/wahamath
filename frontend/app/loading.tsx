import { Loader2 } from 'lucide-react';

export default function GlobalLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Loader2 className="h-7 w-7 animate-spin" aria-hidden="true" />
        </div>
        <div>
          <p className="font-semibold text-foreground">Chargement de WahaMath</p>
          <p className="mt-1 text-sm text-muted-foreground">Un instant, s’il vous plaît…</p>
        </div>
      </div>
    </main>
  );
}
