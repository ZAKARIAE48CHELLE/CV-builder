-- =============================================================================
-- Folio for Friends — Multi-User Supabase Schema
-- Idempotent SQL script: safe to re-run in Supabase SQL Editor.
-- =============================================================================

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- 1. Tables
-- -----------------------------------------------------------------------------

-- Profiles: one per auth user
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  status text not null default 'pending' check (status in ('pending','approved','blocked')),
  role text not null default 'member' check (role in ('member','admin')),
  ai_shared_key_allowed boolean not null default false,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz
);

-- Invites: emails pre-approved by the admin
create table if not exists public.invites (
  email text primary key,
  invited_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  used_at timestamptz
);

-- Resumes: existing Resume objects stored as jsonb
create table if not exists public.resumes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  data jsonb not null,               -- full Resume object incl. design + sectionDesigns
  schema_version int not null default 2,
  version int not null default 1,    -- optimistic concurrency
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint resumes_data_size_check check (octet_length(data::text) <= 1048576)
);

-- Cover Letters: existing CoverLetter objects stored as jsonb
create table if not exists public.cover_letters (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  resume_id uuid references public.resumes(id) on delete set null,
  title text not null,
  data jsonb not null,
  schema_version int not null default 2,
  version int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cover_letters_data_size_check check (octet_length(data::text) <= 1048576)
);

-- Jobs: existing JobApplication objects stored as jsonb
create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  data jsonb not null,               -- company, role, link, status, notes, linked ids
  status text not null,
  position int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint jobs_data_size_check check (octet_length(data::text) <= 1048576)
);

-- Style Presets: custom reusable section design presets
create table if not exists public.style_presets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  section_type text,
  data jsonb not null,
  created_at timestamptz not null default now(),
  constraint style_presets_data_size_check check (octet_length(data::text) <= 262144)
);

-- AI usage counter for shared-key quotas
create table if not exists public.ai_usage (
  owner_id uuid references public.profiles(id) on delete cascade,
  day date not null default current_date,
  calls int not null default 0,
  primary key (owner_id, day)
);

-- -----------------------------------------------------------------------------
-- 2. Indexes
-- -----------------------------------------------------------------------------
create index if not exists idx_resumes_owner_updated on public.resumes(owner_id, updated_at desc);
create index if not exists idx_cover_letters_owner_updated on public.cover_letters(owner_id, updated_at desc);
create index if not exists idx_jobs_owner_updated on public.jobs(owner_id, updated_at desc);
create index if not exists idx_style_presets_owner on public.style_presets(owner_id, created_at desc);
create index if not exists idx_ai_usage_owner_day on public.ai_usage(owner_id, day desc);

-- -----------------------------------------------------------------------------
-- 3. Helper Functions (Security Definer with fixed search_path)
-- -----------------------------------------------------------------------------

create or replace function public.is_approved()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and status = 'approved'
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and status = 'approved' and role = 'admin'
  );
$$;

-- Updated_at trigger function
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_resumes_updated_at on public.resumes;
create trigger trg_resumes_updated_at
  before update on public.resumes
  for each row execute function public.set_updated_at();

drop trigger if exists trg_cover_letters_updated_at on public.cover_letters;
create trigger trg_cover_letters_updated_at
  before update on public.cover_letters
  for each row execute function public.set_updated_at();

drop trigger if exists trg_jobs_updated_at on public.jobs;
create trigger trg_jobs_updated_at
  before update on public.jobs
  for each row execute function public.set_updated_at();

-- Prevent non-admins from escalating their own status, role, or ai_shared_key_allowed
create or replace function public.guard_profile_updates()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    if new.status is distinct from old.status then
      raise exception 'Only admins can change account status';
    end if;
    if new.role is distinct from old.role then
      raise exception 'Only admins can change account role';
    end if;
    if new.ai_shared_key_allowed is distinct from old.ai_shared_key_allowed then
      raise exception 'Only admins can change AI shared key access';
    end if;
  else
    -- Prevent removing the last admin
    if old.role = 'admin' and new.role <> 'admin' then
      if (select count(*) from public.profiles where role = 'admin' and status = 'approved' and id <> old.id) = 0 then
        raise exception 'Cannot remove the last approved admin';
      end if;
    end if;
    if old.role = 'admin' and new.status <> 'approved' then
      if (select count(*) from public.profiles where role = 'admin' and status = 'approved' and id <> old.id) = 0 then
        raise exception 'Cannot block or unapprove the last admin';
      end if;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_guard_profile_updates on public.profiles;
create trigger trg_guard_profile_updates
  before update on public.profiles
  for each row execute function public.guard_profile_updates();

-- Handle new user registration (Owner bootstrap + Invite auto-approval)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_first_user boolean;
  v_is_invited boolean;
  v_display_name text;
