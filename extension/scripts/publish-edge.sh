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

RESPONSE_FILE=$(mktemp)
HEADERS_FILE=$(mktemp)
trap 'rm -f "$RESPONSE_FILE" "$HEADERS_FILE"' EXIT

# POSTs to the API; the response body goes to $RESPONSE_FILE and the headers to $HEADERS_FILE
post() {
  curl -s -o "$RESPONSE_FILE" -D "$HEADERS_FILE" -w "%{http_code}" \
    -H "Authorization: ApiKey $EDGE_API_KEY" \
    -H "X-ClientID: $EDGE_CLIENT_ID" \
    -X POST "$@"
}

# The operation an accepted request started, from the end of its Location header
operation_id() {
  awk 'tolower($1) == "location:" { print $2 }' "$HEADERS_FILE" | tr -d '\r' | sed 's|.*/||'
}

# Polls an operation until it succeeds (status 0) or fails (status 1), for up to 5 minutes
wait_for_operation() {
  local url="$1"
  local what="$2"
  local response status
  for _ in $(seq 1 60); do
    response=$(curl -s -H "Authorization: ApiKey $EDGE_API_KEY" -H "X-ClientID: $EDGE_CLIENT_ID" "$url")
    status=$(echo "$response" | grep -o '"status" *: *"[^"]*"' | head -n 1 | sed 's/.*"\([^"]*\)"$/\1/')
    case "$status" in
      Succeeded)
        return 0
        ;;
      Failed)
        echo "Error: $what failed"
        echo "$response"
        return 1
        ;;
    esac
    sleep 5
  done
  echo "Error: $what didn't finish within 5 minutes"
  echo "$response"
  return 1
}

# Upload the package, then wait for Edge to finish processing it
HTTP_CODE=$(post -H "Content-Type: application/zip" --data-binary "@$ZIP_FILE" \
  "$API_BASE/v1/products/$EDGE_PRODUCT_ID/submissions/draft/package")
if [ "$HTTP_CODE" != "202" ]; then
  echo "Error: Upload failed with status $HTTP_CODE"
  cat "$RESPONSE_FILE"
  echo ""
  if [ "$HTTP_CODE" = "404" ]; then
    echo "404 usually means the Product ID is incorrect."
    echo "Make sure you're using the GUID from 'Extension Identity', not the URL slug."
  elif [ "$HTTP_CODE" = "401" ] || [ "$HTTP_CODE" = "403" ]; then
    echo "$HTTP_CODE usually means the API key has expired. Make a new one in Partner Center →"
    echo "Microsoft Edge → Publish API and put it in extension/.env as EDGE_API_KEY."
  fi
  exit 1
fi
OPERATION_ID=$(operation_id)
echo "Upload accepted (operation $OPERATION_ID). Waiting for Edge to process the package..."
wait_for_operation "$API_BASE/v1/products/$EDGE_PRODUCT_ID/submissions/draft/package/operations/$OPERATION_ID" "Processing the package"
echo "Package processed."

# Submit the draft for review, then wait for Edge to accept the submission
echo "Submitting for review..."
HTTP_CODE=$(post -H "Content-Type: text/plain" -d "Automated publish via API" \
  "$API_BASE/v1/products/$EDGE_PRODUCT_ID/submissions")
if [ "$HTTP_CODE" != "202" ]; then
  echo "Error: Submitting failed with status $HTTP_CODE"
  cat "$RESPONSE_FILE"
  echo ""
  exit 1
fi
OPERATION_ID=$(operation_id)
if ! wait_for_operation "$API_BASE/v1/products/$EDGE_PRODUCT_ID/submissions/operations/$OPERATION_ID" "Submitting"; then
  echo "InProgressSubmission means an earlier version is still in review: wait for it, or cancel it in Partner Center."
  exit 1
fi

echo ""
echo "✅ Edge extension v$VERSION submitted for review"
echo "Check status at: https://partner.microsoft.com/dashboard/microsoftedge/overview"
