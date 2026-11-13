#!/usr/bin/env bash
# Bundles the per-component sources in src/ into the two assets that ship in the package.
#
# Adding a component: drop a descriptively named file in src/css or src/js. No ordering to manage:
#   * CSS custom properties resolve regardless of declaration order, and each component targets its
#     own selectors, so file order does not matter. tokens.css is emitted first purely for readability,
#     and each component keeps its own responsive (@media) overrides in its own file.
#   * JS components are ES modules; re-export new ones from src/js/index.js and esbuild bundles them.
set -euo pipefail
cd "$(dirname "$0")/.."

mkdir -p dist

# CSS: tokens first (readability), then every other component alphabetically, then minify.
{
  cat src/css/tokens.css
  find src/css -name '*.css' ! -name 'tokens.css' | sort | xargs cat
} > dist/_bundle.css
# The target keeps fallback colours as rgba() rather than 8-digit hex, which engines before Chromium 62 can't read.
npx --yes esbuild dist/_bundle.css --minify --target=chrome58,safari11,firefox57 --outfile=dist/jpkribs_shared.css --allow-overwrite
rm -f dist/_bundle.css

# JS: bundle and minify the ES module components into one ESM file. Exported names are preserved.
npx --yes esbuild src/js/index.js --bundle --minify --format=esm --legal-comments=none --outfile=dist/jpkribs_shared.js

echo "Bundled -> dist/jpkribs_shared.css, dist/jpkribs_shared.js"
