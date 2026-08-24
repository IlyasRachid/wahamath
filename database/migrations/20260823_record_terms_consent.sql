-- Keep an auditable record of the version of the rules a student accepted at
-- registration. Existing accounts remain valid with null values.
alter table public.profiles
  add column if not exists terms_accepted_at timestamptz,
  add column if not exists terms_version text;

alter table public.profiles
  drop constraint if exists profiles_terms_consent_complete;

alter table public.profiles
  add constraint profiles_terms_consent_complete
  check (
    (terms_accepted_at is null and terms_version is null)
    or (terms_accepted_at is not null and char_length(terms_version) between 1 and 50)
  );

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  requested_class uuid;
  submitted_class_code text;
  submitted_phone text;
  submitted_terms_version text;
begin
  submitted_class_code := upper(nullif(trim(new.raw_user_meta_data ->> 'requested_class_code'), ''));
  submitted_phone := nullif(trim(new.raw_user_meta_data ->> 'phone_number'), '');
  submitted_terms_version := nullif(trim(new.raw_user_meta_data ->> 'terms_version'), '');

  if submitted_phone is null or submitted_phone !~ '^\+?[0-9 .()\-]{8,25}$' then
    raise exception 'Un numéro de téléphone valide est obligatoire pour créer un compte élève.';
  end if;

  select id into requested_class
  from public.classes
  where code = submitted_class_code;

  if requested_class is null then
    raise exception 'Veuillez sélectionner une classe valide pour créer un compte élève.';
  end if;

  if submitted_terms_version is null then
    raise exception 'Vous devez accepter le règlement avant de créer un compte.';
  end if;

  insert into public.profiles (id, display_name, requested_class_id, phone_number, terms_accepted_at, terms_version)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), 'Élève'),
    requested_class,
    submitted_phone,
    now(),
    submitted_terms_version
  );
  return new;
end;
$$;
