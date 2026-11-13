#!/usr/bin/env bash
# Packages a JPKribs Jellyfin plugin into dist/<package>-<version>.zip plus a bare-hash .md5, the zip that
# the release draft uploads and every server installs. Shipped in the package under tools/ and run by each
# plugin's build.sh shim from the plugin's root, so every plugin packages with the script of the base
# version it references.
#
# Usage: build.sh [Configuration] [--clean]   (Configuration defaults to Release)
#
# Everything plugin specific comes from build.yaml: name, guid, version, targetAbi, framework, artifacts.
# The project is the first artifact minus .dll. Overrides, for a layout that does not follow that rule:
#   PLUGIN_PROJECT       project folder and csproj name (e.g. Jellyfin.Plugin.DynamicDns)
#   PLUGIN_PACKAGE_NAME  zip prefix; defaults to the origin remote's repo name, then the folder name
set -euo pipefail

CONFIGURATION="${1:-Release}"
OUTPUT_DIR="dist"

RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
NC='\033[0m'

log() {
    case "$1" in
        INFO)    echo -e "${CYAN}[INFO]${NC} $2" ;;
        ERROR)   echo -e "${RED}[ERROR]${NC} $2" >&2 ;;
        SUCCESS) echo -e "${GREEN}[SUCCESS]${NC} $2" ;;
    esac
}

fail() {
    log ERROR "$1"
    exit 1
}

# One top-level scalar from build.yaml. Takes everything after the first colon so a value containing a
# colon survives, trims surrounding whitespace, and strips one layer of quotes.
read_yaml_value() {
    sed -n "s/^$1:[[:space:]]*//p" build.yaml | head -n 1 \
        | sed -e 's/[[:space:]]*$//' -e 's/^"\(.*\)"$/\1/' -e "s/^'\(.*\)'\$/\1/"
}

