# @web-kits/springboard

This package has moved into `@web-kits/react`. This last release re-exports the new subpaths, so `origin`, its effects and the springs keep working, but new features only land in `@web-kits/react`.

```sh
npm install @web-kits/react
```

| Before                                         | After                       |
| ---------------------------------------------- | --------------------------- |
| `origin`, `launch`, `genie` and `morph`        | `@web-kits/react/origin`    |
| `useOrigin` from `@web-kits/springboard/react` | `@web-kits/react/origin`    |
| Springs, presets and timing curves             | `@web-kits/react/animation` |

The building blocks underneath the effects are no longer exported: the meshes, drivers and geometry helpers, `continuousRect`, the scroll physics helpers, and the `push`, `sheet` and `zoom` screen transitions.

Docs are at [web-kits.dev/springboard](https://web-kits.dev/springboard).
