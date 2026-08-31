-- Class meetings use a teacher-provided Google Meet link for now.  Keeping the
-- optional Calendar event id makes the later Google Calendar OAuth integration
-- non-breaking.
alter type public.notification_type add value if not exists 'meeting';

create table public.meetings (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles(id) on delete restrict,
  title text not null check (char_length(title) between 3 and 160),
  description text check (description is null or char_length(description) <= 1000),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  meet_url text not null check (meet_url ~ '^https://meet\\.google\\.com/[a-z-]+$'),
  status text not null default 'scheduled' check (status in ('scheduled', 'cancelled')),
  google_calendar_event_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create table public.meeting_classes (
  meeting_id uuid not null references public.meetings(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  primary key (meeting_id, class_id)
);

create index meetings_starts_at_idx on public.meetings(starts_at desc);
create index meeting_classes_class_idx on public.meeting_classes(class_id, meeting_id);

alter table public.meetings enable row level security;
alter table public.meeting_classes enable row level security;

create policy "teachers manage meetings"
  on public.meetings for all to authenticated
  using (public.is_teacher()) with check (public.is_teacher());

create policy "students view meetings for their classes"
  on public.meetings for select to authenticated
  using (
    exists (
      select 1
      from public.meeting_classes
      join public.class_memberships on class_memberships.class_id = meeting_classes.class_id
      where meeting_classes.meeting_id = meetings.id
        and class_memberships.profile_id = auth.uid()
    )
  );

create policy "teachers manage meeting classes"
  on public.meeting_classes for all to authenticated
  using (public.is_teacher()) with check (public.is_teacher());

create policy "students view their meeting classes"
  on public.meeting_classes for select to authenticated
  using (
    exists (
      select 1 from public.class_memberships
      where class_memberships.class_id = meeting_classes.class_id
        and class_memberships.profile_id = auth.uid()
    )
  );

insert into public.data_revisions (resource, updated_at)
values ('meetings', now())
on conflict (resource) do nothing;

drop trigger if exists revisions_meetings on public.meetings;
create trigger revisions_meetings
after insert or update or delete on public.meetings
for each statement execute procedure public.bump_data_revision('meetings');

drop trigger if exists revisions_meeting_classes on public.meeting_classes;
create trigger revisions_meeting_classes
after insert or update or delete on public.meeting_classes
for each statement execute procedure public.bump_data_revision('meetings');
