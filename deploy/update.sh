#!/usr/bin/env bash
# One-command deploy update.
# After you push code to GitHub, run this ON THE SERVER from the repo root:
#     bash deploy/update.sh
# It pulls the latest code, rebuilds the frontend + backend, and restarts services.
set -e
cd "$(dirname "$0")/.."

echo "→ Pulling latest code from GitHub..."
git pull

echo "→ Rebuilding frontend..."
cd frontend
npm install
VITE_GOOGLE_CLIENT_ID=$(grep '^GOOGLE_CLIENT_ID=' ../.env | cut -d= -f2) npm run build
sudo rm -rf /var/www/codementor/*
sudo cp -r dist/* /var/www/codementor/
cd ..

echo "→ Rebuilding & restarting backend + services..."
docker compose up --build -d

echo "→ Restarting Judge0 (picks up any judge0.conf changes)..."
docker compose restart judge0_server judge0_worker

echo ""
echo "✅ Update complete. Hard-refresh the browser (Ctrl+Shift+R) to load the new frontend."