begin
  select not exists (select 1 from public.profiles) into v_is_first_user;
  select exists (
    select 1 from public.invites
    where lower(email) = lower(new.email)
  ) into v_is_invited;

  v_display_name := coalesce(
    new.raw_user_meta_data->>'display_name',
    new.raw_user_meta_data->>'full_name',
    split_part(new.email, '@', 1)
  );

  insert into public.profiles (
    id,
    email,
    display_name,
    status,
    role,
    ai_shared_key_allowed,
    created_at,
    last_seen_at
  ) values (
    new.id,
    lower(new.email),
    v_display_name,
    case when v_is_first_user or v_is_invited then 'approved' else 'pending' end,
    case when v_is_first_user then 'admin' else 'member' end,
    case when v_is_first_user then true else false end,
    now(),
    now()
  )
  on conflict (id) do nothing;

  if v_is_invited then
    update public.invites
    set used_at = now()
    where lower(email) = lower(new.email);
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Admin member stats RPC: returns counts only, never document contents
create or replace function public.admin_member_stats()
returns table (
  id uuid,
  email text,
  display_name text,
  status text,
  role text,
  ai_shared_key_allowed boolean,
  created_at timestamptz,
  last_seen_at timestamptz,
  resume_count bigint,
  letter_count bigint,
  job_count bigint,
  ai_calls_month bigint
)
language plpgsql
security definer
stable
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Forbidden: admin access required';
  end if;

  return query
  select
    p.id,
    p.email,
    p.display_name,
    p.status,
    p.role,
    p.ai_shared_key_allowed,
    p.created_at,
    p.last_seen_at,
    (select count(*) from public.resumes r where r.owner_id = p.id) as resume_count,
    (select count(*) from public.cover_letters c where c.owner_id = p.id) as letter_count,
    (select count(*) from public.jobs j where j.owner_id = p.id) as job_count,
    coalesce((
      select sum(u.calls)::bigint
      from public.ai_usage u
      where u.owner_id = p.id
        and u.day >= date_trunc('month', current_date)::date
    ), 0) as ai_calls_month
  from public.profiles p
  order by
    case p.status when 'pending' then 0 when 'approved' then 1 else 2 end,
    p.created_at desc;
end;
$$;

-- Increment AI usage RPC for today
create or replace function public.increment_ai_usage()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_calls int;
begin
  if v_uid is null or not public.is_approved() then
    raise exception 'Unauthorized';
  end if;

  insert into public.ai_usage (owner_id, day, calls)
  values (v_uid, current_date, 1)
  on conflict (owner_id, day)
  do update set calls = public.ai_usage.calls + 1
  returning calls into v_calls;

  return v_calls;
end;
$$;

-- Self-service account deletion RPC
create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = public, storage, auth
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  -- Prevent deleting the last admin if other users exist
  if exists (select 1 from public.profiles where id = v_uid and role = 'admin') then
    if (select count(*) from public.profiles where role = 'admin' and id <> v_uid) = 0
       and (select count(*) from public.profiles where id <> v_uid) > 0 then
      raise exception 'Cannot delete the sole admin account while other members exist. Promote another admin first.';
    end if;
  end if;

  -- Delete storage objects in user's folder
  delete from storage.objects
  where bucket_id = 'user-files'
    and (storage.foldername(name))[1] = v_uid::text;

  -- Delete auth user (cascades to profiles -> resumes, cover_letters, jobs, style_presets, ai_usage)
  delete from auth.users where id = v_uid;
end;
$$;

-- -----------------------------------------------------------------------------
-- 4. Row-Level Security Policies
-- -----------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.invites enable row level security;
alter table public.resumes enable row level security;
alter table public.cover_letters enable row level security;
alter table public.jobs enable row level security;
alter table public.style_presets enable row level security;
alter table public.ai_usage enable row level security;

-- Profiles policies
drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin"
  on public.profiles for select
  using (id = auth.uid() or public.is_admin());

drop policy if exists "profiles_update_own_or_admin" on public.profiles;
create policy "profiles_update_own_or_admin"
  on public.profiles for update
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

-- Invites policies (admin only)
drop policy if exists "invites_admin_select" on public.invites;
create policy "invites_admin_select"
  on public.invites for select
  using (public.is_admin());

drop policy if exists "invites_admin_insert" on public.invites;
create policy "invites_admin_insert"
  on public.invites for insert
  with check (public.is_admin());

drop policy if exists "invites_admin_delete" on public.invites;
create policy "invites_admin_delete"
  on public.invites for delete
  using (public.is_admin());

-- Resumes policies (Strictly owner_id = auth.uid() and is_approved() — NO admin bypass)
drop policy if exists "resumes_select_own" on public.resumes;
create policy "resumes_select_own"
  on public.resumes for select
  using (owner_id = auth.uid() and public.is_approved());

