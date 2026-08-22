-- Student contact information is collected during registration. It remains
-- visible only through teacher-only server endpoints, never in public lists.
alter table public.profiles
  add column phone_number text;

alter table public.profiles
  add constraint profiles_phone_number_format
  check (phone_number is null or phone_number ~ '^\+?[0-9 .()\-]{8,25}$');

-- Keep the existing requested-class logic and add the phone supplied in the
-- Auth signup metadata for every new account.
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

  insert into public.profiles (id, display_name, requested_class_id, phone_number)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), 'Élève'),
    requested_class,
    nullif(new.raw_user_meta_data ->> 'phone_number', '')
  );
  return new;
end;
$$;
