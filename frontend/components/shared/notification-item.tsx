'use client';

import { cn } from '@/lib/utils';
import { Bell, CalendarDays, MessageCircle, FileText, ShieldAlert, Info } from 'lucide-react';
import type { Notification } from '@/lib/types';

function timeAgo(iso: string): string {
  const d = new Date(iso);
  const diff = Math.max(0, (Date.now() - d.getTime()) / 1000);
  if (diff < 60) return "à l'instant";
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)} h`;
  return `il y a ${Math.floor(diff / 86400)} j`;
}

const iconMap = {
  reply: { icon: MessageCircle, cls: 'bg-primary/10 text-primary' },
  new_exercise: { icon: FileText, cls: 'bg-accent/10 text-accent' },
  new_reply: { icon: Bell, cls: 'bg-primary/10 text-primary' },
  moderation: { icon: ShieldAlert, cls: 'bg-warning/10 text-warning' },
  instruction: { icon: MessageCircle, cls: 'bg-accent/10 text-accent' },
  meeting: { icon: CalendarDays, cls: 'bg-primary/10 text-primary' },
  system: { icon: Info, cls: 'bg-secondary text-muted-foreground' },
};

export function NotificationItem({
  notification,
  onToggleRead,
}: {
  notification: Notification;
  onToggleRead?: (id: string) => void;
}) {
  const { icon: Icon, cls } = iconMap[notification.type];
  return (
    <button
      onClick={() => onToggleRead?.(notification.id)}
      className={cn(
        'flex w-full items-start gap-3 rounded-lg border px-4 py-3 text-left transition-colors',
        notification.read
          ? 'border-border bg-card hover:bg-secondary/50'
          : 'border-primary/20 bg-primary/[0.03] hover:bg-primary/[0.06]',
      )}
    >
      <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', cls)}>
        <Icon className="h-4.5 w-4.5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium text-foreground">{notification.title}</p>
          {!notification.read && <span className="h-2 w-2 shrink-0 rounded-full bg-accent" />}
        </div>
        <p className="mt-0.5 truncate text-sm text-muted-foreground">{notification.body}</p>
        {notification.exercise && (
          <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
            <span><span className="font-medium text-foreground">Exercice :</span> {notification.exercise.title}</span>
            {notification.exercise.chapter && <span><span className="font-medium text-foreground">Chapitre :</span> {notification.exercise.chapter}</span>}
            {notification.exercise.level && <span><span className="font-medium text-foreground">Niveau :</span> {notification.exercise.level}</span>}
          </div>
        )}
        <p className="mt-1 text-xs text-muted-foreground/70">{timeAgo(notification.createdAt)}</p>
      </div>
    </button>
  );
}
