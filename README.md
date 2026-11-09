# Web Kits

[![license](https://img.shields.io/github/license/raphaelsalaja/web-kits)](LICENSE)
[![CI](https://github.com/raphaelsalaja/web-kits/actions/workflows/ci.yml/badge.svg)](https://github.com/raphaelsalaja/web-kits/actions/workflows/ci.yml)

Interface kits for the web.

## Packages

| Package | Description |
| --- | --- |
| [`@web-kits/audio`](./packages/audio) | Declarative audio synthesis, with a CLI for sound patches |
| [`@web-kits/text`](./packages/text) | Fluid text transitions |
| [`@web-kits/blur`](./packages/blur) | The progressive blur from the iOS scroll edge |
| [`@web-kits/springboard`](./packages/springboard) | Apple's springs, curves, app launch and genie |
| [`@web-kits/motion-blur`](./packages/motion-blur) | Motion blur for moving DOM elements |

Each package is versioned and published on its own.

## Develop

```bash
pnpm install
pnpm build
pnpm dev
```

## Structure

```
apps/web                      Web Kits site
apps/audio                    Audio docs and registry (audio.raphaelsalaja.com)
apps/audio-marketing          Audio launch video (Remotion)
apps/springboard-playground   Springboard playground (Vite)
packages/*                    Published packages
internal/ui                   Shared UI for the apps
internal/icons                Shared icons for the apps
skills/create-sound           Agent skill for writing audio patches
.web-kits/                    First-party audio patches
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE)
