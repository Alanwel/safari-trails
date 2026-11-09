# Deploy — GitHub + Vercel + Supabase

Everything below assumes you have finished [SETUP.md](SETUP.md) and the site
runs on your machine.

You will end up with:

```
GitHub      →  your source code
Supabase    →  your database (Postgres) + image storage
Vercel      →  two deployments: the API and the website
```

> **This is already done for Safari Trails.** The live deployment is
> <https://safari-trails-web.vercel.app> with the API on
> <https://safari-trails-api.vercel.app> and the database on Supabase project
> `dkuiifymxpbzezjaspef` (region eu-west-1). The steps below are how it was
> done, and how to redeploy or rebuild it somewhere else.

---

## The fast path

If you are deploying this same project again (or to a new account), you do not
need to click through the dashboard. One script does everything:

```bash
vercel login      # device-code flow, no token needed

DATABASE_URL="postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres" \
JWT_SECRET="$(node -e 'console.log(require("crypto").randomBytes(48).toString("hex"))')" \
./scripts/deploy-vercel.sh
```

It creates both Vercel projects, sets every environment variable, deploys the
API, deploys the web app with `VITE_API_URL` already pointing at the API, then
tightens the API's `CORS_ORIGIN` to the real web origin and redeploys.

The long version follows.

---

## 1. Push to GitHub

```bash
cd safari-trails
git init                      # only if you did not clone
git add .
git commit -m "Safari Trails: tour booking platform"
git branch -M main
git remote add origin https://github.com/<your-username>/safari-trails.git
git push -u origin main
```

Create the repository on github.com first (empty repository, no README), then
push.

> **Check what you are about to publish.** `.gitignore` already excludes
> `node_modules`, `.env`, `.data`, `.run`, `dist` and `screenshots`. Run
> `git status` before committing and confirm there is no `.env` in the list.

---

## 2. Provision the production database

### 2.1 Create a Supabase project

<https://supabase.com/dashboard> → **New project**. Pick a region near your
users (Singapore or Frankfurt for East Africa / Europe). Save the database
password — you will need it in step 2.3.

### 2.2 Apply the schema

Open **SQL Editor** → **New query**. Paste the entire contents of
`supabase/schema.sql` and click **Run**. Then create a second query with
`supabase/rls.sql` and run it too.

You should see `Success. No rows returned` for both. Verify in the table
editor that `destinations`, `tours`, `tour_days`, `tour_images`, `reviews`,
`bookings`, `inquiries` and `admin_users` exist.

### 2.3 Get the connection string

**Project Settings → Database → Connection string → URI**.

Use the **Supavisor session pooler** form, because it works from any network:

```
postgresql://postgres.<project-ref>:<PASSWORD>@aws-0-<region>.pooler.supabase.com:6543/postgres
```

> URL-encode the password if it contains `@ : / # ?` or other special
> characters.

### 2.4 Seed it

From your machine, with the connection string in the environment:

```bash
cd api
DATABASE_URL="postgresql://postgres.abcdefghijkl:YOUR_PASSWORD@aws-0-eu-central-1.pooler.supabase.com:6543/postgres" \
  npm run db:provision
```

`db:provision` applies `schema.sql`, applies `rls.sql`, seeds the catalogue,
prints a row count for every table, and exits. It refuses to run without a
`DATABASE_URL` — the local database is `npm run db:reset` instead, which
refuses to run *with* one. Neither can clobber the other by accident.

The seeder also creates the admin account using `ADMIN_EMAIL` / `ADMIN_PASSWORD`
from `api/.env` — **set those to production values first**.

### 2.5 Move the images to Supabase Storage

The site ships with the photos in `web/public/images/`, which Vercel will
serve fine. To move them into Supabase Storage instead:

1. In the Supabase dashboard, **Storage → New bucket**, name it
   `tour-images`, and turn on **Public bucket**.
2. Run the upload script with the service-role key:

   ```bash
   cd api
   SUPABASE_URL="https://<project-ref>.supabase.co" \
   SUPABASE_SERVICE_ROLE_KEY="<your-service-role-key>" \
   node ../scripts/upload-images.mjs
   ```

   The service-role key is in **Project Settings → API**. It bypasses RLS —
   never put it in the browser, never commit it.

---

## 3. Deploy the API to Vercel

The API is a normal Node/Express app, so Vercel runs it as a serverless
function.

