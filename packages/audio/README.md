# @web-kits/audio

This package has moved to `@web-kits/react/sound`. This last release re-exports it, so `defineSound`, `defineSequence`, the hooks and the offline renderer keep working, but new features only land in `@web-kits/react`.

```sh
npm install @web-kits/react
```

| Before                  | After                   |
| ----------------------- | ----------------------- |
| `@web-kits/audio`       | `@web-kits/react/sound` |
| `@web-kits/audio/react` | `@web-kits/react/sound` |

Sound patches and the CLI are gone. Instead, each sound in the [library](https://web-kits.dev/audio/library) shows its `defineSound` code to copy into your project. `definePatch`, `loadPatch`, `createPatchInstance` and `usePatch` are no longer exported, and neither are the lower-level `getDestination`, `getListener`, `getMasterBus` and `createAnalyser`.

Docs are at [web-kits.dev/audio](https://web-kits.dev/audio).
