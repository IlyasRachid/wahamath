-- A meeting keeps its class context, but its final audience is explicit. This
-- lets a teacher exclude individual class members or invite students from a
-- different class without exposing the meeting to anyone else.
create table public.meeting_participants (
  meeting_id uuid not null references public.meetings(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (meeting_id, profile_id)
);

create index meeting_participants_profile_idx on public.meeting_participants(profile_id, meeting_id);
alter table public.meeting_participants enable row level security;

create policy "teachers manage meeting participants"
  on public.meeting_participants for all to authenticated
  using (public.is_teacher()) with check (public.is_teacher());

create policy "students view their own meeting participation"
  on public.meeting_participants for select to authenticated
  using (profile_id = auth.uid());

-- Preserve the audience of meetings created before this feature.
insert into public.meeting_participants (meeting_id, profile_id)
select distinct meeting_classes.meeting_id, class_memberships.profile_id
from public.meeting_classes
join public.class_memberships on class_memberships.class_id = meeting_classes.class_id
join public.profiles on profiles.id = class_memberships.profile_id
where profiles.role = 'student' and profiles.status = 'active'
on conflict do nothing;

-- Explicit participation, rather than current class membership, is the access
-- boundary. Removing a student from a meeting now removes their access too.
drop policy if exists "students view meetings for their classes" on public.meetings;
create policy "students view meetings they are invited to"
  on public.meetings for select to authenticated
  using (
    exists (
      select 1 from public.meeting_participants
      where meeting_participants.meeting_id = meetings.id
        and meeting_participants.profile_id = auth.uid()
    )
  );

drop trigger if exists revisions_meeting_participants on public.meeting_participants;
create trigger revisions_meeting_participants
after insert or update or delete on public.meeting_participants
for each statement execute procedure public.bump_data_revision('meetings');
