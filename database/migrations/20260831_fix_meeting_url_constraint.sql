-- The original pattern was over-escaped and therefore looked for literal
-- backslashes before the dots. Accept normal Google Meet URLs instead.
alter table public.meetings
  drop constraint if exists meetings_meet_url_check;

alter table public.meetings
  add constraint meetings_meet_url_check
  check (meet_url ~ '^https://meet\.google\.com/[a-z-]+$');
