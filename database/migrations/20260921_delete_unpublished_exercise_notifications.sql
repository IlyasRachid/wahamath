-- Keep exercise-publication notifications consistent even when the status is
-- changed outside the API. This runs in the same transaction as the update.
create or replace function public.delete_unpublished_exercise_notifications()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.publication_status = 'publie'
     and new.publication_status = 'depublie' then
    delete from public.notifications
    where type = 'new_exercise'
      and (
        href = '/eleve/exercices/' || new.id::text
        -- Compatibility with notifications created before href was populated.
        or (href is null and body = old.title)
      );
  end if;

  return new;
end;
$$;

drop trigger if exists delete_unpublished_exercise_notifications on public.exercises;
create trigger delete_unpublished_exercise_notifications
after update of publication_status on public.exercises
for each row
execute procedure public.delete_unpublished_exercise_notifications();
