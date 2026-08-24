-- The class-code rename is a direct SQL update, so explicitly invalidate the
-- shared browser cache for class metadata. Keep later class edits in sync too.
drop trigger if exists revisions_classes on public.classes;
create trigger revisions_classes
after insert or update or delete on public.classes
for each statement execute procedure public.bump_data_revision('classes');

insert into public.data_revisions (resource, updated_at)
values ('classes', now())
on conflict (resource) do update
set updated_at = excluded.updated_at;
