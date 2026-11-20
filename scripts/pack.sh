#!/usr/bin/env bash
# Packs the package locally, so a consumer can test an unpublished build with
# -p:RestoreAdditionalProjectSources=<this repo>/nupkg.
# The version is the next release's, <jellyfin>.<X> from jellyfin.json and the tags, marked as a dev build with the
# time, such as 12.4.1-dev.20261120153000, so it never takes the place of the real release in the NuGet cache.
# Pass a version to override, for example scripts/pack.sh 12.4.1-dev.1
set -euo pipefail
cd "$(dirname "$0")/.."
JELLYFIN=$(node -p "require('./jellyfin.json').jellyfin")
HIGHEST=-1
for TAG in $(git tag --list "v${JELLYFIN}.*" 2>/dev/null); do
  X="${TAG#v${JELLYFIN}.}"
  if [[ "${X}" =~ ^[0-9]+$ ]] && [ "${X}" -gt "${HIGHEST}" ]; then
    HIGHEST="${X}"
  fi
done
VERSION="${1:-${JELLYFIN}.$((HIGHEST + 1))-dev.$(date -u +%Y%m%d%H%M%S)}"
bash scripts/bundle.sh
dotnet pack JPKribs.Jellyfin.Base.csproj -c Release -o nupkg -p:Version="${VERSION}"
echo "Packed nupkg/JPKribs.Jellyfin.Base.${VERSION}.nupkg"
