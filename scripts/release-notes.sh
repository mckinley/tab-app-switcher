#!/bin/bash
# Print the release notes for a tag: the version's section of resources/whats-new.md if it has
# one, the commits since the previous release that changed the extension or the Mac app, and a
# link to the full comparison.
#
#   ./scripts/release-notes.sh v1.2.5
#
# Used for the GitHub release, by .github/workflows/release.yml and `npm run release -- --local`.
# Needs the history back to the previous v* tag.

set -euo pipefail

TAG="$1"
REPO="mckinley/tab-app-switcher"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

whats_new="$(awk -v heading="## ${TAG#v}" '$0 == heading { found = 1; next } /^## / { found = 0 } found' \
  "$ROOT/resources/whats-new.md" 2> /dev/null | sed '/./,$!d')"
if [ -n "$whats_new" ]; then
  echo "$whats_new"
  echo ""
  echo "### Changes"
  echo ""
fi

previous="$(git describe --tags --abbrev=0 --match 'v*' "$TAG^" 2> /dev/null || true)"
git log --no-merges --format='- %s' ${previous:+"$previous.."}"$TAG" -- extension native tas packages |
  grep -vE '^- Release v[0-9.]+$' || true
if [ -n "$previous" ]; then
  echo ""
  echo "**Full changelog:** https://github.com/$REPO/compare/$previous...$TAG"
fi
