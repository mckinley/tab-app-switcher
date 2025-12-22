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

# Get version from package.json
VERSION=$(node -p "require('$EXTENSION_DIR/package.json').version")
# Build number from package.json "build" field, or fall back to patch version
BUILD_NUMBER=$(node -p "require('$EXTENSION_DIR/package.json').build || 0")
if [ "$BUILD_NUMBER" = "0" ] || [ "$BUILD_NUMBER" = "undefined" ]; then
  BUILD_NUMBER=$(echo "$VERSION" | sed 's/.*\.//')
fi
# Ensure BUILD_NUMBER is at least 1
if [ "$BUILD_NUMBER" -lt 1 ] 2>/dev/null; then
  BUILD_NUMBER=1
fi

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

# Config file for persisting settings across regenerations
SAFARI_CONFIG="$EXTENSION_DIR/.safari-config"

# Load saved team ID from config file (persists across project regenerations)
SAVED_TEAM_ID=""
if [ -f "$SAFARI_CONFIG" ]; then
  SAVED_TEAM_ID=$(grep '^TEAM_ID=' "$SAFARI_CONFIG" | cut -d= -f2)
fi

# Also check existing project for team ID (in case config doesn't exist)
PBXPROJ="$XCODE_PROJECT_DIR/$APP_NAME/$APP_NAME.xcodeproj/project.pbxproj"
if [ -z "$SAVED_TEAM_ID" ] && [ -f "$PBXPROJ" ]; then
  SAVED_TEAM_ID=$(grep -m1 'DEVELOPMENT_TEAM = ' "$PBXPROJ" | sed 's/.*DEVELOPMENT_TEAM = \([^;]*\);.*/\1/' | tr -d ' "')
  if [ -n "$SAVED_TEAM_ID" ] && [ "$SAVED_TEAM_ID" != '""' ]; then
    # Save to config for next time
    echo "TEAM_ID=$SAVED_TEAM_ID" > "$SAFARI_CONFIG"
  else
    SAVED_TEAM_ID=""
  fi
fi

if [ -n "$SAVED_TEAM_ID" ]; then
  echo "Using development team: $SAVED_TEAM_ID"
fi

# App category for Mac App Store (utilities category)
APP_CATEGORY="public.app-category.utilities"

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

# Fix bundle identifiers and set version in the generated Xcode project
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

  # Set version number in build settings (Xcode's General tab shows these, not Info.plist values)
  echo "Setting version in build settings..."
  sed -i '' "s/MARKETING_VERSION = [^;]*;/MARKETING_VERSION = $VERSION;/g" "$PBXPROJ"
  sed -i '' "s/CURRENT_PROJECT_VERSION = [^;]*;/CURRENT_PROJECT_VERSION = $BUILD_NUMBER;/g" "$PBXPROJ"
  echo "  Version: $VERSION (build $BUILD_NUMBER)"

  # Set development team if we have one saved
  if [ -n "$SAVED_TEAM_ID" ]; then
    echo "Setting development team..."
    # First try to replace existing DEVELOPMENT_TEAM lines
    if grep -q 'DEVELOPMENT_TEAM = ' "$PBXPROJ"; then
      sed -i '' "s/DEVELOPMENT_TEAM = [^;]*;/DEVELOPMENT_TEAM = $SAVED_TEAM_ID;/g" "$PBXPROJ"
    else
      # If no DEVELOPMENT_TEAM exists, add it after each PRODUCT_BUNDLE_IDENTIFIER line
      sed -i '' "/PRODUCT_BUNDLE_IDENTIFIER = /a\\
				DEVELOPMENT_TEAM = $SAVED_TEAM_ID;
" "$PBXPROJ"
    fi
    # Save to config for future runs
    echo "TEAM_ID=$SAVED_TEAM_ID" > "$SAFARI_CONFIG"
    echo "  Team: $SAVED_TEAM_ID"
  fi

  # Set app category for Mac App Store
  echo "Setting app category..."
  # Add INFOPLIST_KEY_LSApplicationCategoryType after each MARKETING_VERSION line
  sed -i '' "/MARKETING_VERSION = /a\\
				INFOPLIST_KEY_LSApplicationCategoryType = \"$APP_CATEGORY\";
