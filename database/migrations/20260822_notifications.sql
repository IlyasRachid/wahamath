create type public.notification_type as enum ('reply', 'new_exercise');

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  type public.notification_type not null,
  title text not null check (char_length(title) between 1 and 160),
  body text not null check (char_length(body) between 1 and 500),
  href text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_recipient_created_idx on public.notifications (recipient_id, created_at desc);
alter table public.notifications enable row level security;
create policy "users read own notifications" on public.notifications for select using (recipient_id = auth.uid());
create policy "users update own notifications" on public.notifications for update using (recipient_id = auth.uid()) with check (recipient_id = auth.uid());
