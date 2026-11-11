# Web Kits

[![license](https://img.shields.io/github/license/raphaelsalaja/web-kits)](LICENSE)
[![CI](https://github.com/raphaelsalaja/web-kits/actions/workflows/ci.yml/badge.svg)](https://github.com/raphaelsalaja/web-kits/actions/workflows/ci.yml)

Interface kits for the web.

## Packages

[`@web-kits/react`](./packages/react) [![npm](https://img.shields.io/npm/v/@web-kits/react)](https://www.npmjs.com/package/@web-kits/react) holds every kit, one import per feature:

| Import                               | Description                                             |
| ------------------------------------ | ------------------------------------------------------- |
| `@web-kits/react/number-transition`  | A number that animates between values                   |
| `@web-kits/react/text-transition`    | Text that animates between strings                      |
| `@web-kits/react/content-transition` | SwiftUI's content transitions                           |
| `@web-kits/react/family`             | Family's wallet transitions                             |
| `@web-kits/react/animation`          | Apple's springs and curves, for CSS and Motion          |
| `@web-kits/react/origin`             | App launch, genie and the glass menu for any element    |
| `@web-kits/react/motion-blur`        | Motion blur sized from speed, frame time and shutter    |
| `@web-kits/react/progressive-blur`   | The progressive blur from the iOS scroll edge           |
| `@web-kits/react/sound`              | Sounds described as plain objects, played with one call |

`@web-kits/audio`, `@web-kits/blur`, `@web-kits/motion-blur` and `@web-kits/springboard` have moved in. Their last releases re-export the new imports.

## Develop

```bash
pnpm install
pnpm build
pnpm dev
```

## Structure

```
apps/web                      Web Kits site and docs (web-kits.dev)
apps/playground               Side-by-side checks against the reference recordings
packages/react                @web-kits/react
packages/*                    The moved packages, re-exporting @web-kits/react
skills/create-sound           Agent skill for writing sounds
.web-kits/                    The sound library
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE)
