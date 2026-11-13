#!/usr/bin/env bash
# Writes the shared plugin files from templates/plugin into plugin checkouts: the build.sh shim and the
# .github/workflows callers, pinned to one base release. Also points the plugin's JPKribs.Jellyfin.Base
# PackageReference at that release (the shim runs the packaging script shipped in it) and removes the
# workflows and files the callers replaced. Prints every file it changes; commits nothing.
#
# Usage: scripts/sync-plugins.sh [--check] <base-sha> <base-version> <plugin-dir>...
#   base-sha      full commit SHA of the base release, the vYYYY.M.D tag's commit
#   base-version  that release's package version, e.g. 2026.10.20
#   --check       change nothing; list what differs and exit 1 if anything does
# For example: scripts/sync-plugins.sh "$(git rev-parse v2026.10.20)" 2026.10.20 ../../jellyfin-plugin-*
set -euo pipefail

CHECK=false
if [[ "${1:-}" == "--check" ]]; then
    CHECK=true
    shift
fi
if [[ $# -lt 3 ]]; then
    sed -n '2,12p' "$0" >&2
    exit 2
fi
BASE_SHA="$1"
BASE_VERSION="$2"
shift 2
[[ "$BASE_SHA" =~ ^[0-9a-f]{40}$ ]] || { echo "base-sha must be a full 40 character commit SHA" >&2; exit 2; }
[[ "$BASE_VERSION" =~ ^[0-9]{4}\.[0-9]{1,2}\.[0-9]{1,2}(\.[0-9]+)?(-[0-9A-Za-z.]+)?$ ]] || { echo "base-version must look like YYYY.M.D" >&2; exit 2; }

TEMPLATES="$(cd "$(dirname "$0")/.." && pwd)/templates/plugin"
CALLERS="build changelog docs publish scan-codeql test"
# Replaced by the callers (command-*, sync-labels: jellyfin-meta-plugins jobs this setup does not use;
# .github/docs: the mkdocs pins now live in plugin-docs.yaml).
OBSOLETE=".github/workflows/command-dispatch.yaml .github/workflows/command-rebase.yaml .github/workflows/sync-labels.yaml .github/docs"
DRIFT=0

# The only per-plugin inputs today. Printed as YAML lines appended under the caller's job.
extra_with() {
    case "$1:$2" in
        jellyfin-plugin-artworkgenerator:build)
            printf '    with:\n      extra-projects: Jellyfin.Plugin.ArtworkGenerator.Demo/DemoGenerator.csproj\n' ;;
        jellyfin-plugin-artworkgenerator:publish)
            printf '      release-assets: Jellyfin.Plugin.ArtworkGenerator/Assets/Logo.png\n'
            printf '      pre-commit-command: cd Jellyfin.Plugin.ArtworkGenerator.Demo && dotnet run\n'
            printf '      extra-commit-paths: docs/examples\n'
            printf '      commit-message: Update manifest and demo images for release {tag}\n' ;;
    esac
}

# Writes $3 (content) to $1/$2 when it differs, or only reports it under --check.
put() {
    local file="$1/$2"
    if [[ -f "$file" ]] && [[ "$(cat "$file")" == "$3" ]]; then
        return
    fi
    DRIFT=1
    echo "  ${2}: $([[ -f "$file" ]] && echo differs || echo missing)"
    if [[ "$CHECK" == false ]]; then
        mkdir -p "$(dirname "$file")"
        printf '%s\n' "$3" > "$file"
    fi
}

for dir in "$@"; do
    dir="${dir%/}"
    name=$(basename "$(git -C "$dir" config --get remote.origin.url 2>/dev/null || echo "$dir")" .git)
    [[ -f "$dir/build.yaml" ]] || { echo "$dir: no build.yaml, skipped" >&2; DRIFT=1; continue; }
    echo "$name ($dir)"

    put "$dir" build.sh "$(cat "$TEMPLATES/build.sh")"
    [[ "$CHECK" == true ]] || chmod +x "$dir/build.sh"

    for caller in $CALLERS; do
        content=$(sed -e "s/<SHA>/$BASE_SHA/" -e "s/<VERSION>/v$BASE_VERSION/" -e "s#<REPOSITORY>#JPKribs/$name#" \
            "$TEMPLATES/.github/workflows/$caller.yaml"; extra_with "$name" "$caller")
        put "$dir" ".github/workflows/$caller.yaml" "$content"
    done

    for path in $OBSOLETE; do
        if [[ -e "$dir/$path" ]]; then
            DRIFT=1
            echo "  ${path}: obsolete"
            [[ "$CHECK" == true ]] || rm -rf "${dir:?}/$path"
        fi
    done

    # The plugin's main project: the first build.yaml artifact minus .dll, as build.sh resolves it.
    project=$(sed -n '/^artifacts:/{n;s/^[[:space:]]*-[[:space:]]*//;s/["'\'']//g;s/\.dll[[:space:]]*$//;p;q;}' "$dir/build.yaml")
    csproj="$dir/$project/$project.csproj"
    if ! grep -q "Include=\"JPKribs.Jellyfin.Base\" Version=\"$BASE_VERSION\"" "$csproj"; then
        DRIFT=1
        echo "  $project/$project.csproj: JPKribs.Jellyfin.Base is not $BASE_VERSION"
        if [[ "$CHECK" == false ]]; then
            sed -E "s/(Include=\"JPKribs\.Jellyfin\.Base\" Version=\")[^\"]*\"/\1$BASE_VERSION\"/" "$csproj" > "$csproj.tmp"
            mv "$csproj.tmp" "$csproj"
        fi
    fi
done

if [[ "$CHECK" == true ]] && [[ "$DRIFT" == 1 ]]; then
    exit 1
fi
