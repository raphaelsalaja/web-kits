# Contributing to Web Kits

Thanks for your interest in contributing! This guide covers everything you need to get started.

## Prerequisites

- **Node.js** 22+ (enforced via `engines` in `package.json`)
- **pnpm** 9+

## Setup

```bash
git clone https://github.com/raphaelsalaja/web-kits.git
cd web-kits
pnpm install
pnpm build
```

## Development

```bash
# Start all apps and packages in dev mode
pnpm dev

# Build everything
pnpm build

# Typecheck
pnpm typecheck

# Test
pnpm test

# Lint, or fix what it can
pnpm lint
pnpm format

# Pack every package and check it installs and imports
pnpm smoke
```

## Monorepo layout

```
apps/web                      Web Kits site
apps/audio                    Audio docs and registry (Fumadocs)
apps/audio-marketing          Audio launch video (Remotion)
apps/springboard-playground   Springboard playground (Vite)
packages/*                    Published packages
internal/                     Shared UI and icons for the apps
.web-kits/                    First-party sound patches & generated code
```

## Making changes

1. Create a new branch from `main`.
2. Make your changes.
3. Run `pnpm lint && pnpm typecheck && pnpm test && pnpm smoke` to verify everything passes.
4. Add a changeset describing your change (see below).
5. Open a pull request.

## Changesets

We use [Changesets](https://github.com/changesets/changesets) to manage versioning and changelogs. Before opening a PR that affects a published package, run:

```bash
pnpm changeset
```

Follow the prompts to describe what changed and the semver bump type. This creates a markdown file in `.changeset/` that gets consumed during release.

## Publishing

The Release workflow on `main` versions packages with Changesets, or publishes
unpublished package versions when no changesets remain. It typechecks, tests, and
builds every package under `packages/` independently of the private apps. It then
runs `pnpm smoke`, which packs every package, checks each tarball with publint and
Are the Types Wrong, installs them all in a temporary project, imports every
export, and runs the audio CLI.

Configure the repository's `NPM_TOKEN` Actions secret with permission to publish
the `@web-kits` scope. The workflow passes this secret as both `NPM_TOKEN` for
Changesets and `NODE_AUTH_TOKEN` for the npm configuration created by setup-node.

If publishing fails after a version bump, fix the underlying error and rerun the
Release workflow from Actions on `main` using **Run workflow**. Keep the existing
package version when it has not yet been published; a new changeset is not needed
for a release workflow repair. Verify the result with:

```bash
npm view @web-kits/audio version
npm view @web-kits/audio@0.2.0 version
```

## Commit convention

Commits must follow [Conventional Commits](https://www.conventionalcommits.org/). A `commitlint` hook enforces this automatically.

Format: `<type>(<optional scope>): <description>`

### Types

| Type | When to use |
|------|-------------|
| `feat` | Add, adjust, or remove a feature |
| `fix` | Fix a bug |
| `refactor` | Restructure code without changing behavior |
| `perf` | Performance improvement (special refactor) |
| `style` | Formatting, whitespace, semicolons — no behavior change |
| `test` | Add or correct tests |
| `docs` | Documentation only |
| `build` | Build tools, dependencies, project version |
| `ops` | Infrastructure, deployment, CI/CD, backups |
| `chore` | Maintenance tasks like `.gitignore`, initial commit |

### Rules

- Use imperative, present tense: "add" not "added" or "adds"
- Do not capitalize the first letter of the description
- No period at the end
- Append `!` after the type for breaking changes: `feat!: remove status endpoint`

### Examples

```
feat: add bandpass filter type
fix(envelope): resolve attack timing drift
refactor: extract audio context into shared module
perf: cache frequency calculations in oscillator
docs: add patch authoring guide
build: update typescript to v6
chore: init
```

See the full [Conventional Commits Cheatsheet](https://gist.github.com/qoomon/5dfcdf8eec66a051ecd85625518cfd13) for more details.

## Pull requests

- Keep PRs focused — one feature or fix per PR.
- Include a clear description of what changed and why.
- Make sure CI passes before requesting review.
- If your change affects the public API, include a changeset.

## Sound patches

To contribute a first-party sound patch:

1. Run `npx @web-kits/audio init` to scaffold a patch in `.web-kits/`.
2. Follow the patch schema and add sound definitions.
3. Include well-named, well-tuned sound definitions.
4. Open a PR with a brief description of the patch.

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
