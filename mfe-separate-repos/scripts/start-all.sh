#!/usr/bin/env bash
# Start all separate "repos" for local federation.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "==> 1) Build shared-auth package (like publishing to private npm)"
cd "$ROOT/shared-auth"
npm install
npm run build

echo "==> 2) Link built package into each app (file: dep = local stand-in for private registry)"
for app in shell mfe-safety mfe-fleet; do
  cd "$ROOT/$app"
  npm install ../shared-auth/dist/shared-auth
done

echo "==> 3) Start remotes + shell (3 processes)"
cd "$ROOT/mfe-safety"
npx ng serve --port 4201 &
PID_SAFETY=$!
cd "$ROOT/mfe-fleet"
npx ng serve --port 4202 &
PID_FLEET=$!
cd "$ROOT/shell"
npx ng serve --port 4200 &
PID_SHELL=$!

cleanup() {
  kill $PID_SAFETY $PID_FLEET $PID_SHELL 2>/dev/null || true
}
trap cleanup EXIT

echo ""
echo "Shell:   http://localhost:4200"
echo "Safety:  http://localhost:4201"
echo "Fleet:   http://localhost:4202"
echo "Login:   admin / admin"
echo "Ctrl+C to stop all."
wait
