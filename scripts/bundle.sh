#!/usr/bin/env bash
# Bundles the per-component sources in src/ into the two assets that ship in the package, and fetches the Jellyfin
# strings pinned in jellyfin.json into dist/jellyfin/ when the snapshot there does not match the pin.
#
# Adding a component: drop a descriptively named file in src/css or src/js. No ordering to manage:
#   * CSS custom properties resolve regardless of declaration order, and each component targets its
#     own selectors, so file order does not matter. design-tokens.css is emitted first purely for readability,
#     and each component keeps its own responsive (@media) overrides in its own file.
#   * JS components are ES modules; re-export new ones from src/js/index.ts and esbuild bundles them.
set -euo pipefail
cd "$(dirname "$0")/.."

# Dev tools come from package-lock.json, so every build uses the same esbuild and TypeScript.
if [ ! -f node_modules/.package-lock.json ] || [ package-lock.json -nt node_modules/.package-lock.json ]; then
  npm ci --no-audit --no-fund
fi
ESBUILD=node_modules/.bin/esbuild

# Type check the JS and TS sources. esbuild strips types without checking them.
node_modules/.bin/tsc --noEmit -p tsconfig.json

mkdir -p dist

# CSS: design tokens first (readability), then every other component alphabetically, then minify.
{
  cat src/css/design-tokens.css
  find src/css -name '*.css' ! -name 'design-tokens.css' | sort | xargs cat
} > dist/_bundle.css
# The target keeps fallback colours as rgba() rather than 8-digit hex, which engines before Chromium 62 can't read.
"$ESBUILD" dist/_bundle.css --minify --target=chrome58,safari11,firefox57 --outfile=dist/jpkribs_shared.css --allow-overwrite
rm -f dist/_bundle.css

# JS: bundle and minify the ES module components into one ESM file. Exported names are preserved.
# The target holds the output to what Chromium 87 runs. scripts/check-bundle.mjs reads the export list from
# the metafile.
"$ESBUILD" src/js/index.ts --bundle --minify --format=esm --target=chrome87 --legal-comments=none --metafile=dist/jpkribs_shared.meta.json --outfile=dist/jpkribs_shared.js

# Typings for the bundle, which ship in the package beside it for editors. They are never embedded in a plugin.
node scripts/build-types.mjs

# The web client's and the server's strings, which the translations build checks a plugin's own strings against.
node scripts/fetch-jellyfin-strings.mjs

echo "Bundled -> dist/jpkribs_shared.css, dist/jpkribs_shared.js, dist/jpkribs_shared.d.ts, dist/jellyfin/"