" "$PBXPROJ"
  echo "  Category: $APP_CATEGORY"
fi

# Set encryption compliance and version in Info.plist
APP_INFO_PLIST="$XCODE_PROJECT_DIR/$APP_NAME/$APP_NAME/Info.plist"
EXTENSION_INFO_PLIST="$XCODE_PROJECT_DIR/$APP_NAME/$APP_NAME Extension/Info.plist"

# Helper function to set plist value (Add if missing, Set if exists)
set_plist_value() {
  local plist="$1"
  local key="$2"
  local type="$3"
  local value="$4"
  /usr/libexec/PlistBuddy -c "Add :$key $type $value" "$plist" 2>/dev/null || \
  /usr/libexec/PlistBuddy -c "Set :$key $value" "$plist"
}

if [ -f "$APP_INFO_PLIST" ]; then
  echo "Configuring app Info.plist..."

  # Export compliance (no custom encryption, only Apple's HTTPS)
  set_plist_value "$APP_INFO_PLIST" "ITSAppUsesNonExemptEncryption" "bool" "false"

  # Set version (CFBundleShortVersionString = marketing version, CFBundleVersion = build number)
  set_plist_value "$APP_INFO_PLIST" "CFBundleShortVersionString" "string" "$VERSION"
  set_plist_value "$APP_INFO_PLIST" "CFBundleVersion" "string" "$VERSION"
  echo "  App version set to: $VERSION"
fi

# Set version in extension Info.plist
if [ -f "$EXTENSION_INFO_PLIST" ]; then
  echo "Configuring extension Info.plist..."
  set_plist_value "$EXTENSION_INFO_PLIST" "CFBundleShortVersionString" "string" "$VERSION"
  set_plist_value "$EXTENSION_INFO_PLIST" "CFBundleVersion" "string" "$VERSION"
  echo "  Extension version set to: $VERSION"
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

# Output summary and instructions
echo ""
echo "✅ Safari Xcode project ready"
echo "   Version: $VERSION (build $BUILD_NUMBER)"
if [ -n "$SAVED_TEAM_ID" ]; then
  echo "   Team: $SAVED_TEAM_ID (saved)"
else
  echo "   Team: Not set (first time setup required)"
fi
echo ""
echo "Open project: open \"$XCODE_PROJECT_DIR/$APP_NAME/$APP_NAME.xcodeproj\""
echo ""

# Check if team needs to be set
if [ -z "$SAVED_TEAM_ID" ]; then
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "FIRST TIME SETUP: Set your Apple Developer Team"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "  1. Open the Xcode project"
  echo "  2. Select project in navigator (blue icon, top-left)"
  echo "  3. For EACH target (app and extension):"
  echo "     • Click target under TARGETS"
  echo "     • Go to Signing & Capabilities tab"
  echo "     • Set Team to your Apple Developer account"
  echo "  4. Run this script again to save your team for future builds"
  echo ""
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "DEVELOPMENT"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  1. Open the Xcode project"
echo "  2. Press Cmd+R to run"
echo "  3. In Safari: Settings → Extensions → Enable 'Tab Application Switcher'"
echo ""
echo "  If Safari says unsigned: Develop menu → Allow Unsigned Extensions"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "PUBLISHING"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  Before publishing:"
echo "    • Run: npm run release <patch|minor|major> (auto-increments build number)"
echo "    • Then: npm run build:safari && npm run convert:safari"
echo ""
echo "  In Xcode:"
echo "    1. Product → Archive"
echo "    2. Distribute App → App Store Connect → Upload"
echo ""
echo "  In App Store Connect (appstoreconnect.apple.com):"
echo "    1. Select the app → new version (or + Version)"
echo "    2. Fill in 'What's New', select the build"
echo "    3. Submit for Review"
echo ""
