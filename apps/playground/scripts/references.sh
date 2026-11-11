#!/usr/bin/env bash
# Copies the reference recordings into public/reference, which git ignores.
# They hold wallet data, so they stay on this machine.
#
# Each clip is resampled to 60 fps with every frame a keyframe, because
# Chrome shows stale pictures when seeking onto B-frames.
set -euo pipefail

scripts="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
family="${FAMILY_REFERENCES:-$HOME/Downloads/MOV/family}"
research="${SWIFTUI_REFERENCES:-$HOME/Developer/apple-animations-research/ios/text-transitions/out}"
target="$scripts/../public/reference"

intra() {
  [ -f "$2" ] && return
  mkdir -p "$(dirname "$2")"
  python3 "$scripts/intra.py" "$1" "$2"
}

mkdir -p "$target"

if [ -d "$family" ]; then
  [ -L "$target/family" ] && rm "$target/family"
  (cd "$family" && find . -name '*.mp4') | while read -r clip; do
    intra "$family/$clip" "$target/family/$clip"
  done
  echo "family: $family"
else
  echo "family: not found at $family"
fi

for pass in base colored; do
  source="$research/swiftui.mov"
  [ "$pass" = colored ] && source="$research/colored/swiftui.mov"
  if [ -f "$source" ]; then
    intra "$source" "$target/swiftui/$pass.mp4"
    echo "swiftui $pass: $target/swiftui/$pass.mp4"
  else
    echo "swiftui $pass: not found at $source"
  fi
done

# Family sets its amounts in SF Pro Rounded, which Chrome's ui-rounded is not,
# and their currency signs in SF Compact Rounded.
mkdir -p "$target/fonts"
for font in SFNSRounded SFCompactRounded; do
  if [ -f "/System/Library/Fonts/$font.ttf" ]; then
    cp "/System/Library/Fonts/$font.ttf" "$target/fonts/"
    echo "fonts: $target/fonts/$font.ttf"
  else
    echo "fonts: no $font.ttf in /System/Library/Fonts"
  fi
done
