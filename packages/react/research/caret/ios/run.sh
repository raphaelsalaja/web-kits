#!/usr/bin/env bash
# Builds the caret probe for the booted iOS Simulator, runs it and writes its
# JSON lines to $OUT (default /tmp/caret-probe/ios.jsonl).
set -euo pipefail

export DEVELOPER_DIR="${DEVELOPER_DIR:-/Applications/Xcode.app/Contents/Developer}"
here="$(cd "$(dirname "$0")" && pwd)"
build="${BUILD:-/tmp/caret-probe}"
out="${OUT:-$build/ios.jsonl}"
app="$build/CaretProbe.app"
id="dev.web-kits.caret-probe"
runtime="$(xcrun simctl list runtimes | sed -n 's/^iOS \([0-9.]*\) .*/\1/p' | tail -1)"

rm -rf "$app"
mkdir -p "$app"
xcrun --sdk iphonesimulator swiftc \
  -target "arm64-apple-ios${runtime}-simulator" \
  -parse-as-library -O -o "$app/CaretProbe" "$here/Probe.swift" 2>&1 |
  grep -v "^$" || true
test -x "$app/CaretProbe"

cat > "$app/Info.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleIdentifier</key><string>$id</string>
  <key>CFBundleExecutable</key><string>CaretProbe</string>
  <key>CFBundleName</key><string>CaretProbe</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>CFBundleShortVersionString</key><string>1.0</string>
  <key>CFBundleVersion</key><string>1</string>
  <key>MinimumOSVersion</key><string>$runtime</string>
  <key>UIDeviceFamily</key><array><integer>1</integer></array>
  <key>UILaunchScreen</key><dict/>
  <key>UIRequiresFullScreen</key><true/>
</dict>
</plist>
PLIST

codesign --force --sign - "$app" > /dev/null
xcrun simctl install booted "$app"
xcrun simctl terminate booted "$id" 2> /dev/null || true
data="$(xcrun simctl get_app_container booted "$id" data)"
rm -f "$data/Documents/probe.jsonl"
xcrun simctl launch booted "$id" "$@" > /dev/null
for _ in $(seq 1 240); do
  grep -q '"kind":"done"' "$data/Documents/probe.jsonl" 2> /dev/null && break
  sleep 0.5
done
cp "$data/Documents/probe.jsonl" "$out"
echo "$(wc -l < "$out") lines in $out"
