#!/usr/bin/env bash
# Checks the shipped typings, dist/jpkribs_shared.d.ts, against JPKribs.Jellyfin.Base.Tests/types/typings.test.ts.
# Run it from anywhere with scripts/check-types.sh, after scripts/bundle.sh has built the bundle and the typings.
set -euo pipefail
cd "$(dirname "$0")/.."

node_modules/.bin/tsc -p JPKribs.Jellyfin.Base.Tests/types/tsconfig.json
echo "Typings check passed."
