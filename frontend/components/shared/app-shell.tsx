'use client';

import { apiUrl } from '@/lib/api-url';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';
import {
  Bell,
  BookOpen,
  FileText,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  PlusCircle,
  Settings,
  Shield,
  Users,
  Activity,
  X,
} from 'lucide-react';
import { WahaLogo } from '@/components/brand/logo';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { supabase } from '@/lib/supabase/client';
import { clearApiCache, invalidateCacheTags, peekApiCache, preloadAuthenticatedData } from '@/lib/api-cache';
import { ThemeToggle } from '@/components/shared/theme-toggle';

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: number;
};

export type NavGroup = {
  label?: string;
  items: NavItem[];
};

type Props = {
  role: 'student' | 'teacher';
  navGroups: NavGroup[];
  bottomNav?: NavItem[];
  user: { name: string; subtitle: string; avatarColor: string };
  children: React.ReactNode;
};

export function AppShell({ role, navGroups, bottomNav, user, children }: Props) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [reportCount, setReportCount] = useState(0);
  const [enrollmentCount, setEnrollmentCount] = useState(0);
  const [notificationCount, setNotificationCount] = useState(0);
  const previousQuestionCount = useRef<number | null>(null);
  const previousReportCount = useRef<number | null>(null);
  const previousEnrollmentCount = useRef<number | null>(null);
  const previousNotificationCount = useRef<number | null>(null);
  const previousRevisions = useRef<Record<string, string>>({});
  const [questionCount, setQuestionCount] = useState(0);
  useEffect(() => {
    // The shell is mounted only after the role/status guard has accepted the
    // session. Populate the navigation cache before the first tab is opened.
    void preloadAuthenticatedData(role);
  }, [role]);

  useEffect(() => {
    const refreshCounts = async () => {
      if (document.visibilityState !== 'visible') return;
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const headers = { Authorization: `Bearer ${session.access_token}` };
      const revisions = await fetch(`${apiUrl}/api/revisions`, { headers });
      if (revisions.ok) {
        const nextRevisions = Object.fromEntries((await revisions.json()).items.map((item: { resource: string; updated_at: string }) => [item.resource, item.updated_at]));
        const changed = Object.keys(nextRevisions).filter((resource) => previousRevisions.current[resource] && previousRevisions.current[resource] !== nextRevisions[resource]);
        if (changed.length) invalidateCacheTags(...changed.filter((resource): resource is 'exercises' | 'classes' | 'questions' | 'comments' | 'notifications' | 'reports' | 'enrollments' => ['exercises', 'classes', 'questions', 'comments', 'notifications', 'reports', 'enrollments'].includes(resource)));
        previousRevisions.current = nextRevisions;
      }
      const questions = await fetch(`${apiUrl}/api/questions`, { headers });
      if (questions.ok) {
        const nextCount = (await questions.json()).items.filter((item: { is_resolved: boolean; reply_count: number }) => !item.is_resolved && item.reply_count === 0).length;
        if (previousQuestionCount.current !== null && previousQuestionCount.current !== nextCount) invalidateCacheTags('questions');
        previousQuestionCount.current = nextCount;
        setQuestionCount(nextCount);
      }
      const notifications = await fetch(`${apiUrl}/api/notifications`, { headers });
      if (notifications.ok) {
        const notificationItems = (await notifications.json()).items as { read_at: string | null; type: string }[];
        const nextCount = notificationItems.filter((item) => !item.read_at && (role !== 'teacher' || item.type === 'instruction')).length;
        const cachedNotifications = peekApiCache<{ items: { read_at: string | null; type: string }[] }>('/api/notifications');
        const cachedCount = cachedNotifications?.items.filter((item) => !item.read_at && (role !== 'teacher' || item.type === 'instruction')).length;
        const changed = previousNotificationCount.current !== nextCount || (cachedCount !== undefined && cachedCount !== nextCount);
        if (changed) {
          invalidateCacheTags('notifications');
          window.dispatchEvent(new Event('wahamath-notifications-updated'));
        }
        previousNotificationCount.current = nextCount;
        setNotificationCount(nextCount);
      }
      if (role === 'teacher') {
        const enrollments = await fetch(`${apiUrl}/api/admin/students/pending`, { headers });
        if (enrollments.ok) {
          const nextCount = (await enrollments.json()).items.length;
          if (previousEnrollmentCount.current !== nextCount) {
            invalidateCacheTags('enrollments');
            window.dispatchEvent(new Event('wahamath-enrollments-updated'));
          }
          previousEnrollmentCount.current = nextCount;
          setEnrollmentCount(nextCount);
        }
        const reports = await fetch(`${apiUrl}/api/moderation/reports`, { headers });
        if (reports.ok) {
          const nextCount = (await reports.json()).items.length;
          if (previousReportCount.current !== null && previousReportCount.current !== nextCount) invalidateCacheTags('reports');
          previousReportCount.current = nextCount;
          setReportCount(nextCount);
        }
      }
    };
    refreshCounts();
    const interval = window.setInterval(refreshCounts, 2_000);
    document.addEventListener('visibilitychange', refreshCounts);
    return () => { window.clearInterval(interval); document.removeEventListener('visibilitychange', refreshCounts); };
  }, [role, pathname]);
  useEffect(() => {
    const refreshNotifications = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const response = await fetch(`${apiUrl}/api/notifications`, { headers: { Authorization: `Bearer ${session.access_token}` } });
      if (response.ok) setNotificationCount((await response.json()).items.filter((item: { read_at: string | null; type: string }) => !item.read_at && (role !== 'teacher' || item.type === 'instruction')).length);
    };
    window.addEventListener('wahamath-notifications-updated', refreshNotifications);
    return () => window.removeEventListener('wahamath-notifications-updated', refreshNotifications);
  }, [role]);
  const signOut = async () => {
    await supabase.auth.signOut();
    clearApiCache();
    window.location.assign('/connexion');
  };

  const isActive = (href: string) => {
    if (href === '/eleve' || href === '/prof') return pathname === href;
    return pathname.startsWith(href);
  };

  const SidebarContent = ({ onNavigate }: { onNavigate?: () => void }) => (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex h-16 items-center border-b border-white/10 px-5">
        <Link href={role === 'student' ? '/eleve' : '/prof'} onClick={onNavigate}>
          <WahaLogo variant="light" />
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {navGroups.map((group, gi) => (
          <div key={gi} className="mb-4">
            {group.label && (
              <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
                {group.label}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                      active
                        ? 'bg-sidebar-accent text-white'
                        : 'text-sidebar-foreground/70 hover:bg-white/5 hover:text-sidebar-foreground',
                    )}
                  >
                    <item.icon className="h-4.5 w-4.5 shrink-0" />
                    <span className="flex-1">{item.label}</span>
                    {(item.href === '/prof/moderation' ? reportCount : item.href === '/prof/inscriptions' ? enrollmentCount : item.href === '/prof/instructions' ? notificationCount : item.href.endsWith('/questions') ? questionCount : item.badge) ? (
                      <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-[11px] font-bold text-white">
                        {item.href === '/prof/moderation' ? reportCount : item.href === '/prof/inscriptions' ? enrollmentCount : item.href === '/prof/instructions' ? notificationCount : item.href.endsWith('/questions') ? questionCount : item.badge}
                      </span>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-white/10 p-3">
        {bottomNav?.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                active
                  ? 'bg-sidebar-accent text-white'
                  : 'text-sidebar-foreground/70 hover:bg-white/5 hover:text-sidebar-foreground',
              )}
            >
              <item.icon className="h-4.5 w-4.5 shrink-0" />
              {item.label}
            </Link>
          );
        })}

        <div className="mt-2 flex items-center gap-3 rounded-lg px-3 py-2">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
            style={{ backgroundColor: user.avatarColor }}
          >
            {user.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-sidebar-foreground">{user.name}</p>
            <p className="truncate text-xs text-sidebar-foreground/50">{user.subtitle}</p>
          </div>
          <button
            type="button"
            onClick={signOut}
            className="rounded-md p-1.5 text-sidebar-foreground/50 transition-colors hover:bg-white/5 hover:text-sidebar-foreground"
            title="Déconnexion"
            aria-label="Se déconnecter"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );

  const allTopItems = navGroups.flatMap((g) => g.items);
  const mobileBottomItems = allTopItems.slice(0, 5);

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 lg:block">
        <SidebarContent />
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-md sm:px-6">
          {/* Mobile menu */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Ouvrir le menu de navigation">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <SidebarContent onNavigate={() => setMobileOpen(false)} />
            </SheetContent>
          </Sheet>

          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <Link href={role === 'student' ? '/eleve/notifications' : '/prof/instructions'} aria-label="Voir les notifications">
              <Button variant="ghost" size="icon" className="relative" aria-label="Voir les notifications">
                <Bell className="h-5 w-5" />
                {notificationCount > 0 && (
                  <span className="absolute right-1.5 top-1.5 flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
                  </span>
                )}
              </Button>
            </Link>
            <Link href={role === 'student' ? '/eleve' : '/prof'} aria-label="Ouvrir le tableau de bord">
              <div
                className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold text-white"
                style={{ backgroundColor: user.avatarColor }}
              >
                {user.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()}
              </div>
            </Link>
          </div>
        </header>

        {/* Page content */}
        <main className="px-4 py-6 pb-24 sm:px-6 sm:py-8 lg:pb-8">
          <div className="mx-auto max-w-6xl animate-fade-in">{children}</div>
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t border-border bg-background/95 px-2 py-2 backdrop-blur-md lg:hidden">
        {mobileBottomItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-1 flex-col items-center gap-0.5 rounded-lg py-1.5 text-[10px] font-medium transition-colors',
                active ? 'text-primary' : 'text-muted-foreground',
              )}
            >
              <item.icon className="h-5 w-5" />
              <span className="truncate">{item.label.split(' ')[0]}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export const studentNav: NavGroup[] = [
  {
    items: [
      { label: 'Tableau de bord', href: '/eleve', icon: LayoutDashboard },
      { label: 'Mes classes', href: '/eleve/classes', icon: BookOpen },
      { label: 'Exercices', href: '/eleve/exercices', icon: FileText },
      { label: 'Questions', href: '/eleve/questions', icon: HelpCircle },
      { label: 'Instructions', href: '/eleve/instructions', icon: MessageSquare },
      { label: 'Notifications', href: '/eleve/notifications', icon: Bell },
    ],
  },
];

export const studentBottomNav: NavItem[] = [
  { label: 'Paramètres', href: '/eleve/parametres', icon: Settings },
];

export const teacherNav: NavGroup[] = [
  {
    items: [
      { label: 'Tableau de bord', href: '/prof', icon: LayoutDashboard },
      { label: 'Exercices', href: '/prof/exercices', icon: FileText },
      { label: 'Ajouter un exercice', href: '/prof/ajouter', icon: PlusCircle },
      { label: 'Classes', href: '/prof/classes', icon: BookOpen },
      { label: 'Élèves', href: '/prof/eleves', icon: Users },
      { label: 'Inscriptions', href: '/prof/inscriptions', icon: Users },
      { label: 'Questions', href: '/prof/questions', icon: HelpCircle },
      { label: 'Instructions', href: '/prof/instructions', icon: MessageSquare },
      { label: 'Modération', href: '/prof/moderation', icon: Shield },
      { label: 'Activité', href: '/prof/activite', icon: Activity },
    ],
  },
];

export const teacherBottomNav: NavItem[] = [
  { label: 'Paramètres', href: '/prof/parametres', icon: Settings },
];
