#!/bin/bash
# Publish extension to Microsoft Edge Add-ons
# Usage: ./scripts/publish-edge.sh
#
# Required environment variables:
#   EDGE_CLIENT_ID - Client ID from Partner Center
#   EDGE_API_KEY - API Key from Partner Center
#   EDGE_PRODUCT_ID - Your extension's product ID (GUID format, NOT the URL slug)
#
# To find your Product ID:
#   1. Go to https://partner.microsoft.com/dashboard/microsoftedge/
#   2. Click on your extension
#   3. Go to "Extension Identity" section
#   4. Copy the "Product ID" (it's a GUID like: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
EXTENSION_DIR="$(dirname "$SCRIPT_DIR")"

cd "$EXTENSION_DIR"

# Load environment variables
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

# Validate required environment variables
if [ -z "$EDGE_CLIENT_ID" ]; then
  echo "Error: EDGE_CLIENT_ID not set"
  echo "Get your Client ID from: https://partner.microsoft.com/dashboard/microsoftedge/ -> Publish API"
  exit 1
fi

if [ -z "$EDGE_API_KEY" ]; then
  echo "Error: EDGE_API_KEY not set"
  echo "Get your API Key from: https://partner.microsoft.com/dashboard/microsoftedge/ -> Publish API"
  exit 1
fi

if [ -z "$EDGE_PRODUCT_ID" ]; then
  echo "Error: EDGE_PRODUCT_ID not set"
  echo ""
  echo "To find your Product ID:"
  echo "  1. Go to https://partner.microsoft.com/dashboard/microsoftedge/"
  echo "  2. Click on your extension"
  echo "  3. Go to 'Extension Identity' section"
  echo "  4. Copy the 'Product ID' (it's a GUID like: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)"
  echo ""
  echo "Note: The Product ID is NOT the same as the URL slug (epfinbjjhhlpbfcdmdhnddbjebmbkjck)"
  exit 1
fi

API_BASE="https://api.addons.microsoftedge.microsoft.com"

# Build extension
echo "Building Edge extension..."
npm run build:edge

# Get version from package.json
VERSION=$(node -p "require('./package.json').version")
ZIP_FILE=".output/tab-application-switcher-${VERSION}-edge.zip"

# Create the extension zip
echo "Creating extension zip..."
cd .output/edge-mv3
zip -r "../tab-application-switcher-${VERSION}-edge.zip" . -x "*.DS_Store"
cd "$EXTENSION_DIR"

echo "Uploading to Edge Add-ons..."
echo "  Product ID: $EDGE_PRODUCT_ID"

# Upload the package
UPLOAD_RESPONSE=$(curl -s -w "\n%{http_code}" \
  -H "Authorization: ApiKey $EDGE_API_KEY" \
  -H "X-ClientID: $EDGE_CLIENT_ID" \
  -H "Content-Type: application/zip" \
  -X POST \
  --data-binary "@$ZIP_FILE" \
  "$API_BASE/v1/products/$EDGE_PRODUCT_ID/submissions/draft/package")

HTTP_CODE=$(echo "$UPLOAD_RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$UPLOAD_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" != "202" ]; then
  echo "Error: Upload failed with status $HTTP_CODE"
  echo "$RESPONSE_BODY"
  echo ""
  if [ "$HTTP_CODE" = "404" ]; then
    echo "404 usually means the Product ID is incorrect."
    echo "Make sure you're using the GUID from 'Extension Identity', not the URL slug."
  elif [ "$HTTP_CODE" = "401" ]; then
    echo "401 usually means the API credentials are invalid or expired."
  fi
  exit 1
fi

# Extract operation ID from response
OPERATION_ID=$(echo "$RESPONSE_BODY" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "Upload accepted. Operation ID: $OPERATION_ID"
echo "Waiting for processing..."
sleep 5

# Publish the submission
echo "Publishing submission..."
PUBLISH_RESPONSE=$(curl -s -w "\n%{http_code}" \
  -H "Authorization: ApiKey $EDGE_API_KEY" \
  -H "X-ClientID: $EDGE_CLIENT_ID" \
  -H "Content-Type: text/plain" \
  -X POST \
  -d "Automated publish via API" \
  "$API_BASE/v1/products/$EDGE_PRODUCT_ID/submissions")

HTTP_CODE=$(echo "$PUBLISH_RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$PUBLISH_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" != "202" ]; then
  echo "Error: Publish failed with status $HTTP_CODE"
  echo "$RESPONSE_BODY"
  exit 1
fi

echo ""
echo "✅ Edge extension submitted for review"
echo "Check status at: https://partner.microsoft.com/dashboard/microsoftedge/overview"

