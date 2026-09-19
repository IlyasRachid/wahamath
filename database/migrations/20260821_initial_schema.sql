-- WahaMath core schema. Run this migration in the Supabase SQL editor, or with
-- the Supabase CLI after linking this folder to the project.

create type public.app_role as enum ('student', 'teacher');
create type public.account_status as enum ('pending', 'active', 'suspended');
create type public.exercise_difficulty as enum ('facile', 'moyen', 'difficile');
create type public.exercise_publication_status as enum ('brouillon', 'publie', 'depublie');
create type public.comment_status as enum ('visible', 'hidden', 'deleted');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 50),
  role public.app_role not null default 'student',
  status public.account_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.classes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code in ('2SM', '1SM', '2PC&SVT', 'TCS')),
  name text not null,
  academic_year text not null default '2026-2027',
  is_visible boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.chapters (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  title text not null,
  slug text not null,
  sort_order smallint not null default 0,
  unique (class_id, slug)
);

create table public.class_memberships (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (profile_id, class_id)
);

create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id),
  chapter_id uuid references public.chapters(id) on delete set null,
  title text not null check (char_length(title) between 3 and 160),
  description text,
  image_path text not null unique,
  image_alt text,
  difficulty public.exercise_difficulty not null default 'moyen',
  tags text[] not null default '{}',
  publication_status public.exercise_publication_status not null default 'brouillon',
  published_at timestamptz,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  exercise_id uuid not null references public.exercises(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  parent_id uuid references public.comments(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  status public.comment_status not null default 'visible',
  is_pinned boolean not null default false,
  is_resolved boolean not null default false,
  is_locked boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.comment_reports (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid not null references public.comments(id) on delete cascade,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null check (char_length(reason) between 3 and 500),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  unique (comment_id, reporter_id)
);

create index exercises_class_publication_idx on public.exercises (class_id, publication_status, published_at desc);
create index comments_exercise_created_idx on public.comments (exercise_id, created_at);

-- Every new Auth user gets a minimal, pending student profile. Teacher accounts
-- are promoted manually in Supabase; a browser client cannot assign roles.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), 'Élève'));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create function public.is_teacher()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'teacher' and status = 'active'
  );
$$;

create function public.can_access_class(target_class_id uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select public.is_teacher() or exists (
    select 1
    from public.class_memberships membership
    join public.profiles profile on profile.id = membership.profile_id
    where membership.profile_id = auth.uid()
      and membership.class_id = target_class_id
      and profile.status = 'active'
  );
$$;

alter table public.profiles enable row level security;
alter table public.classes enable row level security;
alter table public.chapters enable row level security;
alter table public.class_memberships enable row level security;
alter table public.exercises enable row level security;
alter table public.comments enable row level security;
alter table public.comment_reports enable row level security;

create policy "users can read their own profile" on public.profiles for select using (id = auth.uid() or public.is_teacher());
create policy "teachers can manage classes" on public.classes for all using (public.is_teacher()) with check (public.is_teacher());
create policy "students can read available classes" on public.classes for select using (is_visible and (public.is_teacher() or public.can_access_class(id)));
create policy "teachers manage chapters" on public.chapters for all using (public.is_teacher()) with check (public.is_teacher());
create policy "members read chapters" on public.chapters for select using (public.can_access_class(class_id));
create policy "teachers manage memberships" on public.class_memberships for all using (public.is_teacher()) with check (public.is_teacher());
create policy "users read their memberships" on public.class_memberships for select using (profile_id = auth.uid() or public.is_teacher());
create policy "teachers manage exercises" on public.exercises for all using (public.is_teacher()) with check (public.is_teacher());
create policy "members read published exercises" on public.exercises for select using (publication_status = 'publie' and public.can_access_class(class_id));
create policy "members read visible comments" on public.comments for select using (status = 'visible' and exists (select 1 from public.exercises where exercises.id = comments.exercise_id and exercises.publication_status = 'publie' and public.can_access_class(exercises.class_id)));
create policy "active members create comments" on public.comments for insert with check (author_id = auth.uid() and exists (select 1 from public.exercises where exercises.id = comments.exercise_id and exercises.publication_status = 'publie' and public.can_access_class(exercises.class_id)));
create policy "authors or teachers update comments" on public.comments for update using (author_id = auth.uid() or public.is_teacher()) with check (author_id = auth.uid() or public.is_teacher());
create policy "teachers delete comments" on public.comments for delete using (public.is_teacher());
create policy "users create their own reports" on public.comment_reports for insert with check (reporter_id = auth.uid());
create policy "teachers manage reports" on public.comment_reports for all using (public.is_teacher()) with check (public.is_teacher());

insert into public.classes (code, name) values
  ('2SM', 'Sciences Mathématiques — 2e année'),
  ('1SM', 'Sciences Mathématiques — 1re année'),
  ('2PC&SVT', 'Physique-Chimie et SVT — 2e année'),
  ('TCS', 'Tronc Commun Scientifique');

insert into public.chapters (class_id, title, slug, sort_order)
select id, chapter.title, chapter.slug, chapter.sort_order
from public.classes
join (values
  ('2SM', 'Limites et continuité', 'limites-continuite', 1),
  ('2SM', 'Dérivation', 'derivation', 2),
  ('2SM', 'Suites numériques', 'suites', 3),
  ('2SM', 'Fonctions exponentielles', 'exponentielles', 4),
  ('2SM', 'Équations différentielles', 'equations-differentielles', 5),
  ('2SM', 'Probabilités', 'probabilites', 6),
  ('1SM', 'Étude de fonctions', 'etude-fonctions', 1),
  ('1SM', 'Suites et récurrence', 'suites-recurrence', 2),
  ('1SM', 'Trigonométrie', 'trigonometrie', 3),
  ('2PC&SVT', 'Limites et continuité', 'limites-pc2', 1),
  ('2PC&SVT', 'Géométrie dans l''espace', 'geometrie-espace', 2),
  ('TCS', 'Généralités sur les fonctions', 'generalites-fonctions', 1),
  ('TCS', 'Barycentre', 'barycentre', 2)
) as chapter(class_code, title, slug, sort_order) on chapter.class_code = classes.code;
