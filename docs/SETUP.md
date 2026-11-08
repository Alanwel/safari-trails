# Setup — from zero to a running site

This is the complete path, assuming you have nothing but Node installed.
Every command is meant to be copy-pasted.

---

## 0. What you need

| Tool | Version | Why |
|---|---|---|
| **Node.js** | 20 or newer (22 recommended) | Runs the API and the build |
| **npm** | 10+ | Comes with Node |
| A code editor | VS Code is fine | |
| Git | any recent version | Only for pushing to GitHub |

Check what you have:

```bash
node -v
npm -v
```

If Node is missing, install it from <https://nodejs.org> (choose the **LTS**
version), then close and reopen your terminal.

---

## 1. Get the code and install

```bash
git clone https://github.com/<your-username>/safari-trails.git
cd safari-trails
npm install
```

`npm install` at the root installs **both** workspaces (`api` and `web`) in
one go — you do not need to `cd` into them.

> **If `npm install` fails on Windows:** make sure Git is installed and that
> you cloned with Git (not by downloading a ZIP), because npm needs Git for
> some dependencies.

---

## 2. Configure the API

```bash
cp api/.env.example api/.env
```

Open `api/.env` and look at these three lines:

```ini
DATABASE_URL=
JWT_SECRET=dev-only-secret-change-me-before-deploying-32chars
ADMIN_EMAIL=admin@safaritrails.com
ADMIN_PASSWORD=SafariTrails2026!
```

- `DATABASE_URL` stays **empty** for local development. That tells the API to
  use the embedded PGlite database (a real Postgres that lives in a folder).
- `JWT_SECRET` signs the operator's login tokens. The example value is fine
  for local work. Generate a proper one before you deploy:

  ```bash
  node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
  ```

- `ADMIN_EMAIL` / `ADMIN_PASSWORD` are the operator's dashboard login.
  Change them now if you like — you will use them in a minute.

The API refuses to start if a required variable is missing, and tells you
exactly what is wrong. That is on purpose: a silent `undefined` three hours
into a debugging session is much worse.

---

## 3. Create the database and load the content

```bash
npm run db:reset
```

You should see:

```
[reset] dropping tables…
[reset] applying schema…
[reset] seeding…
[seed] 7 destinations, 10 tours, 22 gallery images, 18 reviews, 1 admin user
[reset] done.
```

This applies `supabase/schema.sql` and loads the catalogue. The data lives in
`api/.data/pglite/` — a normal folder you can delete to start over.

**Where is the data, really?** In a Postgres database, obviously. PGlite just
happens to store that database in a folder instead of on a remote server.

---

## 4. Fetch the photography (optional but recommended)

```bash
npm run images
```

Downloads ~39 photographs of Bwindi, Murchison Falls, Lake Bunyonyi, the
Rwenzori and the Nile from Wikimedia Commons into `web/public/images/`, and
writes `assets/images.json` with the photographer and licence for each one.

It takes a minute or two and needs internet access. If it fails, the site
still works — cards fall back to a styled placeholder.

If you add photos later, re-run the seeder so the database picks them up:

```bash
npm run db:reset
```

---

## 5. Run it

```bash
npm run dev
```

Two processes start:

- **API** → <http://localhost:4000> (health check: `/api/health`)
- **Web** → <http://localhost:5173>

Open the web URL. You should see the hero, the featured tours and the
destination grid.

### If one of them fails to start

| Symptom | Cause | Fix |
|---|---|---|
| `EADDRINUSE :4000` | Something else owns port 4000 | `PORT=4001 npm run dev:api`, then set `VITE_API_URL=http://localhost:4001` in `web/.env` |
| Blank page, console error | Web cannot reach the API | Check the API is up: `curl http://localhost:4000/api/health` |
| `Invalid environment` on boot | `api/.env` missing or malformed | `cp api/.env.example api/.env` again |
| Changes do not appear | Stale dev-server cache | Stop with `Ctrl+C` and restart |

### Managing the servers

```bash
./scripts/dev.sh start     # start both
./scripts/dev.sh stop      # stop both
./scripts/dev.sh restart   # stop, then start
./scripts/dev.sh status    # what is running
./scripts/dev.sh logs api  # tail the API log
./scripts/dev.sh reset     # stop, wipe the database, start again
```

---

## 6. Try the operator dashboard

Go to <http://localhost:5173/admin> and sign in with the `ADMIN_EMAIL` and
`ADMIN_PASSWORD` from your `api/.env`.

You can see the bookings table, change a booking's status, and look at the
counters at the top.

To have something in the table, submit a booking from any tour page — the
booking modal is the **Request to book** button on the right.

---

## 7. Run the tests

```bash
npm test
```

38 tests: the SQL splitter, and the whole API against a real database —
filters, sorting, validation, booking creation, auth, and the admin routes.

For the browser check:

```bash
python3 scripts/ui-check.py
```

It drives a real browser through every page, submits a form, signs in, and
writes screenshots to `screenshots/`. It fails if any page logs a console
error or any API request fails.

You need Playwright's Chromium:

```bash
pip install playwright
python3 -m playwright install chromium
```

---

## 8. Make it yours

| What | Where |
|---|---|
| Brand name, tagline, phone, address, FAQ, testimonials | `web/src/data/site.ts` |
| Colours, fonts, button styles | `web/src/styles.css` (the `@theme` block) |
| Tours, destinations, itineraries, reviews | `api/src/seed/data.ts` |
| Navigation links | `web/src/data/site.ts` → `site.nav` |

After changing the seed content:

```bash
npm run db:reset
```

---

## 9. Common problems

**"It works on my machine"**
The most common cause is a different database. Check `/api/health` — it
tells you whether you are on `pglite (local)` or `postgres (supabase)`.

**Images are missing**
The manifest and the files must agree. Run `npm run images` then
`npm run db:reset`.

**A filter returns nothing**
Filters combine with AND. `destination=bwindi` **and** `difficulty=easy`
gives one tour, not nine. Clear the filters with the chip's × button.

**The admin page says "Your session has expired"**
`JWT_SECRET` changed after the token was issued. Sign in again.

**`npm run db:reset` fails with EBUSY**
The API is still running and holding the database. Run `./scripts/dev.sh stop`
first.

---

## Where to next

- **[DEPLOY.md](DEPLOY.md)** — put it online with GitHub, Vercel and Supabase.
- `api/src/routes/` — add an endpoint.
- `api/src/seed/data.ts` — add a tour.
- `web/src/pages/` — add a page.
