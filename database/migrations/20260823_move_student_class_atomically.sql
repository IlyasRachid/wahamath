create or replace function public.move_student_to_class(p_profile_id uuid, p_class_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not exists (select 1 from public.profiles where id = p_profile_id and role = 'student') then
    raise exception 'Élève introuvable.';
  end if;
  if not exists (select 1 from public.classes where id = p_class_id) then
    raise exception 'Classe introuvable.';
  end if;

  delete from public.class_memberships where profile_id = p_profile_id;
  insert into public.class_memberships (profile_id, class_id) values (p_profile_id, p_class_id);
end;
$$;

revoke all on function public.move_student_to_class(uuid, uuid) from public, anon, authenticated;
grant execute on function public.move_student_to_class(uuid, uuid) to service_role;
