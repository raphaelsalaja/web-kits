---
"@web-kits/audio": minor
---

Moved to `@web-kits/react/sound`, which this release re-exports. Sound patches and the CLI are gone: `definePatch`, `loadPatch`, `createPatchInstance`, `usePatch`, `getDestination`, `getListener`, `getMasterBus` and `createAnalyser` are no longer exported, and the CLI now only points to the new home. Each sound in the library at web-kits.dev shows its `defineSound` code to copy.
