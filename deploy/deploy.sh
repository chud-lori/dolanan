#!/usr/bin/env bash
# Idempotent local deploy helper for Dolanan on a single VM.
#
# One-time setup (run as a user with sudo):
#   1. git clone https://github.com/chud-lori/dolanan ~/dolanan
#   2. bash ~/dolanan/deploy/deploy.sh --install
#
# Updates:
#   cd ~/dolanan && git pull && bash deploy/deploy.sh
#
# What it does:
#   - Regenerates the SW precache manifest from the file tree
#   - Symlinks ~/dolanan → /var/www/dolanan
#   - Installs nginx config if --install, then reloads nginx

set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
INSTALL=false
for arg in "$@"; do
  [[ "$arg" == "--install" ]] && INSTALL=true
done

echo "→ Regenerating service worker precache list"
if command -v node >/dev/null 2>&1; then
  node "$REPO_DIR/scripts/build-sw.mjs"
else
  echo "  (node not found — sw.js left as-is)"
fi

echo "→ Regenerating icons (if Pillow present)"
if python3 -c "import PIL" 2>/dev/null; then
  python3 "$REPO_DIR/scripts/_gen_icons.py"
else
  echo "  (Pillow not found — skipping icon regen)"
fi

if $INSTALL; then
  echo "→ Installing nginx site"
  sudo cp "$REPO_DIR/deploy/dolanan.nginx.conf" /etc/nginx/sites-available/dolanan.conf
  sudo ln -sfn /etc/nginx/sites-available/dolanan.conf /etc/nginx/sites-enabled/dolanan.conf

  echo "→ Symlinking /var/www/dolanan"
  sudo ln -sfn "$REPO_DIR" /var/www/dolanan

  echo "→ Testing + reloading nginx"
  sudo nginx -t
  sudo systemctl reload nginx
else
  echo "→ Reloading nginx (use --install for first-time setup)"
  sudo nginx -t && sudo systemctl reload nginx || true
fi

echo "✓ Deployed from $REPO_DIR"
