create extension if not exists "pgcrypto";

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  uuid uuid unique,
  nombre text not null default '',
  apellido text not null default '',
  email text not null unique,
  dni text not null default '',
  telefono text not null default '',
  nivel text not null default 'principiante',
  objetivo text not null default '',
  birthdate text not null default '',
  address text not null default '',
  emergency_contact text not null default '',
  emergency_phone text not null default '',
  medical_insurance text not null default '',
  blood_type text not null default '',
  allergies text not null default '',
  medical_conditions text not null default '',
  medications text not null default '',
  recent_injuries text not null default '',
  doctor_clearance text not null default '',
  medical_notes text not null default '',
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.users add column if not exists id uuid default gen_random_uuid();
alter table public.users add column if not exists uuid uuid;
alter table public.users add column if not exists nombre text not null default '';
alter table public.users add column if not exists apellido text not null default '';
alter table public.users add column if not exists email text not null default '';
alter table public.users add column if not exists dni text not null default '';
alter table public.users add column if not exists telefono text not null default '';
alter table public.users add column if not exists nivel text not null default 'principiante';
alter table public.users add column if not exists objetivo text not null default '';
alter table public.users add column if not exists birthdate text not null default '';
alter table public.users add column if not exists address text not null default '';
alter table public.users add column if not exists emergency_contact text not null default '';
alter table public.users add column if not exists emergency_phone text not null default '';
alter table public.users add column if not exists medical_insurance text not null default '';
alter table public.users add column if not exists blood_type text not null default '';
alter table public.users add column if not exists allergies text not null default '';
alter table public.users add column if not exists medical_conditions text not null default '';
alter table public.users add column if not exists medications text not null default '';
alter table public.users add column if not exists recent_injuries text not null default '';
alter table public.users add column if not exists doctor_clearance text not null default '';
alter table public.users add column if not exists medical_notes text not null default '';
alter table public.users add column if not exists avatar_url text;
alter table public.users add column if not exists created_at timestamptz not null default now();
alter table public.users add column if not exists updated_at timestamptz not null default now();

update public.users
set uuid = id
where uuid is null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'users_uuid_key'
  ) then
    alter table public.users add constraint users_uuid_key unique (uuid);
  end if;
end $$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists users_set_updated_at on public.users;
create trigger users_set_updated_at
before update on public.users
for each row
execute function public.set_updated_at();

alter table public.users enable row level security;

drop policy if exists "Users can read own profile" on public.users;
create policy "Users can read own profile"
on public.users
for select
using (auth.uid() = uuid or auth.uid() = id);

drop policy if exists "Users can update own profile" on public.users;
create policy "Users can update own profile"
on public.users
for update
using (auth.uid() = uuid or auth.uid() = id)
with check (auth.uid() = uuid or auth.uid() = id);

create table if not exists public.kv_store_5dacf80d (
  key text primary key,
  value jsonb not null
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

alter table public.kv_store_5dacf80d enable row level security;

drop policy if exists "Service role manages kv store" on public.kv_store_5dacf80d;
create policy "Service role manages kv store"
on public.kv_store_5dacf80d
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

drop policy if exists "Public avatar access" on storage.objects;
create policy "Public avatar access"
on storage.objects
for select
to public
using (bucket_id = 'avatars');

drop policy if exists "Users can upload their avatar" on storage.objects;
create policy "Users can upload their avatar"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.jwt()->>'sub')
);

drop policy if exists "Users can update their avatar" on storage.objects;
create policy "Users can update their avatar"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.jwt()->>'sub')
)
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.jwt()->>'sub')
);

drop policy if exists "Users can delete their avatar" on storage.objects;
create policy "Users can delete their avatar"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.jwt()->>'sub')
);
