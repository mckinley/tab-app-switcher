#!/bin/bash
# Publish extension to all browser stores (Chrome, Firefox, Edge, Safari)
# Usage: ./scripts/publish-all.sh
#
# This script publishes to Chrome, Firefox, Edge, and Safari stores sequentially.
# Safari requires Apple credentials in native/.env (APPLE_ID, APPLE_APP_SPECIFIC_PASSWORD, APPLE_TEAM_ID).

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
EXTENSION_DIR="$(dirname "$SCRIPT_DIR")"

cd "$EXTENSION_DIR"

# Load environment variables
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

VERSION=$(node -p "require('./package.json').version")
echo "======================================"
echo "Publishing Tab Application Switcher v$VERSION"
echo "======================================"
echo ""

# Track results
CHROME_STATUS="⏭️ Skipped"
FIREFOX_STATUS="⏭️ Skipped"
EDGE_STATUS="⏭️ Skipped"
SAFARI_STATUS="⏭️ Skipped"

# Load native .env for Safari/Apple credentials
NATIVE_ENV="$(dirname "$EXTENSION_DIR")/native/.env"
if [ -f "$NATIVE_ENV" ]; then
  set -a
  source "$NATIVE_ENV"
  set +a
fi

# Chrome Web Store
echo "▶ Chrome Web Store"
echo "-------------------"
if [ -n "$CHROME_CLIENT_ID" ] && [ -n "$CHROME_CLIENT_SECRET" ] && [ -n "$CHROME_REFRESH_TOKEN" ]; then
  npm run build
  npm run zip
  if wxt submit --chrome-zip ".output/tab-application-switcher-${VERSION}-chrome.zip"; then
    CHROME_STATUS="✅ Submitted"
  else
    CHROME_STATUS="❌ Failed"
  fi
else
  echo "Skipping: Chrome credentials not configured"
  echo "Required: CHROME_CLIENT_ID, CHROME_CLIENT_SECRET, CHROME_REFRESH_TOKEN"
fi
echo ""

# Firefox Add-ons
echo "▶ Firefox Add-ons"
echo "-----------------"
if [ -n "$FIREFOX_API_KEY" ] && [ -n "$FIREFOX_API_SECRET" ]; then
  if "$SCRIPT_DIR/publish-firefox.sh"; then
    FIREFOX_STATUS="✅ Submitted"
  else
    FIREFOX_STATUS="❌ Failed"
  fi
else
  echo "Skipping: Firefox credentials not configured"
  echo "Required: FIREFOX_API_KEY, FIREFOX_API_SECRET"
fi
echo ""

# Edge Add-ons
echo "▶ Edge Add-ons"
echo "--------------"
if [ -n "$EDGE_CLIENT_ID" ] && [ -n "$EDGE_API_KEY" ] && [ -n "$EDGE_PRODUCT_ID" ]; then
  if "$SCRIPT_DIR/publish-edge.sh"; then
    EDGE_STATUS="✅ Submitted"
  else
    EDGE_STATUS="❌ Failed"
  fi
else
  echo "Skipping: Edge credentials not configured"
  echo "Required: EDGE_CLIENT_ID, EDGE_API_KEY, EDGE_PRODUCT_ID"
fi
echo ""

# Safari (Mac App Store)
echo "▶ Safari (Mac App Store)"
echo "------------------------"
if [ -n "$APPLE_ID" ] && [ -n "$APPLE_APP_SPECIFIC_PASSWORD" ] && [ -n "$APPLE_TEAM_ID" ]; then
  npm run build:safari
  npm run convert:safari
  if "$SCRIPT_DIR/publish-safari.sh"; then
    SAFARI_STATUS="✅ Uploaded"
  else
    SAFARI_STATUS="❌ Failed"
  fi
else
  echo "Skipping: Apple credentials not configured"
  echo "Required in native/.env: APPLE_ID, APPLE_APP_SPECIFIC_PASSWORD, APPLE_TEAM_ID"
fi
echo ""

# Summary
echo "======================================"
echo "Publishing Summary"
echo "======================================"
echo "Chrome:  $CHROME_STATUS"
echo "Firefox: $FIREFOX_STATUS"
echo "Edge:    $EDGE_STATUS"
echo "Safari:  $SAFARI_STATUS"
echo ""
if [ "$SAFARI_STATUS" = "✅ Uploaded" ]; then
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "Safari final step: submit for review in App Store Connect"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "  https://appstoreconnect.apple.com/"
  echo "  → Tab Application Switcher → + Version → select build → Submit for Review"
  echo ""
fi

