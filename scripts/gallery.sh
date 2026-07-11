#!/usr/bin/env bash
# Rebuilds the shared bundle and serves the UI gallery so you can review every component in a browser.
# The gallery is a static page that loads the real dist/ bundle with the Jellyfin globals stubbed, so
# nothing needs to be installed into a plugin. ES module imports require http(s), hence the local server.
#
# Usage: scripts/gallery.sh [port]   (default 8080)
set -euo pipefail
cd "$(dirname "$0")/.."

bash scripts/bundle.sh

PORT="${1:-8080}"
URL="http://localhost:${PORT}/JPKribs.Jellyfin.Base.Tests/gallery/index.html"
echo ""
echo "UI gallery: ${URL}"
echo "Press Ctrl-C to stop."
echo ""

# Open the default browser (macOS 'open', Linux 'xdg-open') if available; ignore failure.
( command -v open >/dev/null 2>&1 && open "${URL}" ) || \
( command -v xdg-open >/dev/null 2>&1 && xdg-open "${URL}" ) || true

# Serve the repo root so the gallery's ../../dist/ references resolve.
python3 -m http.server "${PORT}"
