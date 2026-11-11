#!/usr/bin/env bash
# Builds the macOS caret probe, runs it and writes its log.
#
#   OUT=/tmp/caret-probe/mac.jsonl ./run.sh
set -euo pipefail

here="$(cd "$(dirname "$0")" && pwd)"
build="${TMPDIR:-/tmp}/caret-probe-mac"
out="${OUT:-/tmp/caret-probe/mac.jsonl}"

mkdir -p "$build" "$(dirname "$out")"
xcrun swiftc -O -o "$build/CaretProbe" "$here/Probe.swift" 2>&1 | grep -v "^$" || true
[ -x "$build/CaretProbe" ] || exit 1
rm -f "$out"
"$build/CaretProbe" "$out" "$@"
echo "$(wc -l < "$out") lines in $out"
