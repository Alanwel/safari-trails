#!/usr/bin/env bash
#
# Deploy Safari Trails to Vercel — two projects from one repo:
#
#   safari-trails-api   root directory: api    (Express + TypeScript)
#   safari-trails-web   root directory: web    (React + Vite)
#
# Usage:
#   DATABASE_URL="postgresql://..." JWT_SECRET="..." ./scripts/deploy-vercel.sh
#
# Secrets come from the environment and are never written to this file or to
# the repository. The script is re-runnable: it updates existing env vars and
# redeploys rather than failing.
#
# Requires: `vercel` CLI, already logged in (`vercel login`).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
API_PROJECT="${API_PROJECT:-safari-trails-api}"
WEB_PROJECT="${WEB_PROJECT:-safari-trails-web}"

: "${DATABASE_URL:?set DATABASE_URL to your Postgres connection string}"
: "${JWT_SECRET:?set JWT_SECRET to a long random string}"

say() { printf '\n\033[1;32m==> %s\033[0m\n' "$1"; }

# Pull the production URL out of the CLI's output.
deploy_url() {
  grep -oE 'https://[a-zA-Z0-9._-]+\.vercel\.app' | head -1
}

ensure_project() {
  local name="$1"
  if ! vercel project inspect "$name" >/dev/null 2>&1; then
    vercel project create "$name" >/dev/null
  fi
}

set_env() {
  # --environment + --value + --force = fully non-interactive, and overwrites
  # an existing variable instead of failing.
  vercel env add "$1" \
    --value "$2" \
    --environment production \
    --force --yes >/dev/null
  echo "  set $1"
}

# ---------------------------------------------------------------------------
# 1. API
# ---------------------------------------------------------------------------
say "Preparing the API project ($API_PROJECT)"
cd "$ROOT/api"
ensure_project "$API_PROJECT"
vercel link --project "$API_PROJECT" --yes >/dev/null

# CORS_ORIGIN is set to the web project's address now, and corrected to the
# real one further down once we know it.
set_env "DATABASE_URL"   "$DATABASE_URL"
# NEVER change JWT_SECRET on a live project. It signs the admin tokens, so
# changing it silently signs every operator out — they will see "your
# session has expired" on a panel they were already using. If you really
# must rotate it, expect to sign in again afterwards.
if vercel env ls --environment production 2>/dev/null | grep -q '^ JWT_SECRET'; then
  echo "  JWT_SECRET already set — leaving it alone (changing it signs everyone out)"
else
  set_env "JWT_SECRET"   "$JWT_SECRET"
fi
set_env "NODE_ENV"       "production"
set_env "CORS_ORIGIN"    "https://${WEB_PROJECT}.vercel.app"

# --- CMS image uploads -----------------------------------------------------
# The API signs in as a low-privilege machine account to write into the
# tour-images bucket. The anon key is PUBLIC (it ships in every browser);
# the password is the secret. The service role key is deliberately NOT used.
set_env "SUPABASE_URL"          "${SUPABASE_URL:-https://dkuiifymxpbzezjaspef.supabase.co}"
set_env "SUPABASE_ANON_KEY"     "${SUPABASE_ANON_KEY:?set SUPABASE_ANON_KEY}"
set_env "CMS_STORAGE_PASSWORD"  "${CMS_STORAGE_PASSWORD:?set CMS_STORAGE_PASSWORD}"

say "Deploying the API"
API_OUT="$(vercel deploy --prod --yes 2>&1)" || { echo "$API_OUT"; exit 1; }
echo "$API_OUT" | tail -6
# Prefer the stable project alias over the per-deployment hash URL.
API_URL="https://${API_PROJECT}.vercel.app"
[ -n "$API_URL" ] || { echo "Could not determine the API URL"; exit 1; }
echo "API live at: $API_URL"

# ---------------------------------------------------------------------------
# 2. Web
# ---------------------------------------------------------------------------
say "Preparing the web project ($WEB_PROJECT)"
cd "$ROOT/web"
ensure_project "$WEB_PROJECT"
vercel link --project "$WEB_PROJECT" --yes >/dev/null

# VITE_ variables are baked in at BUILD time, so this must exist before the
# first web deployment — not after.
set_env "VITE_API_URL" "$API_URL"

say "Deploying the web app"
WEB_OUT="$(vercel deploy --prod --yes 2>&1)" || { echo "$WEB_OUT"; exit 1; }
echo "$WEB_OUT" | tail -6
WEB_URL="https://${WEB_PROJECT}.vercel.app"
[ -n "$WEB_URL" ] || { echo "Could not determine the web URL"; exit 1; }
echo "Web live at: $WEB_URL"

# ---------------------------------------------------------------------------
# 3. Point the API's CORS at the real web origin and redeploy
# ---------------------------------------------------------------------------
say "Tightening CORS to the real web origin"
cd "$ROOT/api"
set_env "CORS_ORIGIN" "$WEB_URL"
# `vercel redeploy` needs the deployment URL as an argument.
LATEST_API_DEPLOY="$(vercel ls "$API_PROJECT" --environment production 2>/dev/null \
  | grep -oE 'https://[a-zA-Z0-9._-]+\.vercel\.app' | head -1)"
if [ -n "$LATEST_API_DEPLOY" ]; then
  vercel redeploy "$LATEST_API_DEPLOY" --environment production >/dev/null
  echo "  redeployed the API"
else
  echo "  could not find the latest API deployment to redeploy"
fi

cat <<MSG

--------------------------------------------------------------------------
DEPLOYED

  Website : $WEB_URL
  API     : $API_URL
  Health  : $API_URL/api/health
  Admin   : $WEB_URL/admin

  Sign in with ADMIN_EMAIL / ADMIN_PASSWORD (see api/.env.example).
---------------------------------------------------------------------------

MSG
