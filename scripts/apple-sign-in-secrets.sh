#!/bin/bash
# Turn on Sign in with Apple on tabappswitcher.com: set the site Worker's secrets from the
# Sign in with Apple key. The sign-in pages offer Apple as soon as all four secrets are set.
#
#   ./scripts/apple-sign-in-secrets.sh ~/Downloads/AuthKey_ABC123DEFG.p8 com.tabappswitcher.web
#
# The first argument is the key's .p8 file (its name has the key ID), the second the Services ID.
# The team ID comes from APPLE_TEAM_ID in native/.env. Setting them up in the Apple Developer
# account is in site/README.md → Sign in with Apple. Only the secrets' names are printed.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
KEY_FILE="${1:-}"
SERVICES_ID="${2:-}"

if [ ! -f "$KEY_FILE" ] || [ -z "$SERVICES_ID" ]; then
  echo "Usage: $0 <AuthKey_KEYID.p8> <Services ID>"
  exit 1
fi

KEY_ID="$(basename "$KEY_FILE" | sed -nE 's/^AuthKey_([A-Z0-9]{10})\.p8$/\1/p')"
if [ -z "$KEY_ID" ]; then
  echo "❌ Expected the key file Apple downloads, named AuthKey_<key ID>.p8"
  exit 1
fi
if ! grep -q "BEGIN PRIVATE KEY" "$KEY_FILE"; then
  echo "❌ $KEY_FILE isn't a private key"
  exit 1
fi

TEAM_ID="$(sed -nE 's/^APPLE_TEAM_ID=(.+)$/\1/p' "$ROOT/native/.env" 2> /dev/null | tail -n 1)"
if [ -z "$TEAM_ID" ]; then
  echo "❌ APPLE_TEAM_ID isn't set in native/.env"
  exit 1
fi

cd "$ROOT/site"
put() {
  echo "▶ $1"
  printf %s "$2" | npx wrangler secret put "$1" > /dev/null
}
put AUTH_APPLE_ID "$SERVICES_ID"
put AUTH_APPLE_TEAM_ID "$TEAM_ID"
put AUTH_APPLE_KEY_ID "$KEY_ID"
put AUTH_APPLE_PRIVATE_KEY "$(cat "$KEY_FILE")"

echo ""
echo "✅ Sign in with Apple is on. Try it at https://tabappswitcher.com/login"
echo "   Keep the .p8 somewhere safe (Apple won't download it again), or delete it: the Worker has it."
