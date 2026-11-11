# @web-kits/motion-blur

This package has moved to `@web-kits/react/motion-blur`. This last release re-exports it, so existing imports keep working, but new features only land in `@web-kits/react`.

```sh
npm install @web-kits/react
```

| Before                        | After                         |
| ----------------------------- | ----------------------------- |
| `@web-kits/motion-blur`       | `@web-kits/react/motion-blur` |
| `@web-kits/motion-blur/react` | `@web-kits/react/motion-blur` |

The `MotionBlur` type returned by `motionBlur` is now `MotionBlurInstance`, since `MotionBlur` names the React component.

Docs are at [web-kits.dev/motion-blur](https://web-kits.dev/motion-blur).
