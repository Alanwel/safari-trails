-- ===========================================================================
-- Safari Trails — Row Level Security + grants
-- ---------------------------------------------------------------------------
-- Apply this AFTER `schema.sql`, in the Supabase SQL Editor.
--
-- Why this file is separate:
--   * PGlite (local dev) connects as the table owner, and Postgres owners
--     bypass RLS by default — so the policies would be inert locally.
--   * On Supabase, the browser talks to Postgres as `anon` / `authenticated`,
--     and RLS is the ONLY thing standing between the public internet and your
--     data. So the policies must be applied there, and only there.
--
-- The API server uses the service_role key (which bypasses RLS) after it has
-- done its own permission checks — that is where "who is an admin" lives.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- Roles (Supabase creates these already; the block keeps it re-runnable)
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin noinherit;
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- Enable RLS on every table
-- ---------------------------------------------------------------------------
alter table destinations  enable row level security;
alter table tours         enable row level security;
alter table tour_days     enable row level security;
alter table tour_images   enable row level security;
alter table reviews       enable row level security;
alter table bookings      enable row level security;
alter table inquiries     enable row level security;
alter table admin_users   enable row level security;

-- ---------------------------------------------------------------------------
-- Drop + recreate policies so this script can be re-run safely
-- ---------------------------------------------------------------------------
drop policy if exists "public read destinations"      on destinations;
drop policy if exists "public read tours"             on tours;
drop policy if exists "public read tour_days"         on tour_days;
drop policy if exists "public read tour_images"       on tour_images;
drop policy if exists "public read reviews"           on reviews;
drop policy if exists "no public read bookings"       on bookings;
drop policy if exists "no public read inquiries"      on inquiries;
drop policy if exists "no public read admin_users"    on admin_users;

-- ---------------------------------------------------------------------------
-- Public catalogue is readable by everyone (including `anon`)
-- ---------------------------------------------------------------------------
create policy "public read destinations"
  on destinations for select
  to anon, authenticated
  using (true);

create policy "public read tours"
  on tours for select
  to anon, authenticated
  using (true);

create policy "public read tour_days"
  on tour_days for select
  to anon, authenticated
  using (true);

create policy "public read tour_images"
  on tour_images for select
  to anon, authenticated
  using (true);

create policy "public read reviews"
  on reviews for select
  to anon, authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- Bookings + inquiries + admin_users: NO public access at all.
-- Only the API (service_role) can read or write these.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
grant usage on schema public to anon, authenticated;
grant select on destinations, tours, tour_days, tour_images, reviews to anon, authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;

-- service_role gets full access (Supabase grants this by default, but be explicit)
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;

-- ---------------------------------------------------------------------------
-- Storage bucket for tour photography (public read, admin-only write)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('tour-images', 'tour-images', true)
on conflict (id) do update set public = true;

drop policy if exists "public read tour-images bucket" on storage.objects;
create policy "public read tour-images bucket"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'tour-images');
