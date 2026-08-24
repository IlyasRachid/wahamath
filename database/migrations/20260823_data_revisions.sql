-- Mutation-driven cache invalidation shared by all browser sessions.
create table public.data_revisions (
  resource text primary key,
  updated_at timestamptz not null default now()
);

insert into public.data_revisions (resource) values
  ('exercises'), ('classes'), ('comments'), ('questions'), ('reports'), ('notifications'), ('enrollments')
on conflict (resource) do nothing;

alter table public.data_revisions enable row level security;

create or replace function public.bump_data_revision()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  resource_name text;
begin
  resource_name := tg_argv[0];
  insert into public.data_revisions (resource, updated_at) values (resource_name, now())
  on conflict (resource) do update set updated_at = excluded.updated_at;
  if resource_name = 'comments' then
    insert into public.data_revisions (resource, updated_at) values ('questions', now())
    on conflict (resource) do update set updated_at = excluded.updated_at;
  end if;
  return null;
end;
$$;

create trigger revisions_exercises after insert or update or delete on public.exercises for each statement execute procedure public.bump_data_revision('exercises');
create trigger revisions_memberships after insert or update or delete on public.class_memberships for each statement execute procedure public.bump_data_revision('classes');
create trigger revisions_comments after insert or update or delete on public.comments for each statement execute procedure public.bump_data_revision('comments');
create trigger revisions_reports after insert or update or delete on public.comment_reports for each statement execute procedure public.bump_data_revision('reports');
create trigger revisions_notifications after insert or update or delete on public.notifications for each statement execute procedure public.bump_data_revision('notifications');
create trigger revisions_profiles after update of status, requested_class_id on public.profiles for each statement execute procedure public.bump_data_revision('enrollments');
