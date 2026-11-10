-- ===========================================================================
-- Safari Trails — database schema
-- ---------------------------------------------------------------------------
-- This file is the single source of truth for the database shape.
-- It is executed by:
--   * `npm run db:reset` (api)  -> against the local PGlite database
--   * the Supabase SQL Editor   -> against the hosted Postgres database
--
-- The exact same DDL runs in both places, so there is no "works locally,
-- breaks in production" schema drift.
--
-- Idempotent: safe to run more than once.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
-- No extensions are required: every primary key is a plain serial integer.
-- (We deliberately avoid `gen_random_uuid()` so this exact file runs on
-- Supabase, on plain Postgres, and on the embedded PGlite database used for
-- local development.)

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
do $$
begin
  create type tour_difficulty as enum ('easy', 'moderate', 'challenging');
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create type booking_status as enum ('pending', 'confirmed', 'cancelled', 'completed');
exception
  when duplicate_object then null;
end
$$;

-- ---------------------------------------------------------------------------
-- destinations
-- ---------------------------------------------------------------------------
create table if not exists destinations (
  id             serial primary key,
  slug           text        not null unique,
  name           text        not null,
  region         text        not null,
  tagline        text        not null,
  description    text        not null,
  cover_image    text,
  image_credit   jsonb,
  highlights     jsonb       not null default '[]'::jsonb,
  best_season    text,
  average_days   integer,
  -- CMS state: a destination can be written but not yet shown to the public.
  published      boolean     not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists destinations_slug_idx on destinations (slug);

-- ---------------------------------------------------------------------------
-- tours
-- ---------------------------------------------------------------------------
create table if not exists tours (
  id              serial primary key,
  slug            text        not null unique,
  title           text        not null,
  destination_id  integer     not null references destinations (id) on delete cascade,
  summary         text        not null,
  description     text        not null,
  price_cents     integer     not null check (price_cents >= 0),
  currency        text        not null default 'USD',
  duration_days   integer     not null check (duration_days > 0),
  difficulty      tour_difficulty not null default 'moderate',
  group_size_max  integer     not null default 8 check (group_size_max > 0),
  rating          numeric(3,2) not null default 0 check (rating >= 0 and rating <= 5),
  review_count    integer     not null default 0,
  featured        boolean     not null default false,
  cover_image     text,
  image_credit    jsonb,
  highlights      jsonb       not null default '[]'::jsonb,
  included        jsonb       not null default '[]'::jsonb,
  excluded        jsonb       not null default '[]'::jsonb,
  -- CMS state: a tour can be written but not yet shown to the public.
  published       boolean     not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists tours_slug_idx           on tours (slug);
create index if not exists tours_destination_idx    on tours (destination_id);
create index if not exists tours_featured_idx       on tours (featured);
create index if not exists tours_price_idx          on tours (price_cents);
create index if not exists tours_duration_idx       on tours (duration_days);
create index if not exists tours_difficulty_idx     on tours (difficulty);

-- ---------------------------------------------------------------------------
-- Migrations
-- ---------------------------------------------------------------------------
-- The tables above are created with `if not exists`, so re-running this file
-- on an EXISTING database would NOT add a column that was added later. These
-- statements are the migration path for databases created before the CMS
-- existed, and they are no-ops on a fresh one.
--
-- They must come AFTER the create-table statements but BEFORE any index that
-- uses the new columns — Postgres resolves an index's column list the moment
-- the index is created.
alter table destinations add column if not exists published   boolean     not null default true;
alter table destinations add column if not exists updated_at timestamptz not null default now();
alter table tours        add column if not exists published   boolean     not null default true;
alter table tours        add column if not exists updated_at timestamptz not null default now();

create index if not exists destinations_published_idx on destinations (published);
create index if not exists tours_published_idx      on tours (published);

-- ---------------------------------------------------------------------------
-- tour_days  (day-by-day itinerary)
-- ---------------------------------------------------------------------------
create table if not exists tour_days (
  id             serial primary key,
  tour_id        integer not null references tours (id) on delete cascade,
  day_number     integer not null check (day_number > 0),
  title          text    not null,
  description    text    not null,
  accommodation  text,
  meals          text,
  image          text,
  unique (tour_id, day_number)
);

create index if not exists tour_days_tour_idx on tour_days (tour_id);

-- ---------------------------------------------------------------------------
-- tour_images  (gallery)
-- ---------------------------------------------------------------------------
create table if not exists tour_images (
  id            serial primary key,
  tour_id       integer not null references tours (id) on delete cascade,
  url           text    not null,
  alt           text    not null,
  image_credit  jsonb,
  position      integer not null default 0
);

create index if not exists tour_images_tour_idx on tour_images (tour_id);

-- ---------------------------------------------------------------------------
-- reviews
-- ---------------------------------------------------------------------------
create table if not exists reviews (
  id             serial primary key,
  tour_id        integer not null references tours (id) on delete cascade,
  author_name    text    not null,
  author_country text,
  rating         integer not null check (rating between 1 and 5),
  comment        text    not null,
  created_at     timestamptz not null default now()
);

create index if not exists reviews_tour_idx on reviews (tour_id);

-- ---------------------------------------------------------------------------
-- bookings
-- ---------------------------------------------------------------------------
create table if not exists bookings (
  id             serial primary key,
  reference      text        not null unique,
  tour_id        integer     not null references tours (id) on delete restrict,
  tour_slug      text        not null,
  tour_title     text        not null,
  customer_name  text        not null,
  customer_email text        not null,
  customer_phone text,
  travellers     integer     not null default 1 check (travellers > 0),
  start_date     date        not null,
  message        text,
  status         booking_status not null default 'pending',
  total_cents    integer     not null check (total_cents >= 0),
  created_at     timestamptz not null default now()
);

create index if not exists bookings_reference_idx on bookings (reference);
create index if not exists bookings_status_idx    on bookings (status);
create index if not exists bookings_created_idx   on bookings (created_at desc);

-- ---------------------------------------------------------------------------
-- inquiries  (contact form)
-- ---------------------------------------------------------------------------
create table if not exists inquiries (
  id          serial primary key,
  name        text        not null,
  email       text        not null,
  subject     text        not null,
  message     text        not null,
  created_at  timestamptz not null default now()
);

create index if not exists inquiries_created_idx on inquiries (created_at desc);

-- ---------------------------------------------------------------------------
-- admin_users
-- ---------------------------------------------------------------------------
create table if not exists admin_users (
  id            serial primary key,
  email         text        not null unique,
  password_hash text        not null,
  name          text        not null,
  role          text        not null default 'admin',
  created_at    timestamptz not null default now(),
  -- When the password last changed. A JWT issued BEFORE this moment is
  -- rejected, so changing the password really locks the old session out.
  password_changed_at timestamptz
);

create index if not exists admin_users_email_idx on admin_users (email);

-- Migration for databases created before `password_changed_at` existed.
alter table admin_users add column if not exists password_changed_at timestamptz;
