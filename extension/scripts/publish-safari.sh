#!/bin/bash
# Publish Safari extension to Mac App Store
# Usage: ./scripts/publish-safari.sh
#
# Archives the Xcode project, exports it for the Mac App Store, uploads it to App Store Connect
# and, with an App Store Connect API key, submits it for App Review (scripts/submit-safari.mjs).
#
# Environment variables (from native/.env on a Mac, repository secrets in the Release workflow):
#   APPLE_TEAM_ID               - Your Apple Developer Team ID
#   ASC_KEY_ID, ASC_ISSUER_ID   - App Store Connect API key (Users and Access → Integrations),
#   ASC_KEY_PATH or ASC_KEY_P8    with the .p8 file's path or contents. Signs, uploads and submits.
#   APPLE_ID, APPLE_APP_SPECIFIC_PASSWORD
#                               - Without the API key: uploads with your Apple ID instead, and
#                                 the submission is left to you in App Store Connect
#   SAFARI_ARCHIVE_SIGNING=adhoc - Sign the archive "to run locally" so a Mac without a
#                                 development certificate (CI) can build it; the export signs it
#                                 for the App Store with Apple's cloud-managed certificates
#   SAFARI_SKIP_UPLOAD=1        - Stop after the export (the Release workflow's dry run)
#
# Prerequisites:
#   - Xcode installed. Without the API key, signed in to the Apple Developer account (Xcode →
#     Settings → Accounts). -allowProvisioningUpdates lets it create or download the distribution
#     certificates and profiles it signs with, so they don't need to be in the keychain beforehand.
#   - Apple Developer Program membership
#   - Run 'npm run build:safari && npm run convert:safari' first

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
EXTENSION_DIR="$(dirname "$SCRIPT_DIR")"
PROJECT_ROOT="$(dirname "$EXTENSION_DIR")"
APP_NAME="Tab Application Switcher"
XCODE_PROJECT="$PROJECT_ROOT/safari-extension/$APP_NAME/$APP_NAME.xcodeproj"
WORK_DIR="$(mktemp -d)"
trap 'rm -rf "$WORK_DIR"' EXIT
ARCHIVE_PATH="$WORK_DIR/TAS.xcarchive"
EXPORT_PATH="$WORK_DIR/TAS-export"
EXPORT_OPTIONS_PLIST="$WORK_DIR/TAS-export-options.plist"

# Load native .env for Apple credentials, without overriding what's already set
NATIVE_ENV="$PROJECT_ROOT/native/.env"
if [ -f "$NATIVE_ENV" ]; then
  while IFS='=' read -r name value; do
    if [ -n "$name" ] && [ -z "${!name}" ]; then
      value="${value%\"}"
      value="${value#\"}"
      export "$name=$value"
    fi
  done < <(grep -E '^[A-Z0-9_]+=' "$NATIVE_ENV")
fi

if [ -z "$APPLE_TEAM_ID" ]; then
  echo "Error: APPLE_TEAM_ID not set"
  echo "Set in native/.env: APPLE_TEAM_ID=XXXXXXXXXX"
  exit 1
fi

# The App Store Connect API key, written where xcodebuild and altool look for it
AUTH_FLAGS=()
if [ -n "$ASC_KEY_ID" ] && [ -n "$ASC_ISSUER_ID" ] && { [ -n "$ASC_KEY_P8" ] || [ -n "$ASC_KEY_PATH" ]; }; then
  mkdir -p "$WORK_DIR/private_keys"
  KEY_FILE="$WORK_DIR/private_keys/AuthKey_$ASC_KEY_ID.p8"
  if [ -n "$ASC_KEY_P8" ]; then
    printf '%s\n' "$ASC_KEY_P8" > "$KEY_FILE"
  else
    cp "${ASC_KEY_PATH/#\~/$HOME}" "$KEY_FILE"
  fi
  AUTH_FLAGS=(-authenticationKeyPath "$KEY_FILE" -authenticationKeyID "$ASC_KEY_ID" -authenticationKeyIssuerID "$ASC_ISSUER_ID")
