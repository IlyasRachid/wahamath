'use client';

import { cn } from '@/lib/utils';
import { BadgeCheck, Flag, MessageSquare, Pin } from 'lucide-react';
import type { Comment } from '@/lib/types';
import { LockedBadge } from './badges';

function timeAgo(iso: string): string {
  const d = new Date(iso);
  const diff = Math.max(0, (Date.now() - d.getTime()) / 1000);
  if (diff < 60) return "à l'instant";
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)} h`;
  return `il y a ${Math.floor(diff / 86400)} j`;
}

function initials(name: string): string {
  return name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
}

type ItemProps = {
  comment: Comment;
  isReply?: boolean;
  onReply?: (id: string) => void;
  onReport?: (id: string) => void;
  isTeacher?: boolean;
  onModerate?: (id: string, action: 'hide' | 'restore' | 'pin' | 'resolve' | 'lock') => void;
};

export function CommentItem({ comment, isReply = false, onReply, onReport, isTeacher, onModerate }: ItemProps) {
  return (
    <div className={cn('flex gap-3', isReply && 'ml-11')}>
      <div
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white',
          comment.isTeacher ? 'bg-accent' : 'bg-primary',
        )}
      >
        {initials(comment.author)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-foreground">{comment.author}</span>
          {comment.isTeacher && (
            <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 text-[11px] font-semibold text-accent">
              <BadgeCheck className="h-3 w-3" />
              Professeur
            </span>
          )}
          {comment.isPinned && (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
              <Pin className="h-3 w-3" />
              Épinglé
            </span>
          )}
          <span className="text-xs text-muted-foreground">{timeAgo(comment.createdAt)}</span>
        </div>
        <p className="mt-1.5 text-sm leading-relaxed text-foreground/90">{comment.text}</p>
        <div className="mt-2 flex items-center gap-3">
          {!isReply && (
            <button
              onClick={() => onReply?.(comment.id)}
              className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-primary"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              Répondre
            </button>
          )}
          <button
            onClick={() => onReport?.(comment.id)}
            className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-destructive"
          >
            <Flag className="h-3.5 w-3.5" />
            Signaler
          </button>
          {isTeacher && <><button onClick={() => onModerate?.(comment.id, 'pin')} className="text-xs font-medium text-primary">Épingler</button><button onClick={() => onModerate?.(comment.id, 'resolve')} className="text-xs font-medium text-success">Résoudre</button><button onClick={() => onModerate?.(comment.id, 'lock')} className="text-xs font-medium text-muted-foreground">Verrouiller</button><button onClick={() => onModerate?.(comment.id, 'hide')} className="text-xs font-medium text-destructive">Masquer</button></>}
        </div>

        {comment.replies.length > 0 && (
          <div className="mt-4 space-y-4 border-l border-border pl-3">
            {comment.replies.map((reply) => (
              <CommentItem key={reply.id} comment={reply} isReply onReply={onReply} onReport={onReport} isTeacher={isTeacher} onModerate={onModerate} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

type ThreadProps = {
  comments: Comment[];
  locked?: boolean;
  onReply?: (id: string) => void;
  onReport?: (id: string) => void;
  isTeacher?: boolean;
  onModerate?: (id: string, action: 'hide' | 'restore' | 'pin' | 'resolve' | 'lock') => void;
};

export function CommentThread({ comments, locked, onReply, onReport, isTeacher, onModerate }: ThreadProps) {
  if (locked) {
    return (
      <div className="space-y-5">
        {comments.map((c) => (
          <CommentItem key={c.id} comment={c} onReply={onReply} onReport={onReport} isTeacher={isTeacher} onModerate={onModerate} />
        ))}
        <div className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-secondary/40 py-4 text-sm text-muted-foreground">
          <LockedBadge />
          <span>Cette discussion est fermée. Vous ne pouvez plus y répondre.</span>
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-6">
      {comments.map((c) => (
        <CommentItem key={c.id} comment={c} onReply={onReply} onReport={onReport} isTeacher={isTeacher} onModerate={onModerate} />
      ))}
    </div>
  );
}