drop policy if exists "resumes_insert_own" on public.resumes;
create policy "resumes_insert_own"
  on public.resumes for insert
  with check (owner_id = auth.uid() and public.is_approved());

drop policy if exists "resumes_update_own" on public.resumes;
create policy "resumes_update_own"
  on public.resumes for update
  using (owner_id = auth.uid() and public.is_approved())
  with check (owner_id = auth.uid() and public.is_approved());

drop policy if exists "resumes_delete_own" on public.resumes;
create policy "resumes_delete_own"
  on public.resumes for delete
  using (owner_id = auth.uid() and public.is_approved());

-- Cover Letters policies (Strictly owner_id = auth.uid() and is_approved() — NO admin bypass)
drop policy if exists "cover_letters_select_own" on public.cover_letters;
create policy "cover_letters_select_own"
  on public.cover_letters for select
  using (owner_id = auth.uid() and public.is_approved());

drop policy if exists "cover_letters_insert_own" on public.cover_letters;
create policy "cover_letters_insert_own"
  on public.cover_letters for insert
  with check (owner_id = auth.uid() and public.is_approved());

drop policy if exists "cover_letters_update_own" on public.cover_letters;
create policy "cover_letters_update_own"
  on public.cover_letters for update
  using (owner_id = auth.uid() and public.is_approved())
  with check (owner_id = auth.uid() and public.is_approved());

drop policy if exists "cover_letters_delete_own" on public.cover_letters;
create policy "cover_letters_delete_own"
  on public.cover_letters for delete
  using (owner_id = auth.uid() and public.is_approved());

-- Jobs policies (Strictly owner_id = auth.uid() and is_approved() — NO admin bypass)
drop policy if exists "jobs_select_own" on public.jobs;
create policy "jobs_select_own"
  on public.jobs for select
  using (owner_id = auth.uid() and public.is_approved());

drop policy if exists "jobs_insert_own" on public.jobs;
create policy "jobs_insert_own"
  on public.jobs for insert
  with check (owner_id = auth.uid() and public.is_approved());

drop policy if exists "jobs_update_own" on public.jobs;
create policy "jobs_update_own"
  on public.jobs for update
  using (owner_id = auth.uid() and public.is_approved())
  with check (owner_id = auth.uid() and public.is_approved());

drop policy if exists "jobs_delete_own" on public.jobs;
create policy "jobs_delete_own"
  on public.jobs for delete
  using (owner_id = auth.uid() and public.is_approved());

-- Style Presets policies (Strictly owner_id = auth.uid() and is_approved() — NO admin bypass)
drop policy if exists "style_presets_select_own" on public.style_presets;
create policy "style_presets_select_own"
  on public.style_presets for select
  using (owner_id = auth.uid() and public.is_approved());

drop policy if exists "style_presets_insert_own" on public.style_presets;
create policy "style_presets_insert_own"
  on public.style_presets for insert
  with check (owner_id = auth.uid() and public.is_approved());

drop policy if exists "style_presets_update_own" on public.style_presets;
create policy "style_presets_update_own"
  on public.style_presets for update
  using (owner_id = auth.uid() and public.is_approved())
  with check (owner_id = auth.uid() and public.is_approved());

drop policy if exists "style_presets_delete_own" on public.style_presets;
create policy "style_presets_delete_own"
  on public.style_presets for delete
  using (owner_id = auth.uid() and public.is_approved());

-- AI Usage policies (read own only; writes go through increment_ai_usage())
drop policy if exists "ai_usage_select_own" on public.ai_usage;
create policy "ai_usage_select_own"
  on public.ai_usage for select
  using (owner_id = auth.uid());

-- -----------------------------------------------------------------------------
-- 5. Storage Bucket (`user-files`, private)
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'user-files',
  'user-files',
  false,
  10485760, -- 10 MB max
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'text/plain'
  ]
)
on conflict (id) do update
set
  public = false,
  file_size_limit = 10485760;

drop policy if exists "user_files_select_own" on storage.objects;
create policy "user_files_select_own"
  on storage.objects for select
  using (
    bucket_id = 'user-files'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.is_approved()
  );

drop policy if exists "user_files_insert_own" on storage.objects;
create policy "user_files_insert_own"
  on storage.objects for insert
  with check (
    bucket_id = 'user-files'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.is_approved()
  );

drop policy if exists "user_files_update_own" on storage.objects;
create policy "user_files_update_own"
  on storage.objects for update
  using (
    bucket_id = 'user-files'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.is_approved()
  )
  with check (
    bucket_id = 'user-files'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.is_approved()
  );

drop policy if exists "user_files_delete_own" on storage.objects;
create policy "user_files_delete_own"
  on storage.objects for delete
  using (
    bucket_id = 'user-files'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.is_approved()
  );

