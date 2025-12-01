#!/bin/bash
# Convert Safari extension build to Xcode project
# Usage: ./scripts/convert-safari.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
EXTENSION_DIR="$(dirname "$SCRIPT_DIR")"
PROJECT_ROOT="$(dirname "$EXTENSION_DIR")"
OUTPUT_DIR="$EXTENSION_DIR/.output/safari-mv2"
XCODE_PROJECT_DIR="$PROJECT_ROOT/safari-extension"
APP_NAME="Tab Application Switcher"
BUNDLE_ID="app.tabswitcher.Tab-Application-Switcher"
EXTENSION_BUNDLE_ID="${BUNDLE_ID}.Extension"

# Check if Safari build exists
if [ ! -d "$OUTPUT_DIR" ]; then
  echo "Error: Safari build not found at $OUTPUT_DIR"
  echo "Run 'npm run build:safari' first"
  exit 1
fi

# Check for Xcode command line tools
if ! command -v xcrun &> /dev/null; then
  echo "Error: Xcode command line tools not found"
  echo "Install with: xcode-select --install"
  exit 1
fi

# Remove existing Xcode project if it exists
if [ -d "$XCODE_PROJECT_DIR" ]; then
  echo "Removing existing Xcode project..."
  rm -rf "$XCODE_PROJECT_DIR"
fi

echo "Converting Safari extension to Xcode project..."
echo "  Source: $OUTPUT_DIR"
echo "  Destination: $XCODE_PROJECT_DIR"

# Run the converter (macOS only - no iOS targets)
xcrun safari-web-extension-converter "$OUTPUT_DIR" \
  --project-location "$XCODE_PROJECT_DIR" \
  --app-name "$APP_NAME" \
  --bundle-identifier "$BUNDLE_ID" \
  --macos-only \
  --force \
  --no-open

# Fix bundle identifiers in the generated Xcode project
# The converter generates inconsistent casing, so we ensure the extension bundle ID is correct
PBXPROJ="$XCODE_PROJECT_DIR/$APP_NAME/$APP_NAME.xcodeproj/project.pbxproj"
if [ -f "$PBXPROJ" ]; then
  echo "Fixing bundle identifiers..."
  # Use sed to replace any variant of the extension bundle ID with the correct one
  sed -i '' "s/PRODUCT_BUNDLE_IDENTIFIER = \"[^\"]*\.Extension\";/PRODUCT_BUNDLE_IDENTIFIER = \"$EXTENSION_BUNDLE_ID\";/g" "$PBXPROJ"
  echo "  Extension bundle ID set to: $EXTENSION_BUNDLE_ID"
fi

echo ""
echo "✅ Safari Xcode project created at: $XCODE_PROJECT_DIR/$APP_NAME"
echo ""
echo "Next steps:"
echo "  1. Open the Xcode project:"
echo "     open \"$XCODE_PROJECT_DIR/$APP_NAME/$APP_NAME.xcodeproj\""
echo "  2. Select 'macOS (App)' target and 'My Mac' destination"
echo "  3. Select your Team in Signing & Capabilities for both macOS targets"
echo "  4. Press Cmd+R to build and run"
echo "  5. In Safari: Develop → Allow Unsigned Extensions"
echo "  6. In Safari: Settings → Extensions → Enable the extension"
