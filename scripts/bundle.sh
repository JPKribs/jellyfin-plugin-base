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

# CSS: tokens first (readability), then every other component alphabetically.
{
  cat src/css/tokens.css
  find src/css -name '*.css' ! -name 'tokens.css' | sort | xargs cat
} > dist/jpkribs_shared.css

# JS: bundle the ES module components into one ESM file.
npx --yes esbuild src/js/index.js --bundle --format=esm --legal-comments=none --outfile=dist/jpkribs_shared.js

echo "Bundled -> dist/jpkribs_shared.css, dist/jpkribs_shared.js"
