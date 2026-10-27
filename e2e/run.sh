#!/usr/bin/env bash
# Runs the end-to-end suite. On Linux it starts a virtual X display (Xvfb) with a window
# manager (openbox), so windows get focus the way they do on a desktop and xdotool can send
# real key presses. Extra arguments go to `playwright test`.
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
cd "$here"

if [[ "$(uname)" == "Linux" && -z "${TAS_E2E_DISPLAY_READY:-}" ]]; then
  exec env TAS_E2E_DISPLAY_READY=1 xvfb-run -a -s "-screen 0 1600x1000x24" "$here/run.sh" "$@"
fi

if [[ -n "${TAS_E2E_DISPLAY_READY:-}" ]] && command -v openbox >/dev/null; then
  openbox --config-file "$here/openbox-rc.xml" >/dev/null 2>&1 &
  wm=$!
  trap 'kill $wm 2>/dev/null || true' EXIT
  sleep 1
fi

npx playwright test "$@"
