-- Presence is intentionally separate from profiles: it is operational data
-- that must never be included in ordinary profile reads.
create table public.user_presence (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  last_seen timestamptz not null default now()
);

create index user_presence_last_seen_idx on public.user_presence (last_seen desc);

alter table public.user_presence enable row level security;

-- Users can write only their own heartbeat. They cannot read presence data;
-- only the active teacher may read it.
create policy "users write their own presence" on public.user_presence
  for insert to authenticated
  with check (profile_id = auth.uid());

create policy "users update their own presence" on public.user_presence
  for update to authenticated
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

create policy "teacher reads presence" on public.user_presence
  for select to authenticated
  using (public.is_teacher());
