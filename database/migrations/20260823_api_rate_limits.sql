-- Shared, atomic rate limits for write actions. This avoids per-instance
-- memory counters, which would not be reliable on serverless deployments.
create table public.api_rate_limits (
  subject_id uuid not null references public.profiles(id) on delete cascade,
  action text not null,
  window_started_at timestamptz not null default now(),
  request_count integer not null default 0 check (request_count >= 0),
  primary key (subject_id, action)
);

alter table public.api_rate_limits enable row level security;

create or replace function public.consume_api_rate_limit(
  p_subject_id uuid,
  p_action text,
  p_limit integer,
  p_window_seconds integer
)
returns table (allowed boolean, retry_after_seconds integer)
language plpgsql
security definer set search_path = public
as $$
declare
  current_window timestamptz;
  current_count integer;
begin
  if p_limit < 1 or p_window_seconds < 1 then
    raise exception 'Paramètres de limitation invalides.';
  end if;

  insert into public.api_rate_limits as limits (subject_id, action, window_started_at, request_count)
  values (p_subject_id, p_action, now(), 1)
  on conflict (subject_id, action) do update
  set window_started_at = case
        when limits.window_started_at <= now() - make_interval(secs => p_window_seconds) then now()
        else limits.window_started_at
      end,
      request_count = case
        when limits.window_started_at <= now() - make_interval(secs => p_window_seconds) then 1
        else limits.request_count + 1
      end
  returning limits.window_started_at, limits.request_count into current_window, current_count;

  allowed := current_count <= p_limit;
  retry_after_seconds := case
    when allowed then 0
    else greatest(1, ceil(extract(epoch from (current_window + make_interval(secs => p_window_seconds) - now())))::integer)
  end;
  return next;
end;
$$;

revoke all on function public.consume_api_rate_limit(uuid, text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_api_rate_limit(uuid, text, integer, integer) to service_role;
