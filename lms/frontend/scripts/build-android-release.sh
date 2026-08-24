#!/usr/bin/env bash
# Genesis LMS - Android release build (macOS / Linux / WSL).
# Produces: android/app/build/outputs/apk/release/app-release.apk
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

: "${ANDROID_HOME:?Set ANDROID_HOME to your Android SDK path}"
echo "Using Android SDK: $ANDROID_HOME"

echo "[1/3] Building web bundle (dist/)"
npx next build --webpack

echo "[2/3] Syncing Capacitor (android)"
npx cap sync android

echo "[3/3] Assembling release APK"
cd android
if [ -x ./gradlew ]; then
  ./gradlew assembleRelease
else
  gradle assembleRelease
fi

APK="$ROOT/android/app/build/outputs/apk/release/app-release.apk"
if [ -f "$APK" ]; then
  SIZE=$(du -h "$APK" | cut -f1)
  echo "Success: $APK ($SIZE)"
else
  echo "Build finished but APK not found at $APK" >&2
  exit 1
fi
