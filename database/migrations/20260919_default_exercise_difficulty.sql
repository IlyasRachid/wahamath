-- Keep the database safe for any exercise inserted without an explicit difficulty.
alter table public.exercises
  alter column difficulty set default 'moyen';
