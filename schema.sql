create extension if not exists "uuid-ossp";


create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text,
  role text default 'user',
  student_id text,
  phone text,
  department text,
  hostel text,
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_self" on public.profiles;
create policy "profiles_select_self" on public.profiles for select
  using (auth.uid() = id);

create or replace function public.is_admin(uid uuid)
returns boolean
language sql
stable
security definer
as $$
  select exists(select 1 from public.profiles p where p.id = uid and p.role = 'admin');
$$;

grant execute on function public.is_admin(uuid) to authenticated;

drop policy if exists "profiles_select_admin_all" on public.profiles;
create policy "profiles_select_admin_all" on public.profiles for select
  using (public.is_admin(auth.uid()));

drop policy if exists "profiles_insert_self" on public.profiles;
create policy "profiles_insert_self" on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self" on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create table if not exists public.complaints (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade,
  title text not null,
  description text not null,
  category text not null,
  image_url text,
  status text default 'Pending',
  admin_remark text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.complaints enable row level security;

drop policy if exists "complaints_select_own" on public.complaints;
create policy "complaints_select_own" on public.complaints for select
  using (user_id = auth.uid());

drop policy if exists "complaints_select_admin_all" on public.complaints;
create policy "complaints_select_admin_all" on public.complaints for select
  using (public.is_admin(auth.uid()));

drop policy if exists "complaints_insert_own" on public.complaints;
create policy "complaints_insert_own" on public.complaints for insert
  with check (user_id = auth.uid());

drop policy if exists "complaints_update_admin_all" on public.complaints;
create policy "complaints_update_admin_all" on public.complaints for update
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

drop policy if exists "complaints_update_own_before_resolved" on public.complaints;
create policy "complaints_update_own_before_resolved" on public.complaints for update
  using (user_id = auth.uid() and status <> 'Resolved')
  with check (user_id = auth.uid() and status <> 'Resolved');

drop policy if exists "complaints_delete_own_before_resolved" on public.complaints;
create policy "complaints_delete_own_before_resolved" on public.complaints for delete
  using (user_id = auth.uid() and status <> 'Resolved');

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute procedure public.set_updated_at();

drop trigger if exists complaints_set_updated_at on public.complaints;
create trigger complaints_set_updated_at
before update on public.complaints
for each row execute procedure public.set_updated_at();

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'complaints_status_check'
  ) then
    alter table public.complaints
      add constraint complaints_status_check
      check (status in ('Pending','In Progress','Resolved'));
  end if;
end $$;

do $$
begin
  if exists (
    select 1 from pg_constraint where conname = 'complaints_category_check'
  ) then
    alter table public.complaints
      drop constraint complaints_category_check;
  end if;
  alter table public.complaints
    add constraint complaints_category_check
    check (category in ('Academic','Administrative','Facilities','Faculty','Hostel','Library','Transportation','Electricity','Cleaning','Ragging','Other'));
end $$;

create index if not exists complaints_user_created_idx
  on public.complaints (user_id, created_at desc);

create index if not exists complaints_status_idx
  on public.complaints (status);

create index if not exists complaints_category_idx
  on public.complaints (category);

create or replace function public.complaint_stats()
returns table(total bigint, resolved bigint, pending bigint)
language sql
stable
security definer
as $$
  select 
    (select count(*) from public.complaints) as total,
    (select count(*) from public.complaints where status = 'Resolved') as resolved,
    (select count(*) from public.complaints where status = 'Pending') as pending;
$$;

grant execute on function public.complaint_stats() to anon, authenticated;

create table if not exists public.departments (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  created_at timestamptz default now()
);

alter table public.departments enable row level security;

drop policy if exists "departments_select_all" on public.departments;
create policy "departments_select_all" on public.departments for select
  using (true);

drop policy if exists "departments_insert_admin" on public.departments;
create policy "departments_insert_admin" on public.departments for insert
  with check (public.is_admin(auth.uid()));

drop policy if exists "departments_delete_admin" on public.departments;
create policy "departments_delete_admin" on public.departments for delete
  using (public.is_admin(auth.uid()));

-- Insert default departments
insert into public.departments (name) values
  ('MCA'),
  ('MMS'),
  ('BMS'),
  ('Pharma')
on conflict (name) do nothing;
