'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell, teacherBottomNav, teacherNav } from '@/components/shared/app-shell';
import { hydrateApiCache } from '@/lib/api-cache';
import { supabase } from '@/lib/supabase/client';

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);
  const [displayName, setDisplayName] = useState('');

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return router.replace('/connexion?role=teacher');
      const { data: profile } = await supabase.from('profiles').select('role,status,display_name').eq('id', session.user.id).single();
      if (!profile || profile.role !== 'teacher' || profile.status !== 'active') return router.replace('/connexion?role=teacher');
      hydrateApiCache(session.user.id);
      setDisplayName(profile.display_name?.trim() || session.user.user_metadata.display_name?.trim() || session.user.email?.split('@')[0] || 'Utilisateur');
      setAllowed(true);
    })();
  }, [router]);

  useEffect(() => {
    const updateDisplayName = (event: Event) => setDisplayName((event as CustomEvent<string>).detail);
    window.addEventListener('wahamath-profile-updated', updateDisplayName);
    return () => window.removeEventListener('wahamath-profile-updated', updateDisplayName);
  }, []);

  if (!allowed) return <div className="min-h-screen bg-background" />;
  return <AppShell role="teacher" navGroups={teacherNav} bottomNav={teacherBottomNav} user={{ name: displayName, subtitle: 'Administrateur', avatarColor: 'hsl(173 58% 39%)' }}>{children}</AppShell>;
}
