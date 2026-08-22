#!/usr/bin/env bash
# Regenerates PWA + app icons from scripts/icon-source.svg
set -euo pipefail

cd "$(dirname "$0")/.."
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

cat > "$TMP/icon.html" <<HTML
<!doctype html><meta charset="utf-8">
<style>html,body{margin:0;padding:0;width:1024px;height:1024px;overflow:hidden}</style>
<img src="icon-source.svg" width="1024" height="1024">
HTML
cp scripts/icon-source.svg "$TMP/icon-source.svg"

"$CHROME" --headless --disable-gpu --hide-scrollbars \
  --screenshot="$TMP/icon-1024.png" --window-size=1024,1024 \
  "file://$TMP/icon.html" 2>/dev/null

mkdir -p public/icons
for spec in "public/icons/icon-512.png 512" \
            "public/icons/icon-192.png 192" \
            "public/icons/apple-touch-icon.png 180" \
            "assets/images/icon.png 1024" \
            "assets/images/favicon.png 48"; do
  set -- $spec
  cp "$TMP/icon-1024.png" "$1"
  sips -z "$2" "$2" "$1" >/dev/null
done

echo "Icons regenerated from scripts/icon-source.svg"
