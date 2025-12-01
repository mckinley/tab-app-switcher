#!/bin/bash
# Publish extension to Firefox Add-ons (AMO)
# Usage: ./scripts/publish-firefox.sh
#
# Required environment variables:
#   FIREFOX_API_KEY - JWT issuer from AMO
#   FIREFOX_API_SECRET - JWT secret from AMO

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
EXTENSION_DIR="$(dirname "$SCRIPT_DIR")"

cd "$EXTENSION_DIR"

# Load environment variables
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

# Validate required environment variables
if [ -z "$FIREFOX_API_KEY" ]; then
  echo "Error: FIREFOX_API_KEY not set"
  echo "Get your API key from: https://addons.mozilla.org/developers/addon/api/key/"
  exit 1
fi

if [ -z "$FIREFOX_API_SECRET" ]; then
  echo "Error: FIREFOX_API_SECRET not set"
  echo "Get your API secret from: https://addons.mozilla.org/developers/addon/api/key/"
  exit 1
fi

# Build and create source zip
echo "Building Firefox extension..."
npm run build:firefox

# Get version from package.json
VERSION=$(node -p "require('./package.json').version")
ZIP_FILE=".output/tab-application-switcher-${VERSION}-firefox.zip"
SOURCES_ZIP=".output/tab-application-switcher-${VERSION}-sources.zip"

# Create the extension zip
echo "Creating extension zip..."
cd .output/firefox-mv2
zip -r "../tab-application-switcher-${VERSION}-firefox.zip" . -x "*.DS_Store"
cd "$EXTENSION_DIR"

# Create sources zip (required by Firefox for review)
echo "Creating sources zip..."
zip -r "$SOURCES_ZIP" . \
  -x "*.git*" \
  -x "node_modules/*" \
  -x ".output/*" \
  -x "*.env" \
  -x ".wxt/*" \
  -x "*.DS_Store"

# Create AMO metadata file
# Categories: https://addons.mozilla.org/api/v5/addons/categories/
METADATA_FILE=".output/amo-metadata.json"
cat > "$METADATA_FILE" << 'EOF'
{
  "categories": {
    "firefox": ["tabs"]
  },
  "summary": {
    "en-US": "Switch between browser tabs like you switch between applications"
  },
  "homepage": "https://tabappswitcher.com",
  "support_url": "https://tabappswitcher.com",
  "version": {
    "license": "MIT"
  }
}
EOF

echo "Publishing to Firefox Add-ons..."
# Use timeout to prevent hanging while waiting for approval (which can take days)
# The submission completes quickly, but web-ext waits for approval by default
npx web-ext sign \
  --source-dir .output/firefox-mv2 \
  --channel listed \
  --api-key "$FIREFOX_API_KEY" \
  --api-secret "$FIREFOX_API_SECRET" \
  --upload-source-code "$SOURCES_ZIP" \
  --amo-metadata "$METADATA_FILE" \
  --timeout 120000 || true

echo ""
echo "✅ Firefox extension submitted for review"
echo "Note: Human review typically takes 1-2 days"
echo "Check status at: https://addons.mozilla.org/developers/addons"

