# Safari Trails

A travel-tour booking platform for a Ugandan tour operator — public website plus
an operator dashboard, with a real database, real authentication and a real
booking flow.

Built as an npm-workspaces monorepo:

| Layer | Stack |
|---|---|
| **API** | Node 22 · TypeScript · Express · Drizzle ORM · Zod · JWT |
| **Database** | Postgres — [Supabase](https://supabase.com) in production, embedded **PGlite** in development |
| **Web** | React 19 · TypeScript · Vite 8 · Tailwind CSS 4 · React Router 7 |
| **Hosting** | Vercel (web + API), Supabase (Postgres + Storage) |
| **Source** | GitHub |

---

## Why this project is built the way it is

### 1. The database is real, from day one, for free

`PGlite` is an official build of PostgreSQL compiled to WebAssembly. It runs
inside Node with no Docker, no server, no install step — but it is *actual
Postgres*: real `numeric` types, real `jsonb`, real `RETURNING`, real
constraints, real transactions.

That means the SQL you write on your laptop is the SQL that runs in
production. There is no "sqlite dev / postgres prod" divergence to debug at
2am. The only thing that changes between local and production is the
connection string:

```
DATABASE_URL empty  ->  PGlite, a local folder
DATABASE_URL set    ->  Supabase Postgres
```

The schema itself lives in **one file** — [`supabase/schema.sql`](supabase/schema.sql).
You paste it into the Supabase SQL Editor to provision production, and the
migration runner applies the very same file locally. There is no second copy
to drift.

### 2. One schema, three jobs

`supabase/schema.sql` is executed by:

- `npm run db:reset` — against the local PGlite database
- `npm run db:migrate` — against a configured `DATABASE_URL`
- the Supabase SQL Editor — against production

Row Level Security lives separately in [`supabase/rls.sql`](supabase/rls.sql),
because policies are inert locally (you connect as the table owner, and owners
bypass RLS) but are the *only* thing protecting your data in production, where
the browser talks to Postgres as `anon`.

### 3. The API never trusts the browser

Every price is recalculated server-side from the tour record. A client that
posts `totalCents: 1` gets the real price. Traveller counts are checked
against the tour's own group limit. Booking references are generated server-side.

### 4. One response shape, everywhere

```jsonc
// success
{ "data": { ... }, "error": null, "meta": { "page": 1, "total": 10 } }

// failure
{ "data": null, "error": { "code": "VALIDATION_ERROR", "message": "…", "details": [...] }, "meta": {} }
```

The frontend has exactly one place that unwraps this (`web/src/api/client.ts`)
and exactly one hook that fetches (`web/src/api/hooks.ts`).

---

## Quickstart

```bash
git clone <your-repo-url> safari-trails
cd safari-trails

npm install                 # installs api + web workspaces
cp api/.env.example api/.env

npm run db:reset            # create the local database and load the catalogue
npm run images              # fetch the photography (optional, needs internet)

npm run dev                 # API on :4000, web on :5173
```

Open <http://localhost:5173>.

Operator dashboard: <http://localhost:5173/admin> —
`admin@safaritrails.com` / `SafariTrails2026!` (change these in `api/.env`).

Prefer one command at a time? `./scripts/dev.sh start | stop | restart | status | logs api | reset`.

---

## Project structure

```
safari-trails/
├── api/                      Express + TypeScript REST API
│   ├── src/
│   │   ├── app.ts            Express app factory (CORS, helmet, rate limits)
│   │   ├── index.ts          Server entry point
│   │   ├── env.ts            Environment loading + validation (Zod)
│   │   ├── db/
│   │   │   ├── schema.ts     Drizzle schema — the typed view of the tables
│   │   │   ├── client.ts     Dual driver: PGlite locally, Postgres remotely
│   │   │   ├── sql.ts        SQL-aware statement splitter
│   │   │   ├── migrate.ts    Apply supabase/schema.sql
│   │   │   └── reset.ts      Drop + recreate + reseed
│   │   ├── middleware/       Auth (JWT), error envelope
│   │   ├── routes/           health, destinations, tours, bookings,
│   │   │                     inquiries, auth, admin
│   │   ├── seed/             Catalogue content + seeder
│   │   └── lib/              Helpers
│   └── tests/                38 tests (vitest + supertest, real Postgres)
│
├── web/                      React + TypeScript client
│   └── src/
│       ├── api/              Typed client, hooks, shared types
│       ├── components/       Navbar, Footer, cards, modal, states, icons
│       ├── data/site.ts      All brand copy in one file
│       ├── pages/            Home, Tours, TourDetail, Destinations,
│       │                     DestinationDetail, Contact, Admin, NotFound
│       └── styles.css        Tailwind theme + component classes
│
├── supabase/
│   ├── schema.sql            Single source of truth for the database
│   └── rls.sql               Row Level Security + grants + storage bucket
│
├── scripts/
│   ├── dev.sh                start / stop / restart / logs / reset
│   ├── fetch-images.mjs      Pull photography from Wikimedia Commons
│   ├── upload-images.mjs     Push images to Supabase Storage
│   └── ui-check.py           Playwright end-to-end check + screenshots
│
├── assets/images.json        Image manifest with photographer attribution
└── docs/
    ├── SETUP.md              A–Z local setup
    └── DEPLOY.md             GitHub + Vercel + Supabase production
```

---

## API reference

Base URL: `/api`

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `GET` | `/api/health` | — | Liveness + which database is in use |
| `GET` | `/api/destinations` | — | All destinations with tour counts |
| `GET` | `/api/destinations/:slug` | — | One destination + its tours |
| `GET` | `/api/tours` | — | Filterable catalogue |
| `GET` | `/api/tours/meta` | — | Filter facets (prices, durations, counts) |
| `GET` | `/api/tours/:slug` | — | Full tour detail |
| `POST` | `/api/bookings` | — | Create a booking request |
| `POST` | `/api/inquiries` | — | Contact form |
| `POST` | `/api/auth/login` | — | Exchange credentials for a JWT |
| `GET` | `/api/admin/bookings` | Bearer | All bookings, filterable |
| `PATCH` | `/api/admin/bookings/:reference` | Bearer | Change booking status |
| `GET` | `/api/admin/stats` | Bearer | Dashboard counters |
| `GET` | `/api/admin/inquiries` | Bearer | Contact messages |

**Query parameters for `GET /api/tours`**

| Parameter | Values | Notes |
|---|---|---|
| `q` | text | Searches title, summary, description, destination |
| `destination` | slug or comma-separated slugs | |
| `difficulty` | `easy` `moderate` `challenging` (comma-separated) | |
| `maxPrice` | cents | e.g. `50000` = under $500 |
| `minDays` / `maxDays` | integer | |
| `featured` | `true` | |
| `sort` | `recommended` `rating` `price_asc` `price_desc` `duration_asc` `duration_desc` | |
| `page` / `pageSize` | integer | `pageSize` max 60 |

Bad input returns **400** with field-level detail; unknown records return
**404**; missing/invalid admin tokens return **401**.

---

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Run API and web together |
| `npm run dev:api` / `npm run dev:web` | Run one of them |
| `npm run build` | Type-check and build both packages for production |
| `npm run typecheck` | Type-check both packages |
| `npm test` | Run the API test suite (38 tests) |
| `npm run db:reset` | Drop, recreate and reseed the local database |
| `npm run images` | Fetch photography from Wikimedia Commons |
| `npm run images:upload` | Upload images to Supabase Storage |

---

## Testing

```bash
npm test                                   # 38 API tests
python3 scripts/ui-check.py                # full browser check + screenshots
```

The API tests run against a real Postgres (in-memory PGlite) with the real
schema and real seed data — not mocks. The UI check drives a real browser
through every page, applies a filter, submits a booking, signs into the
dashboard, and **fails if any page logs a console error or any API request
returns an error**.

---

## Photography

Every photo comes from [Wikimedia Commons](https://commons.wikimedia.org) and
is used under its Creative Commons licence. The author, licence and source
page for each image are stored in `assets/images.json`, seeded into the
database, and shown alongside the gallery.

`scripts/fetch-images.mjs` pulls them; `scripts/upload-images.mjs` pushes
them to a Supabase Storage bucket and rewrites the URLs in the database.

**Before going live, replace the stock photography and the placeholder
contact details in `web/src/data/site.ts` with the operator's own.**

---

## Deploying

Full walkthrough in **[docs/DEPLOY.md](docs/DEPLOY.md)**. The short version:

1. Create a Supabase project, run `supabase/schema.sql` then `supabase/rls.sql`
   in the SQL Editor, and seed it with `npm run db:seed` (point `DATABASE_URL`
   at it).
2. Push the repository to GitHub.
3. Deploy `api/` to Vercel as a Node project with `DATABASE_URL`, `JWT_SECRET`
   and `CORS_ORIGIN` set.
4. Deploy `web/` to Vercel with `VITE_API_URL` pointing at the API.

---

## Licence

Code: MIT. Photography: Creative Commons, per image — see `assets/images.json`.
