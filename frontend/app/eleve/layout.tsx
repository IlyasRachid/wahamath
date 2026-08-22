'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell, studentBottomNav, studentNav } from '@/components/shared/app-shell';
import { hydrateApiCache } from '@/lib/api-cache';
import { supabase } from '@/lib/supabase/client';

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return router.replace('/connexion?role=student');
      const { data: profile } = await supabase.from('profiles').select('role,status').eq('id', session.user.id).single();
      if (!profile || profile.role !== 'student' || profile.status !== 'active') return router.replace('/connexion?role=student');
      hydrateApiCache(session.user.id);
      setAllowed(true);
    })();
  }, [router]);

  if (!allowed) return <div className="min-h-screen bg-background" />;
  return <AppShell role="student" navGroups={studentNav} bottomNav={studentBottomNav} user={{ name: 'Élève', subtitle: 'Élève', avatarColor: 'hsl(224 76% 28%)' }}>{children}</AppShell>;
}
