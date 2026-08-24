-- Do not create pending profiles that cannot be approved. A direct call to
-- Supabase Auth could otherwise omit or forge requested_class_code and leave
-- requested_class_id null.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  requested_class uuid;
  submitted_class_code text;
  submitted_phone text;
begin
  submitted_class_code := upper(nullif(trim(new.raw_user_meta_data ->> 'requested_class_code'), ''));
  submitted_phone := nullif(trim(new.raw_user_meta_data ->> 'phone_number'), '');

  if submitted_phone is null or submitted_phone !~ '^\+?[0-9 .()\-]{8,25}$' then
    raise exception 'Un numéro de téléphone valide est obligatoire pour créer un compte élève.';
  end if;

  select id into requested_class
  from public.classes
  where code = submitted_class_code;

  if requested_class is null then
    raise exception 'Veuillez sélectionner une classe valide pour créer un compte élève.';
  end if;

  insert into public.profiles (id, display_name, requested_class_id, phone_number)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), 'Élève'),
    requested_class,
    submitted_phone
  );
  return new;
end;
$$;
