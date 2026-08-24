-- A chapter change alters the class metadata shown to both teachers and
-- students. Keep their mutation-driven client caches in sync.
drop trigger if exists revisions_chapters on public.chapters;
create trigger revisions_chapters
after insert or update or delete on public.chapters
for each statement execute procedure public.bump_data_revision('classes');
