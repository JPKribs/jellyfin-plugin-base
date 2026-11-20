#!/usr/bin/env bash
# Checks that a packed package holds every file the targets load, at the path they load it from, so a packing
# mistake fails here rather than in a plugin's build.
#
#   bash scripts/check-package.sh nupkg/JPKribs.Jellyfin.Base.12.4.0.nupkg
set -euo pipefail
PACKAGE="${1:?Name the .nupkg to check.}"
LISTING=$(unzip -Z1 "${PACKAGE}")
MISSING=0
for ENTRY in \
  build/JPKribs.Jellyfin.Base.targets \
  build/JPKribs.Jellyfin.Base.Translations.targets \
  tasks/net10.0/JPKribs.Jellyfin.Base.Tasks.dll \
  assets/jpkribs_shared.css \
  assets/jpkribs_shared.js \
  assets/jpkribs_shared.d.ts \
  templates/status.html \
  src/BaseTranslations.cs \
  src/TextCase.cs \
  strings/en-us.json \
  strings/jellyfin.json \
  jellyfin/source.json \
  jellyfin/LICENSE \
  jellyfin/web/en-us.json \
  jellyfin/server/en-us.json \
  LICENSE \
  README.md; do
  if ! grep -qx "${ENTRY}" <<< "${LISTING}"; then
    echo "Missing from ${PACKAGE}: ${ENTRY}"
    MISSING=1
  fi
done
# Every language source.json lists has its file.
SOURCE=$(unzip -p "${PACKAGE}" jellyfin/source.json)
for NAME in web server; do
  for CODE in $(node -e "process.stdout.write(JSON.parse(process.argv[1])[process.argv[2]].languages.join(' '))" "${SOURCE}" "${NAME}"); do
    if ! grep -qx "jellyfin/${NAME}/${CODE}.json" <<< "${LISTING}"; then
      echo "Missing from ${PACKAGE}: jellyfin/${NAME}/${CODE}.json"
      MISSING=1
    fi
  done
done
if [ "${MISSING}" -ne 0 ]; then
  exit 1
fi
echo "Package layout matches the targets: $(wc -l <<< "${LISTING}") files."
