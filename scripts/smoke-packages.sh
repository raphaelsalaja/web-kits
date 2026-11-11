#!/usr/bin/env bash
set -euo pipefail

repo_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
smoke_dir="$(mktemp -d)"
trap 'rm -rf "$smoke_dir"' EXIT

cd "$repo_dir"
pnpm turbo run build --filter "./packages/*" --output-logs=errors-only
for package in packages/*/; do
  (cd "$package" && pnpm pack --pack-destination "$smoke_dir" > /dev/null)
done
tarballs=("$smoke_dir"/*.tgz)

for tarball in "${tarballs[@]}"; do
  pnpm exec publint run "$tarball" --strict
  pnpm exec attw "$tarball" --profile esm-only --format table
done

mkdir "$smoke_dir/consumer"
cd "$smoke_dir/consumer"
echo '{ "name": "consumer", "private": true, "type": "module" }' > package.json
npm install "${tarballs[@]}" react@19 react-dom@19 \
  --ignore-scripts --no-audit --no-fund

node --input-type=module -e '
  import { readdirSync, readFileSync } from "node:fs";

  for (const dir of readdirSync("node_modules/@web-kits")) {
    const pkg = JSON.parse(readFileSync(`node_modules/@web-kits/${dir}/package.json`, "utf8"));
    const bins = Object.values(typeof pkg.bin === "string" ? { [pkg.name]: pkg.bin } : pkg.bin ?? {});
    for (const [subpath, target] of Object.entries(pkg.exports)) {
      if (subpath === "./package.json" || bins.includes(target)) continue;
      const specifier = pkg.name + subpath.slice(1);
      const names = Object.keys(await import(specifier));
      if (names.length === 0) throw new Error(`${specifier} has no exports`);
      console.log(`${specifier}: ${names.length} exports`);
    }
  }
'

if ./node_modules/.bin/audio > /dev/null 2>&1; then
  echo "Expected the retired audio CLI to exit with an error" >&2
  exit 1
fi

echo "Every packed package passed publint, attw and imports, and the retired audio CLI points to its new home."
