create table public.private_instruction_threads (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  exercise_id uuid references public.exercises(id) on delete set null,
  status text not null default 'open' check (status in ('open', 'closed')),
  created_at timestamptz not null default now(),
  closed_at timestamptz,
  closed_by uuid references public.profiles(id),
  check ((status = 'open' and closed_at is null and closed_by is null) or (status = 'closed' and closed_at is not null and closed_by is not null))
);

create table public.private_instruction_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.private_instruction_threads(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index private_instruction_threads_student_idx on public.private_instruction_threads(student_id, created_at desc);
create index private_instruction_messages_thread_idx on public.private_instruction_messages(thread_id, created_at);
alter table public.private_instruction_threads enable row level security;
alter table public.private_instruction_messages enable row level security;
