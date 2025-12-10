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
EXTENSION_BUNDLE_ID="${BUNDLE_ID}.Extension"
TEMPLATES_DIR="$SCRIPT_DIR/safari-app-templates"

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
# The converter generates incorrect casing, so we fix both app and extension bundle IDs
PBXPROJ="$XCODE_PROJECT_DIR/$APP_NAME/$APP_NAME.xcodeproj/project.pbxproj"
if [ -f "$PBXPROJ" ]; then
  echo "Fixing bundle identifiers..."
  # Fix extension bundle ID
  sed -i '' "s/PRODUCT_BUNDLE_IDENTIFIER = \"[^\"]*\.Extension\";/PRODUCT_BUNDLE_IDENTIFIER = \"$EXTENSION_BUNDLE_ID\";/g" "$PBXPROJ"
  # Fix app bundle ID (match any case variant of Tab-Application-Switcher)
  sed -i '' "s/PRODUCT_BUNDLE_IDENTIFIER = \"app\.tabswitcher\.[Tt]ab-[Aa]pplication-[Ss]witcher\";/PRODUCT_BUNDLE_IDENTIFIER = \"$BUNDLE_ID\";/g" "$PBXPROJ"
  echo "  App bundle ID set to: $BUNDLE_ID"
  echo "  Extension bundle ID set to: $EXTENSION_BUNDLE_ID"
fi

# Set encryption compliance (no custom encryption, only Apple's HTTPS)
APP_INFO_PLIST="$XCODE_PROJECT_DIR/$APP_NAME/$APP_NAME/Info.plist"
if [ -f "$APP_INFO_PLIST" ]; then
  echo "Setting export compliance..."
  /usr/libexec/PlistBuddy -c "Add :ITSAppUsesNonExemptEncryption bool false" "$APP_INFO_PLIST" 2>/dev/null || \
  /usr/libexec/PlistBuddy -c "Set :ITSAppUsesNonExemptEncryption false" "$APP_INFO_PLIST"
fi

# Generate app icon from source icon
ICON_SOURCE="$PROJECT_ROOT/resources/images/Full.png"
APPICONSET="$XCODE_PROJECT_DIR/$APP_NAME/$APP_NAME/Assets.xcassets/AppIcon.appiconset"
if [ -f "$ICON_SOURCE" ] && [ -d "$APPICONSET" ]; then
  echo "Generating app icons..."
  # Remove old placeholder icons from the converter
  rm -f "$APPICONSET"/*.png
  # macOS requires these sizes: 16, 32, 128, 256, 512 (plus @2x versions)
  sips -z 16 16 "$ICON_SOURCE" --out "$APPICONSET/icon_16x16.png" > /dev/null
  sips -z 32 32 "$ICON_SOURCE" --out "$APPICONSET/icon_16x16@2x.png" > /dev/null
  sips -z 32 32 "$ICON_SOURCE" --out "$APPICONSET/icon_32x32.png" > /dev/null
  sips -z 64 64 "$ICON_SOURCE" --out "$APPICONSET/icon_32x32@2x.png" > /dev/null
  sips -z 128 128 "$ICON_SOURCE" --out "$APPICONSET/icon_128x128.png" > /dev/null
  sips -z 256 256 "$ICON_SOURCE" --out "$APPICONSET/icon_128x128@2x.png" > /dev/null
  sips -z 256 256 "$ICON_SOURCE" --out "$APPICONSET/icon_256x256.png" > /dev/null
  sips -z 512 512 "$ICON_SOURCE" --out "$APPICONSET/icon_256x256@2x.png" > /dev/null
  sips -z 512 512 "$ICON_SOURCE" --out "$APPICONSET/icon_512x512.png" > /dev/null
  cp "$ICON_SOURCE" "$APPICONSET/icon_512x512@2x.png"
  # Update Contents.json with correct filenames
  cat > "$APPICONSET/Contents.json" << 'EOF'
{
  "images" : [
    { "filename" : "icon_16x16.png", "idiom" : "mac", "scale" : "1x", "size" : "16x16" },
    { "filename" : "icon_16x16@2x.png", "idiom" : "mac", "scale" : "2x", "size" : "16x16" },
    { "filename" : "icon_32x32.png", "idiom" : "mac", "scale" : "1x", "size" : "32x32" },
    { "filename" : "icon_32x32@2x.png", "idiom" : "mac", "scale" : "2x", "size" : "32x32" },
    { "filename" : "icon_128x128.png", "idiom" : "mac", "scale" : "1x", "size" : "128x128" },
    { "filename" : "icon_128x128@2x.png", "idiom" : "mac", "scale" : "2x", "size" : "128x128" },
    { "filename" : "icon_256x256.png", "idiom" : "mac", "scale" : "1x", "size" : "256x256" },
    { "filename" : "icon_256x256@2x.png", "idiom" : "mac", "scale" : "2x", "size" : "256x256" },
    { "filename" : "icon_512x512.png", "idiom" : "mac", "scale" : "1x", "size" : "512x512" },
    { "filename" : "icon_512x512@2x.png", "idiom" : "mac", "scale" : "2x", "size" : "512x512" }
  ],
  "info" : { "author" : "xcode", "version" : 1 }
}
EOF
  echo "  App icons generated"
fi

# Copy custom helper app templates (styled HTML/CSS/JS for the macOS app)
APP_RESOURCES_DIR="$XCODE_PROJECT_DIR/$APP_NAME/$APP_NAME/Resources"
if [ -d "$TEMPLATES_DIR" ] && [ -d "$APP_RESOURCES_DIR" ]; then
  echo "Copying custom app templates..."
  cp "$TEMPLATES_DIR/Style.css" "$APP_RESOURCES_DIR/Style.css"
  cp "$TEMPLATES_DIR/Script.js" "$APP_RESOURCES_DIR/Script.js"
  cp "$TEMPLATES_DIR/Main.html" "$APP_RESOURCES_DIR/Base.lproj/Main.html"
  echo "  App templates installed"
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
