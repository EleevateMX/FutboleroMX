-- FutboleroMX — Supabase migration
-- Ejecutar en: Supabase Dashboard > SQL Editor

-- Tabla de perfiles de usuario (extiende auth.users)
create table if not exists public.profiles (
  id       uuid primary key references auth.users(id) on delete cascade,
  name     text not null,
  pts      int  not null default 0,
  picks    jsonb not null default '{}',
  joined   timestamptz not null default now()
);

-- Habilitar Row Level Security
alter table public.profiles enable row level security;

-- Política: cada usuario solo lee y edita su propio perfil
create policy "usuarios leen su perfil"
  on public.profiles for select
  using (auth.uid() = id);

create policy "usuarios editan su perfil"
  on public.profiles for update
  using (auth.uid() = id);

create policy "usuarios crean su perfil"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Índice para ranking por puntos
create index if not exists profiles_pts_idx on public.profiles (pts desc);