1. <https://vercel.com/new> → import the GitHub repo.
2. **Framework preset**: Other. **Root directory**: `api`.
3. **Build command**: `npm run build`. **Output directory**: `dist`.
4. Add the environment variables:

   | Variable | Value |
   |---|---|
   | `DATABASE_URL` | the Supabase connection string from 2.3 |
   | `JWT_SECRET` | a fresh random secret |
   | `CORS_ORIGIN` | your web app's URL, e.g. `https://safari-trails.vercel.app` |
   | `NODE_ENV` | `production` |
   | `ADMIN_EMAIL` | operator login email |
   | `ADMIN_PASSWORD` | operator login password |

5. **Deploy**.

Test it: `https://<your-api>.vercel.app/api/health` should return
`{"data":{"status":"ok","database":"postgres (supabase)"}}`.

> If the health check says `pglite (local)`, `DATABASE_URL` did not reach the
> deployment — check the environment variables in the Vercel project settings.

---

## 4. Deploy the website to Vercel

1. <https://vercel.com/new> → import the **same** repo again.
2. **Framework preset**: Vite. **Root directory**: `web`.
3. **Build command**: `npm run build`. **Output directory**: `dist`.
4. Add environment variables:

   | Variable | Value |
   |---|---|
   | `VITE_API_URL` | `https://<your-api>.vercel.app` |

   > `VITE_` variables are baked into the JavaScript bundle **at build time**.
   > After changing one, you must **redeploy** — restarting is not enough.

5. **Deploy**.

---

## 5. Point them at each other

Vercel gives you a `.vercel.app` URL, but you want a real domain.

### Custom domains

For each project: **Settings → Domains → Add**. Add e.g.
`safaritrails.com` and `api.safaritrails.com`.

Then update the environment variables:

- Web project → `VITE_API_URL` = `https://api.safaritrails.com` → **redeploy**
- API project → `CORS_ORIGIN` = `https://safaritrails.com` → **redeploy**

### Without a domain

If you are still on the `.vercel.app` URLs, set `CORS_ORIGIN` on the API to
your web URL exactly, with no trailing slash:

```
CORS_ORIGIN=https://safari-trails.vercel.app
```

Multiple origins can be comma-separated:

```
CORS_ORIGIN=https://safaritrails.com,https://www.safaritrails.com
```

---

## 6. Verify the deployment

```bash
# API
curl https://api.safaritrails.com/api/health

# A tour, from the live API
curl https://api.safaritrails.com/api/tours?pageSize=1

# The site itself
curl -s -o /dev/null -w "%{http_code}\n" https://safaritrails.com
```

Then, in a browser:

1. Home page loads, images appear.
2. Filter by destination → results narrow.
3. Open a tour → itinerary expands.
4. Submit a booking → you get a reference like `ST-7QK4M2`.
5. Sign in at `/admin` → the booking is there. Change its status. Reload —
   the new status persists. **That last check is the one that proves the
   database write actually landed in Supabase.**

---

## 7. Before you call it done

- [ ] `JWT_SECRET` is a fresh random value, not the example
- [ ] `ADMIN_PASSWORD` is not `SafariTrails2026!`
- [ ] The operator's real phone, email and address are in `web/src/data/site.ts`
- [ ] Real photography has replaced the Wikimedia placeholders (or the
      attribution is where the operator wants it)
- [ ] `CORS_ORIGIN` names your real domain and nothing else
- [ ] The service-role key is **not** in any committed file
- [ ] A domain is attached and HTTPS works
- [ ] The GitHub repo has a README and a screenshot

---

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Site loads, but "we could not load this" | `VITE_API_URL` wrong, or not redeployed | Set it, then **Redeploy** |
| Browser console: CORS error | `CORS_ORIGIN` does not match the site origin | Copy the exact origin, no trailing slash, no path |
| API 500s on every request | `DATABASE_URL` wrong or the password needs URL-encoding | Check the Vercel logs; try the pooler URI |
| API says `pglite (local)` in production | `DATABASE_URL` not set on Vercel | Add it and redeploy |
| Images 404 | Images live in `web/public/images` but the API serves a different path | Confirm `VITE_API_URL` and that `web` was deployed with the files |
| Booking submits but nothing appears in the dashboard | Different databases | `/api/health` on both — both must say `postgres (supabase)` |
| Deploy fails at build | Missing deps | Make sure `npm install` ran at the repo root and the root directory is set correctly |

---

## Cost

| Service | Free tier |
|---|---|
| Supabase | 500 MB database, 1 GB storage, plenty for this project |
| Vercel | Generous hobby-tier limits for two small Node/React apps |
| GitHub | Unlimited public repositories |
| Wikimedia | Free — the photos are already on the internet |

For a small operator this should sit comfortably inside the free tiers.
