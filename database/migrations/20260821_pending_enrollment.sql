-- Preserve the class selected at registration without granting a pending
-- student access to that class. Teachers review this request before creating
-- an active class_memberships record.
alter table public.profiles
  add column requested_class_id uuid references public.classes(id) on delete set null;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  requested_class uuid;
begin
  select id into requested_class
  from public.classes
  where code = new.raw_user_meta_data ->> 'requested_class_code';

  insert into public.profiles (id, display_name, requested_class_id)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), 'Élève'),
    requested_class
  );
  return new;
end;
$$;
