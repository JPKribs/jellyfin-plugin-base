#!/usr/bin/env bash
# Packs the package locally with today's date as the version, the same way the Release workflow does,
# so a consumer can test an unpublished build with -p:RestoreAdditionalProjectSources=<this repo>/nupkg.
# Pass a version to override, for example scripts/pack.sh 2026.10.3.1
set -euo pipefail
cd "$(dirname "$0")/.."
VERSION="${1:-$(TZ=America/Denver date +%Y.%-m.%-d)}"
bash scripts/bundle.sh
dotnet pack JPKribs.Jellyfin.Base.csproj -c Release -o nupkg -p:Version="${VERSION}"
echo "Packed nupkg/JPKribs.Jellyfin.Base.${VERSION}.nupkg"