elif [ -z "$SAFARI_SKIP_UPLOAD" ] && { [ -z "$APPLE_ID" ] || [ -z "$APPLE_APP_SPECIFIC_PASSWORD" ]; }; then
  echo "Error: no App Store Connect API key (ASC_KEY_ID, ASC_ISSUER_ID, ASC_KEY_PATH) and no Apple ID"
  echo "(APPLE_ID, APPLE_APP_SPECIFIC_PASSWORD) to upload with. Set one in native/.env."
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
if [ "$SAFARI_ARCHIVE_SIGNING" = "adhoc" ]; then
  SIGNING=(CODE_SIGN_STYLE=Manual CODE_SIGN_IDENTITY=- PROVISIONING_PROFILE_SPECIFIER=)
else
  SIGNING=(-allowProvisioningUpdates "${AUTH_FLAGS[@]}" CODE_SIGN_STYLE=Automatic)
fi
xcodebuild -project "$XCODE_PROJECT" \
  -scheme "$APP_NAME" \
  -configuration Release \
  -archivePath "$ARCHIVE_PATH" \
  archive \
  "${SIGNING[@]}" \
  DEVELOPMENT_TEAM="$APPLE_TEAM_ID" \
  2>&1 | grep -E "error:|warning:|ARCHIVE SUCCEEDED|ARCHIVE FAILED" || true

if [ ! -d "$ARCHIVE_PATH" ]; then
  echo "❌ Archive failed"
  exit 1
fi
echo "✅ Archive succeeded"

if [ -n "$SAFARI_SKIP_UPLOAD" ] && [ ${#AUTH_FLAGS[@]} -eq 0 ] && [ -z "$APPLE_ID" ]; then
  echo "No Apple credentials, so stopping before the export (it needs them to sign)."
  exit 0
fi

# Step 2: Export for App Store Connect
echo ""
echo "▶ Exporting for App Store Connect..."
cat > "$EXPORT_OPTIONS_PLIST" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>method</key>
  <string>app-store-connect</string>
  <key>signingStyle</key>
  <string>automatic</string>
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
  -allowProvisioningUpdates \
  "${AUTH_FLAGS[@]}" \
  2>&1 | grep -E "error:|EXPORT SUCCEEDED|EXPORT FAILED" || true

PKG_FILE="$EXPORT_PATH/$APP_NAME.pkg"
if [ ! -f "$PKG_FILE" ]; then
  echo "❌ Export failed"
  exit 1
fi
echo "✅ Export succeeded"

if [ -n "$SAFARI_SKIP_UPLOAD" ]; then
  echo "Stopping before the upload (SAFARI_SKIP_UPLOAD)."
  exit 0
fi

# Step 3: Upload to App Store Connect
echo ""
echo "▶ Uploading to App Store Connect..."
if [ ${#AUTH_FLAGS[@]} -gt 0 ]; then
  # altool finds the key in ./private_keys
  CREDENTIALS=(--apiKey "$ASC_KEY_ID" --apiIssuer "$ASC_ISSUER_ID")
else
  CREDENTIALS=(--username "$APPLE_ID" --app-password "$APPLE_APP_SPECIFIC_PASSWORD")
fi
(cd "$WORK_DIR" && xcrun altool --upload-package "$PKG_FILE" \
  --type macos \
  "${CREDENTIALS[@]}" \
  --team-id "$APPLE_TEAM_ID" \
  --bundle-id "$BUNDLE_ID" \
  --bundle-version "$BUILD_NUMBER" \
  --bundle-short-version-string "$VERSION" \
  2>&1)

echo ""
echo "✅ Safari extension v$VERSION (build $BUILD_NUMBER) uploaded to App Store Connect"

# Step 4: Submit for App Review
if [ ${#AUTH_FLAGS[@]} -gt 0 ]; then
  echo ""
  echo "▶ Submitting for App Review..."
  node "$PROJECT_ROOT/scripts/submit-safari.mjs"
  exit 0
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Final step (manual, about 5 min): submit it for review"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  In https://appstoreconnect.apple.com/ add macOS version $VERSION, pick build $BUILD_NUMBER"
echo "  once it has processed, and submit it. Every field it asks for, with text to paste:"
echo "  resources/app-store-connect.md"
echo "  (With an App Store Connect API key in native/.env, this step is done for you.)"
echo ""
