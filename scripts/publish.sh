#!/usr/bin/env bash
#
# Push Safari Trails to GitHub.
#
#   GITHUB_TOKEN=ghp_xxx ./scripts/publish.sh
#
# The token is read from the environment and is NOT stored anywhere on disk.
# It needs the `repo` scope (a fine-grained token with "Contents: read and
# write" on the repository is enough).
#
# If you would rather not use a token, see docs/DEPLOY.md — you can push with
# plain `git push` and let GitHub's credential manager ask for your password
# with a personal access token instead of the account password.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REMOTE="${GITHUB_REMOTE:-https://github.com/Alanwel/safari-trails.git}"
BRANCH="${GITHUB_BRANCH:-main}"

cd "$ROOT"

if [ -z "${GITHUB_TOKEN:-}" ]; then
  echo "GITHUB_TOKEN is not set."
  echo
  echo "  1. Create a token: https://github.com/settings/tokens"
  echo "     (fine-grained token -> repo 'safari-trails' -> Contents: Read and write)"
  echo "  2. Then run:"
  echo "       GITHUB_TOKEN=ghp_xxx ./scripts/publish.sh"
  exit 1
fi

if [ -n "$(git status --porcelain)" ]; then
  echo "There are uncommitted changes — committing them first."
  git add -A
  git commit -m "Update: $(date +%Y-%m-%d)"
fi

if ! git remote get-url origin >/dev/null 2>&1; then
  git remote add origin "$REMOTE"
else
  git remote set-url origin "$REMOTE"
fi

git branch -M "$BRANCH"

echo "Pushing to $REMOTE ($BRANCH)…"

# The token goes in the URL for this one command only — it is never written
# to .git/config, so it does not linger on disk.
PUSH_URL="https://x-access-token:${GITHUB_TOKEN}@github.com/$(echo "$REMOTE" | sed -E 's#^https?://[^/]+/##')"

if git push -u "$PUSH_URL" "$BRANCH"; then
  git remote set-url origin "$REMOTE"
  echo
  echo "Done. Repo: $REMOTE"
  echo "Next: docs/DEPLOY.md for Supabase + Vercel."
else
  echo "Push failed. If the repository does not exist yet, create it first:" >&2
  echo "  https://github.com/new  (name: safari-trails, Public, do NOT add a README)" >&2
  exit 1
fi
