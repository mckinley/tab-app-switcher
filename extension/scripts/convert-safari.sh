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
BUNDLE_ID="app.tabswitcher.tab-application-switcher"

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

# Run the converter
xcrun safari-web-extension-converter "$OUTPUT_DIR" \
  --project-location "$XCODE_PROJECT_DIR" \
  --app-name "$APP_NAME" \
  --bundle-identifier "$BUNDLE_ID" \
  --force \
  --no-open

echo ""
echo "✅ Safari Xcode project created at: $XCODE_PROJECT_DIR"
echo ""
echo "Next steps:"
echo "  1. Open $XCODE_PROJECT_DIR/$APP_NAME/$APP_NAME.xcodeproj in Xcode"
echo "  2. Select your Team in Signing & Capabilities"
echo "  3. Build and run the app"
echo "  4. Enable the extension in Safari → Settings → Extensions"

