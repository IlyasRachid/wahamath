import Link from 'next/link';
import { FileQuestion } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-secondary">
        <FileQuestion className="h-8 w-8 text-muted-foreground" />
      </div>
      <h1 className="text-2xl font-bold text-foreground">Page introuvable</h1>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        La page que vous recherchez n'existe pas ou a été déplacée.
      </p>
      <Link href="/" className="mt-6">
        <Button>Retour à l'accueil</Button>
      </Link>
    </div>
  );
}
