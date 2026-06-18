#!/usr/bin/env bash
# Local (non-Docker) setup for JPlag plagiarism detection.
# Requires Java 17+. Downloads the JPlag CLI JAR to backend/jplag/jplag.jar.
set -euo pipefail

JPLAG_VERSION="${JPLAG_VERSION:-5.1.0}"
DIR="$(cd "$(dirname "$0")/.." && pwd)/jplag"
JAR="$DIR/jplag.jar"
URL="https://github.com/jplag/JPlag/releases/download/v${JPLAG_VERSION}/jplag-${JPLAG_VERSION}-jar-with-dependencies.jar"

mkdir -p "$DIR"

if ! command -v java >/dev/null 2>&1; then
  echo "❌ Java not found. Install Java 17+ (e.g. 'sudo apt install openjdk-17-jre-headless') and re-run."
  exit 1
fi

echo "⬇️  Downloading JPlag ${JPLAG_VERSION}..."
if curl -fsSL -o "$JAR" "$URL"; then
  echo "✅ JPlag JAR installed at $JAR"
  echo "   (Override location with JPLAG_JAR_PATH if needed.)"
else
  echo "❌ Download failed. Grab the JAR manually from https://github.com/jplag/JPlag/releases and place it at $JAR"
  exit 1
fi
