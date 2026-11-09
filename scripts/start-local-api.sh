#!/usr/bin/env bash
# Start the local Safari Trails API against the real Supabase database.
#
#   bash scripts/start-local-api.sh
#
# The env file is written fresh each time so a stale password never silently
# keeps a half-working server alive.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ROOT}/.local-api.env"

: "${SUPABASE_ANON_KEY:?set SUPABASE_ANON_KEY in the environment first}"

cat > "$ENV_FILE" <<EOF
export DATABASE_URL='postgresql://postgres.dkuiifymxpbzezjaspef:Mukono256%40%3F@aws-0-eu-west-1.pooler.supabase.com:6543/postgres'
export JWT_SECRET='local-dev-secret-for-safari-trails-cms'
export NODE_ENV=production
export CORS_ORIGIN='http://localhost:4173,http://127.0.0.1:4173'
export ADMIN_EMAIL='admin@safaritrails.com'
export ADMIN_PASSWORD='SafariTrails2026!'
export SUPABASE_URL='https://dkuiifymxpbzezjaspef.supabase.co'
export SUPABASE_ANON_KEY='${SUPABASE_ANON_KEY}'
export CMS_STORAGE_PASSWORD='Cm5-Cms-2026-Aa1!'
EOF

cd "$ROOT/api"
npm run build >/dev/null

pkill -f 'dist/inde[x].js' 2>/dev/null || true
sleep 1

# shellcheck disable=SC1090
source "$ENV_FILE"
PORT=4000 setsid nohup node dist/index.js > "${ROOT}/st-api.log" 2>&1 < /dev/null &
disown || true

sleep 6
curl -s -m 10 http://localhost:4000/api/health | head -c 120
echo
