-- BVros MVP database for Supabase/PostgreSQL
-- Run this file once in Supabase Dashboard > SQL Editor.

create extension if not exists pgcrypto;

create type public.catalog_status as enum ('draft','review','published','suspended','withdrawn');
create type public.asset_kind as enum ('stream','preview','master','artwork','contract');

create table if not exists public.artists (
  id uuid primary key default gen_random_uuid(),
  public_id text unique not null,
  slug text unique not null,
  name text not null,
  bio text,
  country text,
  avatar_url text,
  banner_url text,
  status public.catalog_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.releases (
  id uuid primary key default gen_random_uuid(),
  public_id text unique not null,
  artist_id uuid not null references public.artists(id) on delete cascade,
  slug text not null,
  title text not null,
  release_type text not null check (release_type in ('single','ep','album','demo')),
  release_date date,
  original_upc text,
  cover_url text,
  status public.catalog_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (artist_id, slug)
);

create table if not exists public.tracks (
  id uuid primary key default gen_random_uuid(),
  public_id text unique not null,
  release_id uuid not null references public.releases(id) on delete cascade,
  slug text not null,
  title text not null,
  track_number integer not null check (track_number > 0),
  duration_seconds integer,
  isrc text,
  explicit boolean not null default false,
  status public.catalog_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (release_id, track_number),
  unique (release_id, slug)
);

-- Private table. It contains bucket names and object paths, never public URLs.
create table if not exists public.track_assets (
  id uuid primary key default gen_random_uuid(),
  track_id uuid not null references public.tracks(id) on delete cascade,
  kind public.asset_kind not null,
  bucket_name text not null,
  object_path text not null,
  mime_type text,
  sha256 text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (track_id, kind, object_path)
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid references public.artists(id) on delete cascade,
  public_id text unique not null,
  name text not null,
  description text,
  price_usd numeric(10,2),
  image_url text,
  purchase_url text,
  status public.catalog_status not null default 'draft',
  created_at timestamptz not null default now()
);

create index if not exists idx_releases_artist on public.releases(artist_id);
create index if not exists idx_tracks_release on public.tracks(release_id);
create index if not exists idx_track_assets_track_kind on public.track_assets(track_id, kind, active);

alter table public.artists enable row level security;
alter table public.releases enable row level security;
alter table public.tracks enable row level security;
alter table public.track_assets enable row level security;
alter table public.products enable row level security;

-- Public visitors can only read published metadata.
create policy "public read published artists" on public.artists
  for select to anon, authenticated using (status = 'published');
create policy "public read published releases" on public.releases
  for select to anon, authenticated using (status = 'published');
create policy "public read published tracks" on public.tracks
  for select to anon, authenticated using (status = 'published');
create policy "public read published products" on public.products
  for select to anon, authenticated using (status = 'published');

-- Deliberately no anon/authenticated policy on track_assets.
-- Only server-side code using service_role can read object paths.

-- Private audio buckets. Public is false.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('bvros-stream-private','bvros-stream-private',false,52428800,array['audio/mpeg','audio/mp4','audio/aac','audio/ogg']),
  ('bvros-masters-private','bvros-masters-private',false,1073741824,array['audio/wav','audio/x-wav','audio/flac','audio/aiff'])
on conflict (id) do update set public = excluded.public;

-- No public storage.objects policies are created for these buckets.
-- Upload through the Supabase dashboard first; artist uploads will be a later authenticated module.
