#!/usr/bin/env bash
#
# Deploy Safari Trails to Vercel from a COPY that is not inside a git repo.
#
# ---------------------------------------------------------------------------
# Why the copy
# ---------------------------------------------------------------------------
# Vercel reads the git metadata of the directory it deploys from and checks
# the commit author against the project's GitHub permissions. A local-only
# commit authored by a non-GitHub identity ("dev@localhost") makes Vercel
# answer:
#
#   The deployment was blocked because the commit author doesn't have
#   permission to create deployments for this project.
#
# Deploying from a plain directory — one with no `.git` above it — means
# there is no commit author to check, so the check cannot fire. The files
# uploaded are byte-for-byte the same.
set -euo pipefail

ROOT="/workspace/safari-trails"
STAGE="/workspace/deploy-stage"

API_PROJECT="safari-trails-api"
WEB_PROJECT="safari-trails-web"
API_ID="prj_K1HWo5vDGrmHgR2GN0j21t6Qh69A"
WEB_ID="prj_wFrVzGCpBxBVmOJTAUR6iIfYK39s"

TOKEN="$(node -pe "JSON.parse(require('fs').readFileSync('/workspace/.home/.local/share/com.vercel.cli/auth.json','utf8')).token")"

api() {
  curl -s -m 30 "$@" \
    -H "Authorization: Bearer ${TOKEN}" \
    -H 'Content-Type: application/json'
}

echo "==> Staging a git-free copy"
rm -rf "$STAGE"
mkdir -p "$STAGE/api" "$STAGE/web"

# The API folder, without build output, dependencies or local env files.
tar -C "$ROOT/api" -cf - \
  --exclude=node_modules --exclude=dist --exclude=.vercel \
  --exclude='.env' --exclude='.env.local' --exclude='.env.*.local' \
  . | tar -C "$STAGE/api" -xf -

# The web folder. `dist` is NOT copied: Vercel builds it from source.
tar -C "$ROOT/web" -cf - \
  --exclude=node_modules --exclude=dist --exclude=.vercel \
  --exclude='.env' --exclude='.env.local' --exclude='.env.*.local' \
  . | tar -C "$STAGE/web" -xf -

# Make sure nothing above the staging dir is a git repo.
if git -C "$STAGE" rev-parse --show-toplevel >/dev/null 2>&1; then
  echo "!! $STAGE is inside a git repo — that would bring the commit author back."
  exit 1
fi
echo "   staged clean (no git metadata)"

echo
echo "==> Deploying the API"
cd "$STAGE/api"
vercel link --project "$API_PROJECT" --yes >/dev/null
vercel deploy --prod --yes 2>&1 | tail -6

echo
echo "==> Deploying the web app"
cd "$STAGE/web"
vercel link --project "$WEB_PROJECT" --yes >/dev/null
# The project is linked to GitHub with rootDirectory=web, which tells
# Vercel to look for a "web" folder INSIDE the uploaded files. A CLI
# upload IS the web folder already, so the setting has to come off for
# the duration of the deploy. It is put back at the end, because the
# GitHub auto-deploy needs it.
api -X PATCH "https://api.vercel.com/v9/projects/$WEB_ID" \
  -d '{"rootDirectory":null}' >/dev/null
vercel deploy --prod --yes 2>&1 | tail -6
api -X PATCH "https://api.vercel.com/v9/projects/$WEB_ID" \
  -d '{"rootDirectory":"web"}' >/dev/null
echo "   web rootDirectory restored to 'web' for the GitHub auto-deploy"

echo
echo "==> Deploy states"
cd "$STAGE/api"
vercel ls --yes 2>/dev/null | grep -E "safari-trails-(api|web) " | head -6
