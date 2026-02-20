#!/bin/bash
set -euo pipefail

# Usage: update-homebrew-sha.sh <version>
# Downloads release DMGs and updates the Cask formula with correct SHAs.

VERSION="${1:?Usage: update-homebrew-sha.sh <version>}"
FORMULA="homebrew/terrarium.rb"

ARM64_URL="https://github.com/michellemayes/terrarium/releases/download/v${VERSION}/Terrarium_${VERSION}_aarch64.dmg"
X64_URL="https://github.com/michellemayes/terrarium/releases/download/v${VERSION}/Terrarium_${VERSION}_x64.dmg"

echo "Downloading ARM64 DMG..."
ARM64_SHA=$(curl -sL "$ARM64_URL" | shasum -a 256 | cut -d' ' -f1)
echo "ARM64 SHA: $ARM64_SHA"

echo "Downloading x64 DMG..."
X64_SHA=$(curl -sL "$X64_URL" | shasum -a 256 | cut -d' ' -f1)
echo "x64 SHA: $X64_SHA"

sed -i '' "s/version \".*\"/version \"${VERSION}\"/" "$FORMULA"
sed -i '' "s/PLACEHOLDER_ARM64_SHA/${ARM64_SHA}/" "$FORMULA"
sed -i '' "s/PLACEHOLDER_X64_SHA/${X64_SHA}/" "$FORMULA"

# Also replace any existing SHAs (for updates after first release)
sed -i '' "/aarch64.dmg/{ n; s/sha256 \".*\"/sha256 \"${ARM64_SHA}\"/; }" "$FORMULA"
sed -i '' "/x64.dmg/{ n; s/sha256 \".*\"/sha256 \"${X64_SHA}\"/; }" "$FORMULA"

echo "Updated $FORMULA with version $VERSION"
