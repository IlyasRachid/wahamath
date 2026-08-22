-- Correct the escaped regular expression from the original contact migration.
-- The previous pattern incorrectly required a literal backslash before the
-- phone number, which made normal values such as +212 6 12 34 56 78 fail.
alter table public.profiles
  drop constraint if exists profiles_phone_number_format;

alter table public.profiles
  add constraint profiles_phone_number_format
  check (phone_number is null or phone_number ~ '^\+?[0-9 .()\-]{8,25}$');
