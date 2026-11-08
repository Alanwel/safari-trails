#!/usr/bin/env bash
#
# Safari Trails — local development helpers
#
#   ./scripts/dev.sh start     start the API and the web dev server
#   ./scripts/dev.sh stop      stop both (and free the ports)
#   ./scripts/dev.sh restart   stop, then start
#   ./scripts/dev.sh status    show what is running
#   ./scripts/dev.sh logs api  tail the API log
#   ./scripts/dev.sh reset     wipe + re-create the local database
#
# Both servers are started detached, with their output in `.run/*.log` and
# their pids in `.run/*.pid`, so they survive the shell that launched them.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUN_DIR="$ROOT/.run"
API_PORT="${API_PORT:-4000}"
WEB_PORT="${WEB_PORT:-5173}"

mkdir -p "$RUN_DIR"

api_pid() { [ -f "$RUN_DIR/api.pid" ] && cat "$RUN_DIR/api.pid" || echo ""; }
web_pid() { [ -f "$RUN_DIR/web.pid" ] && cat "$RUN_DIR/web.pid" || echo ""; }

alive() { [ -n "${1:-}" ] && kill -0 "$1" 2>/dev/null; }

# Kill a process and everything it spawned, deepest first.
kill_tree() {
  local pid="$1" child
  for child in $(pgrep -P "$pid" 2>/dev/null || true); do
    kill_tree "$child"
  done
  kill -TERM "$pid" 2>/dev/null || true
}

# Kill anything still holding a TCP port.
#
# `npm run dev` spawns several processes (npm -> sh -> tsx -> node). Killing
# only the wrapper leaves the real server running and still bound to the
# port, so the next start fails with EADDRINUSE — and you end up talking to
# the OLD code while wondering why your edit did nothing.
free_port() {
  local port="$1" pids
  pids="$(lsof -ti tcp:"$port" 2>/dev/null || true)"
  [ -z "$pids" ] && return 0
  echo "  freeing port $port (pid $(echo "$pids" | tr '\n' ' '))"
  # shellcheck disable=SC2086
  kill -TERM $pids 2>/dev/null || true
  sleep 1
  # shellcheck disable=SC2086
  kill -9 $pids 2>/dev/null || true
}

stop_one() {
  local name="$1" pid
  pid="$(eval "${name}_pid")"
  if alive "$pid"; then
    kill_tree "$pid"
    echo "stopped $name (pid $pid)"
  else
    echo "$name not running"
  fi
  rm -f "$RUN_DIR/$name.pid"
}

start_api() {
  if alive "$(api_pid)"; then echo "api already running"; return; fi
  free_port "$API_PORT"
  cd "$ROOT/api"
  # CHOKIDAR_USEPOLLING: on network filesystems (NFS, some Docker volumes)
  # inotify does not fire, so `tsx watch` would silently keep serving the
  # OLD code after you save a file. Polling fixes that.
  setsid env PORT="$API_PORT" CHOKIDAR_USEPOLLING=true CHOKIDAR_INTERVAL=400 \
    npm run dev > "$RUN_DIR/api.log" 2>&1 < /dev/null &
  echo $! > "$RUN_DIR/api.pid"
  echo "api starting on http://localhost:$API_PORT (log: .run/api.log)"
}

start_web() {
  if alive "$(web_pid)"; then echo "web already running"; return; fi
  free_port "$WEB_PORT"
  cd "$ROOT/web"
  setsid env VITE_PORT="$WEB_PORT" npm run dev -- --port "$WEB_PORT" \
    > "$RUN_DIR/web.log" 2>&1 < /dev/null &
  echo $! > "$RUN_DIR/web.pid"
  echo "web starting on http://localhost:$WEB_PORT (log: .run/web.log)"
}

wait_for() {
  local url="$1" label="$2" tries=40
  for _ in $(seq 1 $tries); do
    if curl -sf -o /dev/null --max-time 2 "$url"; then
      echo "  $label is up"
      return 0
    fi
    sleep 0.5
  done
  echo "  !! $label did not come up — check .run/*.log"
  return 1
}

case "${1:-start}" in
  start)
    start_api
    start_web
    echo "waiting…"
    wait_for "http://localhost:$API_PORT/api/health" "api" || true
    wait_for "http://localhost:$WEB_PORT" "web" || true
    ;;
  stop)
    stop_one api
    stop_one web
    free_port "$API_PORT"
    free_port "$WEB_PORT"
    ;;
  restart)
    "$0" stop
    sleep 1
    "$0" start
    ;;
  status)
    if alive "$(api_pid)"; then echo "api  running (pid $(api_pid)) : http://localhost:$API_PORT"; else echo "api  stopped"; fi
    if alive "$(web_pid)"; then echo "web  running (pid $(web_pid)) : http://localhost:$WEB_PORT"; else echo "web  stopped"; fi
    ;;
  logs)
    tail -f "$RUN_DIR/${2:-api}.log"
    ;;
  reset)
    "$0" stop
    cd "$ROOT/api" && npx tsx src/db/reset.ts
    ;;
  *)
    sed -n '2,13p' "$0"
    exit 1
    ;;
esac
