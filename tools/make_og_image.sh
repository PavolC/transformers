#!/usr/bin/env bash
# Regenerate the social card, public/og-image.png, from tools/og_card.html.
#
# The card is a 1200x630 PNG because that is the slot Open Graph and Twitter's
# summary_large_image both render, and it is a rendered HTML page rather than a
# hand-drawn image so that it stays made of the same tokens as the site: the
# accent, the monogram path, and the type roles are all copied from
# src/brand/. tools/check_brand.py asserts that the accent and the monogram in
# og_card.html still match brand.ts, so a rebrand cannot leave the card behind.
#
#     bash tools/make_og_image.sh
#
# Needs a Chromium. Set CHROME to point at one if it is somewhere unusual.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [ -z "${CHROME:-}" ]; then
  for candidate in \
    "$(command -v chromium || true)" \
    "$(command -v chromium-browser || true)" \
    "$(command -v google-chrome || true)" \
    /opt/pw-browsers/chromium-*/chrome-linux/chrome \
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
  do
    if [ -n "$candidate" ] && [ -x "$candidate" ]; then CHROME="$candidate"; break; fi
  done
fi

if [ -z "${CHROME:-}" ]; then
  echo "No Chromium found. Install one, or set CHROME to its path." >&2
  exit 1
fi

"$CHROME" --headless --disable-gpu --no-sandbox --hide-scrollbars \
  --force-device-scale-factor=1 --window-size=1200,630 \
  --screenshot="$ROOT/public/og-image.png" \
  "$ROOT/tools/og_card.html" 2>/dev/null

echo "Wrote public/og-image.png"
python3 "$ROOT/tools/check_brand.py"
