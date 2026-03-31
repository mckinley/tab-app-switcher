#!/bin/bash
# Publish Safari extension to Mac App Store
# Usage: ./scripts/publish-safari.sh
#
# Required environment variables (from native/.env):
#   APPLE_ID                   - Your Apple ID email
#   APPLE_APP_SPECIFIC_PASSWORD - App-specific password from appleid.apple.com
#   APPLE_TEAM_ID               - Your Apple Developer Team ID
#
# Prerequisites:
#   - Xcode installed
#   - Apple Developer Program membership
#   - Run 'npm run build:safari && npm run convert:safari' first

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
EXTENSION_DIR="$(dirname "$SCRIPT_DIR")"
PROJECT_ROOT="$(dirname "$EXTENSION_DIR")"
APP_NAME="Tab Application Switcher"
XCODE_PROJECT="$PROJECT_ROOT/safari-extension/$APP_NAME/$APP_NAME.xcodeproj"
ARCHIVE_PATH="/tmp/TAS.xcarchive"
EXPORT_PATH="/tmp/TAS-export"
EXPORT_OPTIONS_PLIST="/tmp/TAS-export-options.plist"

# Load native .env for Apple credentials
NATIVE_ENV="$PROJECT_ROOT/native/.env"
if [ -f "$NATIVE_ENV" ]; then
  set -a
  source "$NATIVE_ENV"
  set +a
fi

# Validate required environment variables
if [ -z "$APPLE_ID" ]; then
  echo "Error: APPLE_ID not set"
  echo "Set in native/.env: APPLE_ID=you@example.com"
  exit 1
fi

if [ -z "$APPLE_APP_SPECIFIC_PASSWORD" ]; then
  echo "Error: APPLE_APP_SPECIFIC_PASSWORD not set"
  echo "Generate at: https://appleid.apple.com/ → App-Specific Passwords"
  echo "Set in native/.env: APPLE_APP_SPECIFIC_PASSWORD=xxxx-xxxx-xxxx-xxxx"
  exit 1
fi

if [ -z "$APPLE_TEAM_ID" ]; then
  echo "Error: APPLE_TEAM_ID not set"
  echo "Set in native/.env: APPLE_TEAM_ID=XXXXXXXXXX"
  exit 1
fi

# Check Xcode project exists
if [ ! -d "$XCODE_PROJECT" ]; then
  echo "Error: Xcode project not found at $XCODE_PROJECT"
  echo "Run first: npm run build:safari && npm run convert:safari"
  exit 1
fi

VERSION=$(node -p "require('$EXTENSION_DIR/package.json').version")
BUILD_NUMBER=$(node -p "require('$EXTENSION_DIR/package.json').build || 0")
BUNDLE_ID="app.tabswitcher.tab-application-switcher"

echo "Publishing Safari extension v$VERSION (build $BUILD_NUMBER) to Mac App Store..."

# Step 1: Archive
echo ""
echo "▶ Archiving..."
rm -rf "$ARCHIVE_PATH"
xcodebuild -project "$XCODE_PROJECT" \
  -scheme "$APP_NAME" \
  -configuration Release \
  -archivePath "$ARCHIVE_PATH" \
  archive \
  CODE_SIGN_STYLE=Automatic \
  DEVELOPMENT_TEAM="$APPLE_TEAM_ID" \
  2>&1 | grep -E "error:|warning:|ARCHIVE SUCCEEDED|ARCHIVE FAILED" || true

if [ ! -d "$ARCHIVE_PATH" ]; then
  echo "❌ Archive failed"
  exit 1
fi
echo "✅ Archive succeeded"

# Step 2: Export for App Store Connect
echo ""
echo "▶ Exporting for App Store Connect..."
rm -rf "$EXPORT_PATH"
cat > "$EXPORT_OPTIONS_PLIST" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>method</key>
  <string>app-store-connect</string>
  <key>teamID</key>
  <string>$APPLE_TEAM_ID</string>
  <key>uploadBitcode</key>
  <false/>
  <key>uploadSymbols</key>
  <true/>
</dict>
</plist>
EOF

xcodebuild -exportArchive \
  -archivePath "$ARCHIVE_PATH" \
  -exportPath "$EXPORT_PATH" \
  -exportOptionsPlist "$EXPORT_OPTIONS_PLIST" \
  2>&1 | grep -E "error:|EXPORT SUCCEEDED|EXPORT FAILED" || true

PKG_FILE="$EXPORT_PATH/$APP_NAME.pkg"
if [ ! -f "$PKG_FILE" ]; then
  echo "❌ Export failed"
  exit 1
fi
echo "✅ Export succeeded"

# Step 3: Upload to App Store Connect
echo ""
echo "▶ Uploading to App Store Connect..."
xcrun altool --upload-package "$PKG_FILE" \
  --type macos \
  --username "$APPLE_ID" \
  --app-password "$APPLE_APP_SPECIFIC_PASSWORD" \
  --team-id "$APPLE_TEAM_ID" \
  --bundle-id "$BUNDLE_ID" \
  --bundle-version "$BUILD_NUMBER" \
  --bundle-short-version-string "$VERSION" \
  2>&1

echo ""
echo "✅ Safari extension v$VERSION (build $BUILD_NUMBER) uploaded to App Store Connect"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Final step (manual — ~2 min):"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  1. Go to https://appstoreconnect.apple.com/"
echo "  2. Select 'Tab Application Switcher' → '+ Version'"
echo "  3. Enter version: $VERSION"
echo "  4. Select build $BUILD_NUMBER when it appears (may take a few minutes)"
echo "  5. Fill in 'What's New' and submit for review"
echo ""
