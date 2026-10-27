#!/bin/bash
# Copy the release credentials from this Mac to the repository's GitHub Actions secrets, so the
# Release workflow (.github/workflows/release.yml) can sign the Mac app and submit the extension
# to the stores.
#
#   npm run release:secrets
#
# It reads the Chrome, Firefox and Edge credentials from extension/.env, the notarization
# credentials from native/.env, and the "Developer ID Application" certificate with its private
# key from the login keychain (macOS asks for the keychain password to export it). Run it again
# whenever one of them changes, such as a new app-specific password or a renewed certificate.
# Only the secrets' names are printed.
#
# Needs the GitHub CLI, signed in as someone who can change the repository's settings.

set -euo pipefail

REPO="mckinley/tab-app-switcher"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# macOS's own openssl (LibreSSL) reads and writes the .p12 format the keychain uses, where
# OpenSSL 3 would need -legacy
OPENSSL="${OPENSSL:-/usr/bin/openssl}"

EXTENSION_SECRETS="CHROME_CLIENT_ID CHROME_CLIENT_SECRET CHROME_REFRESH_TOKEN FIREFOX_API_KEY FIREFOX_API_SECRET EDGE_CLIENT_ID EDGE_API_KEY EDGE_PRODUCT_ID"
NATIVE_SECRETS="APPLE_ID APPLE_APP_SPECIFIC_PASSWORD APPLE_TEAM_ID"

if [ "$(uname)" != "Darwin" ]; then
  echo "❌ Run this on the Mac that has the Developer ID certificate in its keychain."
  exit 1
fi

if ! gh secret list --repo "$REPO" > /dev/null; then
  echo "❌ The GitHub CLI can't read $REPO's secrets. Sign in with: gh auth login"
  exit 1
fi

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

# Sets the named secrets from a .env file, skipping any that are missing or empty there
set_from_env() {
  local file="$1"
  shift
  if [ ! -f "$file" ]; then
    echo "❌ $file not found. Copy it from ${file}.example and fill it in."
    exit 1
  fi
  : > "$tmp/secrets.env"
  for name in "$@"; do
    if grep -qE "^${name}=.+" "$file"; then
      grep -E "^${name}=.+" "$file" | tail -n 1 >> "$tmp/secrets.env"
    else
      echo "⚠️  $name isn't set in ${file#"$ROOT"/}, so it's left as it is"
    fi
  done
  if [ -s "$tmp/secrets.env" ]; then
    gh secret set --repo "$REPO" --env-file "$tmp/secrets.env"
  fi
  rm -f "$tmp/secrets.env"
}

# Writes each PEM block in a file to its own file: <prefix>1.pem, <prefix>2.pem, ...
split_pem() {
  awk -v prefix="$2" '
    /-----BEGIN / { n++; out = prefix n ".pem" }
    out { print > out }
    /-----END / { close(out); out = "" }
  ' "$1"
}

echo "▶ Store credentials from extension/.env"
# shellcheck disable=SC2086
set_from_env "$ROOT/extension/.env" $EXTENSION_SECRETS

echo ""
echo "▶ Notarization credentials from native/.env"
# shellcheck disable=SC2086
set_from_env "$ROOT/native/.env" $NATIVE_SECRETS

echo ""
echo "▶ Developer ID Application certificate from the keychain"
# "  1) <SHA-1 fingerprint> "Developer ID Application: Name (TEAMID)""
found="$(security find-identity -v -p codesigning | grep -F '"Developer ID Application: ' | head -n 1 || true)"
fingerprint="$(echo "$found" | awk '{ print $2 }')"
identity="$(echo "$found" | sed -nE 's/.*"(.+)".*/\1/p')"
if [ -z "$identity" ]; then
  echo "❌ No valid Developer ID Application certificate in the keychain."
  echo "   Create one at https://developer.apple.com/account/resources/certificates and run this again."
  exit 1
fi
echo "   $identity"
echo "   macOS asks for your login keychain password to export it (once for each certificate"
echo "   with a private key in the keychain). Only this one is kept."

# The keychain exports every identity at once, so take the certificate and its private key from
# that and package them on their own
export_password="$("$OPENSSL" rand -hex 24)"
security export -k "$HOME/Library/Keychains/login.keychain-db" -t identities -f pkcs12 \
  -P "$export_password" -o "$tmp/all.p12"
"$OPENSSL" pkcs12 -in "$tmp/all.p12" -passin "pass:$export_password" -nokeys -clcerts -out "$tmp/certs.pem"
"$OPENSSL" pkcs12 -in "$tmp/all.p12" -passin "pass:$export_password" -nocerts -nodes -out "$tmp/keys.pem"
split_pem "$tmp/certs.pem" "$tmp/cert-"
split_pem "$tmp/keys.pem" "$tmp/key-"

cert=""
for file in "$tmp"/cert-*.pem; do
  # "SHA1 Fingerprint=AB:CD:..."
  if [ "$("$OPENSSL" x509 -in "$file" -noout -fingerprint -sha1 | sed 's/.*=//; s/://g')" = "$fingerprint" ]; then
    cert="$file"
    break
  fi
done
if [ -z "$cert" ]; then
  echo "❌ The keychain export didn't include \"$identity\"."
  exit 1
fi

public_key="$("$OPENSSL" x509 -in "$cert" -noout -pubkey)"
key=""
for file in "$tmp"/key-*.pem; do
  if [ "$("$OPENSSL" pkey -in "$file" -pubout 2> /dev/null)" = "$public_key" ]; then
    key="$file"
    break
  fi
done
if [ -z "$key" ]; then
  echo "❌ The keychain export didn't include the private key for \"$identity\"."
  exit 1
fi

p12_password="$("$OPENSSL" rand -hex 24)"
"$OPENSSL" pkcs12 -export -in "$cert" -inkey "$key" -name "$identity" \
  -passout "pass:$p12_password" -out "$tmp/developer-id.p12"
base64 < "$tmp/developer-id.p12" | gh secret set CSC_LINK --repo "$REPO"
printf %s "$p12_password" | gh secret set CSC_KEY_PASSWORD --repo "$REPO"

echo ""
echo "✅ The Release workflow has the credentials it needs. Secrets on $REPO:"
gh secret list --repo "$REPO"
echo ""
echo "   Release with: npm run release patch"
