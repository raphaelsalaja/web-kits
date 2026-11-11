# @web-kits/blur

This package has moved to `@web-kits/react/progressive-blur`. This last release re-exports it, so existing imports keep working, but new features only land in `@web-kits/react`.

```sh
npm install @web-kits/react
```

| Before                 | After                              |
| ---------------------- | ---------------------------------- |
| `@web-kits/blur`       | `@web-kits/react/progressive-blur` |
| `@web-kits/blur/react` | `@web-kits/react/progressive-blur` |

The `ProgressiveBlur` type returned by `progressiveBlur` is now `ProgressiveBlurInstance`, since `ProgressiveBlur` names the React component.

Docs are at [web-kits.dev/blur](https://web-kits.dev/blur).
