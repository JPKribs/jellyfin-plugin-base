#!/bin/bash
# Packages the plugin into dist/. The packaging script ships in the JPKribs.Jellyfin.Base package, so this
# runs the copy that comes with the base version the csproj references. Usage: ./build.sh [Configuration] [--clean]
# To try an unreleased script, point JPKRIBS_BUILD_SCRIPT at it, e.g. ../Shared/jellyfin-plugin-base/tools/build-plugin.sh
# Synced from jellyfin-plugin-base templates/plugin; edit it there.
set -euo pipefail
cd "$(dirname "$0")"

if [[ -n "${JPKRIBS_BUILD_SCRIPT:-}" ]]; then
    exec bash "$JPKRIBS_BUILD_SCRIPT" "$@"
fi

# The project is the first build.yaml artifact minus .dll.
PROJECT=$(sed -n '/^artifacts:/{n;s/^[[:space:]]*-[[:space:]]*//;s/["'\'']//g;s/\.dll[[:space:]]*$//;p;q;}' build.yaml)
dotnet restore "$PROJECT/$PROJECT.csproj" --verbosity quiet
SCRIPT=$(dotnet msbuild "$PROJECT/$PROJECT.csproj" -getProperty:JPKribsBaseBuildScript)
[[ -f "$SCRIPT" ]] || { echo "JPKribsBaseBuildScript not found; does the referenced JPKribs.Jellyfin.Base ship tools/build-plugin.sh?" >&2; exit 1; }
exec bash "$SCRIPT" "$@"
