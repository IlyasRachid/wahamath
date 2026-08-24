-- Prevent authenticated students from bypassing the FastAPI moderation rules
-- through the Supabase REST API. The backend uses the service-role key, which
-- bypasses RLS, while this migration protects browser-originated requests.

-- A reply must always belong to the same exercise as its parent. This is a
-- data-integrity rule, so enforce it for service-role writes too.
create or replace function public.validate_comment_parent()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  parent_exercise_id uuid;
  parent_status public.comment_status;
  parent_is_locked boolean;
begin
  if new.parent_id is null then
    return new;
  end if;

  select exercise_id, status, is_locked
    into parent_exercise_id, parent_status, parent_is_locked
  from public.comments
  where id = new.parent_id;

  if parent_exercise_id is null then
    raise exception 'Le commentaire parent est introuvable.';
  end if;

  if parent_exercise_id <> new.exercise_id then
    raise exception 'Une réponse doit appartenir au même exercice que son commentaire parent.';
  end if;

  if parent_status <> 'visible' or parent_is_locked then
    raise exception 'Cette discussion est verrouillée ou indisponible.';
  end if;

  return new;
end;
$$;

drop trigger if exists comments_validate_parent on public.comments;
create trigger comments_validate_parent
  before insert or update of parent_id, exercise_id on public.comments
  for each row execute procedure public.validate_comment_parent();

-- Replace the original policies. Students may create a normal visible comment
-- in an exercise they can access, but they cannot set moderation fields and
-- cannot update comments directly. Only an active teacher can update/delete.
drop policy if exists "active members create comments" on public.comments;
drop policy if exists "authors or teachers update comments" on public.comments;
drop policy if exists "teachers manage comments" on public.comments;

create policy "active members create safe comments"
  on public.comments
  for insert
  to authenticated
  with check (
    author_id = auth.uid()
    and status = 'visible'
    and is_pinned = false
    and is_resolved = false
    and is_locked = false
    and exists (
      select 1
      from public.exercises
      where exercises.id = comments.exercise_id
        and exercises.publication_status = 'publie'
        and public.can_access_class(exercises.class_id)
    )
  );

create policy "teachers update comments"
  on public.comments
  for update
  to authenticated
  using (public.is_teacher())
  with check (public.is_teacher());

-- Keep the pre-existing teacher delete policy. The explicit update policy
-- above is deliberately separate so students never acquire edit permission.