# The artifacts list, one name per line. The list ends at the next top-level key of any case.
read_artifacts() {
    awk '/^artifacts:/ { on = 1; next }
         on && /^[^[:space:]#-]/ { exit }
         on && /^[[:space:]]*-/ { sub(/^[[:space:]]*-[[:space:]]*/, ""); gsub(/["\047]/, ""); sub(/[[:space:]]+$/, ""); if ($0 != "") print }' build.yaml
}

[[ -f build.yaml ]] || fail "build.yaml not found in $(pwd)"

PLUGIN_NAME=$(read_yaml_value name)
PLUGIN_GUID=$(read_yaml_value guid)
VERSION=$(read_yaml_value version)
TARGET_ABI=$(read_yaml_value targetAbi)
FRAMEWORK=$(read_yaml_value framework)
ARTIFACTS=$(read_artifacts)

[[ -n "$PLUGIN_NAME" ]] || fail "build.yaml has no name"
[[ -n "$PLUGIN_GUID" ]] || fail "build.yaml has no guid"
[[ -n "$TARGET_ABI" ]] || fail "build.yaml has no targetAbi"
[[ -n "$FRAMEWORK" ]] || fail "build.yaml has no framework"
[[ -n "$ARTIFACTS" ]] || fail "build.yaml has no artifacts"
# Four-part fallback: a 3-part version would normalize the assembly version mismatched against the
# install URL and break the plugin image.
[[ -n "$VERSION" ]] || VERSION="0.0.0.0"

FIRST_ARTIFACT=$(echo "$ARTIFACTS" | head -n 1)
PROJECT="${PLUGIN_PROJECT:-${FIRST_ARTIFACT%.dll}}"
PROJECT_FILE="$PROJECT/$PROJECT.csproj"
[[ -f "$PROJECT_FILE" ]] || fail "Project file not found: $PROJECT_FILE"

if [[ -n "${PLUGIN_PACKAGE_NAME:-}" ]]; then
    PACKAGE_NAME="$PLUGIN_PACKAGE_NAME"
elif REMOTE=$(git config --get remote.origin.url 2>/dev/null) && [[ -n "$REMOTE" ]]; then
    PACKAGE_NAME=$(basename "$REMOTE" .git)
else
    PACKAGE_NAME=$(basename "$(pwd)")
fi

log INFO "Building $PLUGIN_NAME $VERSION ($PLUGIN_GUID), $CONFIGURATION, $PROJECT_FILE"

if [[ "${2:-}" == "--clean" ]] || [[ -d "$OUTPUT_DIR" ]]; then
    log INFO "Cleaning previous builds"
    rm -rf "$OUTPUT_DIR"
    dotnet clean "$PROJECT_FILE" --configuration "$CONFIGURATION" --verbosity quiet
fi
mkdir -p "$OUTPUT_DIR"

dotnet restore "$PROJECT_FILE" --verbosity minimal || fail "Package restore failed"
# publish rather than build, so every dependency listed in artifacts lands in the output folder.
dotnet publish "$PROJECT_FILE" --configuration "$CONFIGURATION" --no-restore --verbosity minimal \
    -p:Version="$VERSION" || fail "Publish failed"

BUILD_DIR="$PROJECT/bin/$CONFIGURATION/$FRAMEWORK"
ZIP_NAME="$PACKAGE_NAME-$VERSION.zip"
ZIP_PATH="$OUTPUT_DIR/$ZIP_NAME"
TEMP_DIR="$OUTPUT_DIR/temp"
mkdir -p "$TEMP_DIR"

while IFS= read -r artifact; do
    [[ -f "$BUILD_DIR/$artifact" ]] || fail "Artifact not found: $BUILD_DIR/$artifact"
    cp "$BUILD_DIR/$artifact" "$TEMP_DIR/"
    log SUCCESS "Copied: $artifact"
done <<< "$ARTIFACTS"

# Bundle the plugin image AND a meta.json inside the package so the installed plugin icon
# (/Plugins/{id}/{ver}/Image) is served straight from disk with no dependency on the server downloading
# imageUrl at install time.
# meta.json needs "name": Jellyfin 12 groups discovered plugins by name, so every nameless manifest
# collapses into one empty-name entry and all but one of those plugins silently fails to load.
# meta.json "version" must be 4-part to match the assembly version the web UI uses in the image URL
# (.NET pads to 4 parts), or GetPlugin() returns null and the image 404s.
LOGO_SRC="$PROJECT/Assets/Logo.png"
[[ -f "$LOGO_SRC" ]] || fail "Plugin image not found: $LOGO_SRC"
cp "$LOGO_SRC" "$TEMP_DIR/Logo.png"

ASSEMBLIES=()
for f in "$TEMP_DIR"/*.dll; do
    [[ -f "$f" ]] && ASSEMBLIES+=("$(basename "$f")")
done

jq -n --indent 4 \
    --arg guid "$PLUGIN_GUID" \
    --arg name "$PLUGIN_NAME" \
    --arg version "$VERSION" \
    --arg targetAbi "$TARGET_ABI" \
    --arg timestamp "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" \
    '{guid: $guid, name: $name, version: $version, targetAbi: $targetAbi, timestamp: $timestamp,
      status: "Active", autoUpdate: true, imagePath: "Logo.png", assemblies: $ARGS.positional}' \
    --args ${ASSEMBLIES[@]+"${ASSEMBLIES[@]}"} > "$TEMP_DIR/meta.json"

command -v zip >/dev/null 2>&1 || fail "zip is required"
(cd "$TEMP_DIR" && zip -qr "../$ZIP_NAME" .)
rm -rf "$TEMP_DIR"

# The zip must hold the plugin DLL, every artifact, meta.json and the image, or servers install a
# package that cannot load.
CONTENTS=$(unzip -Z1 "$ZIP_PATH")
while IFS= read -r expected; do
    echo "$CONTENTS" | grep -qxF "$expected" || fail "$ZIP_NAME is missing $expected"
done <<< "$PROJECT.dll
$ARTIFACTS
meta.json
Logo.png"

if command -v md5sum >/dev/null 2>&1; then
    MD5=$(md5sum "$ZIP_PATH" | cut -d' ' -f1)
else
    MD5=$(md5 -q "$ZIP_PATH")
fi
echo "$MD5" > "$ZIP_PATH.md5"

echo
log SUCCESS "Package: $ZIP_PATH ($(du -h "$ZIP_PATH" | cut -f1))"
echo "  Plugin Name: $PLUGIN_NAME"
echo "  Version: $VERSION"
echo "  GUID: $PLUGIN_GUID"
echo "  MD5: $MD5"
unzip -l "$ZIP_PATH"
