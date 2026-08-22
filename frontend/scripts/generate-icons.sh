#!/usr/bin/env bash
# Regenerates PWA + app icons. Pass a square PNG/SVG, or omit to use scripts/icon-source.svg
# Usage: ./scripts/generate-icons.sh [path/to/icon.png|icon.svg]
set -euo pipefail

cd "$(dirname "$0")/.."
DEFAULT="scripts/icon-source.png"
[ -e "$DEFAULT" ] || DEFAULT="scripts/icon-source.svg"
SRC="${1:-$DEFAULT}"
[ -e "$SRC" ] || { echo "No such file: $SRC" >&2; exit 1; }

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
MASTER="$TMP/icon-1024.png"

grab() {
  cp "$1" "$2" 2>/dev/null && return 0
  cat >&2 <<MSG
Error: cannot read $1

The file exists but macOS refused to open it. This is normal for ~/Downloads
and ~/Desktop when the terminal lacks Files & Folders access.

Fix either way:
  - Move the file into this repo using Finder, then pass the new path, or
  - System Settings > Privacy & Security > Full Disk Access > add your
    terminal / VS Code, then restart it.
MSG
  exit 1
}

case "$SRC" in
  *.svg)
    CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
    [ -x "$CHROME" ] || { echo "Chrome not found; export a PNG instead and pass it in." >&2; exit 1; }
    grab "$SRC" "$TMP/source.svg"
    cat > "$TMP/icon.html" <<HTML
<!doctype html><meta charset="utf-8">
<style>html,body{margin:0;padding:0;width:1024px;height:1024px;overflow:hidden}</style>
<img src="source.svg" width="1024" height="1024">
HTML
    "$CHROME" --headless --disable-gpu --hide-scrollbars \
      --screenshot="$MASTER" --window-size=1024,1024 "file://$TMP/icon.html" 2>/dev/null
    ;;
  *)
    grab "$SRC" "$MASTER"
    W=$(sips -g pixelWidth "$MASTER" 2>/dev/null | awk '/pixelWidth/{print $2}')
    H=$(sips -g pixelHeight "$MASTER" 2>/dev/null | awk '/pixelHeight/{print $2}')
    case "${W:-}${H:-}" in
      ''|*[!0-9]*) echo "Error: $SRC is not a readable image (sips could not size it)." >&2; exit 1 ;;
    esac
    [ "$W" = "$H" ] || echo "Warning: source is ${W}x${H}, not square - it will be squashed." >&2
    [ "$W" -ge 512 ] || echo "Warning: source is only ${W}px wide; 1024x1024 recommended." >&2
    sips -z 1024 1024 "$MASTER" >/dev/null
    ;;
esac

mkdir -p public/icons
while read -r out size; do
  cp "$MASTER" "$out"
  sips -z "$size" "$size" "$out" >/dev/null
done <<'SIZES'
public/icons/icon-512.png 512
public/icons/icon-192.png 192
public/icons/apple-touch-icon.png 180
assets/images/icon.png 1024
assets/images/favicon.png 48
SIZES

echo "Icons regenerated from $SRC"
