# Local setup

## Requirements

- Node.js **>= 18.0.0** (see `engines` in root [`package.json`](../../package.json); [`.nvmrc`](../../.nvmrc) pins major version `18` for `nvm use`)
- [pnpm](https://pnpm.io/) 11.x (see `packageManager` in root [`package.json`](../../package.json))
- [Vale](https://vale.sh/docs/vale-cli/installation/) on `PATH` for prose lint (`pnpm docs:check` uses `--require-vale`). macOS: `brew install vale`; Linux: `snap install vale` or a [GitHub release](https://github.com/vale-cli/vale/releases) tarball. CI pins **3.15.1**.
- Java 17 or later on `PATH` for `pnpm formal:check`, which runs the [formal models](./formal-models.md).

## First-time bootstrap

```bash
pnpm install
pnpm build
pnpm vale:sync            # requires Vale on PATH; syncs styles for docs/ and examples/sample-guides/
```

`dist/` is gitignored, and `pnpm install` doesn't build it. Run `pnpm build` after a fresh checkout, and again after you edit `packages/*/src`, before any docs script or `mdcp` CLI command. `pnpm vale:sync` downloads the styles, so it needs the network. Run it again when a `.vale.ini` changes.

## Work-item tracking

Agents load tracker issues and delivery conventions from [Agent work-item tracking](./agent-work-item-tracking.md).

## Daily commands

| Command                  | Purpose                                                                                                       |
| ------------------------ | ------------------------------------------------------------------------------------------------------------- |
| `pnpm build`             | Build all packages (`mdcp-core`, `mdcp-cli`)                                                                  |
| `pnpm test`              | Run every package's tests, then the repo script tests under `scripts/`                                        |
| `pnpm test:coverage`     | Vitest coverage for `mdcp-core` and `mdcp-cli` (HTML under `packages/*/coverage/`)                            |
| `pnpm run typecheck`     | TypeScript across packages                                                                                    |
| `pnpm run lint`          | ESLint on package sources and repo scripts, and on the site with its Astro accessibility rules                |
| `pnpm run format:check`  | Prettier check                                                                                                |
| `pnpm run check`         | Full gate including skill:validate and docs:check                                                             |
| `pnpm skill:update`      | Refresh the vendor-managed installs under `.agents/skills/` from `skills/`                                    |
| `pnpm skill:dev`         | Install this checkout's `mdcp` skill for Claude Code and Cursor without prompts (cloud session setup runs it) |
| `pnpm docs:compile:repo` | Regenerate every compiled output ([Guide directories](./docs-dogfooding.md#guide-directories))                |
| `pnpm docs:check`        | Validate repo docs + `examples/sample-guides`                                                                 |
| `pnpm formal:check`      | Run the Alloy models under `formal/alloy/` (needs Java 17 or later)                                           |

[Agent Skill development](./agent-skill.md#do-not-hand-edit-agentsskills) covers refreshing the vendor-managed installs and why nobody hand-edits them.

Optional locally: `brew install gitleaks` (CI always scans).

## Git hooks

The pre-commit hook runs three steps in order, and the commit-msg hook runs one:

| Hook       | Step            | What runs                                                                           |
| ---------- | --------------- | ----------------------------------------------------------------------------------- |
| pre-commit | lint-staged     | Prettier and ESLint on staged files (including `.jsonc`)                            |
| pre-commit | affected checks | `scripts/pre-commit-affected.mjs`, with the checks the staged paths call for        |
| pre-commit | gitleaks        | `gitleaks protect --staged` when gitleaks is on `PATH`, and a warning when it isn't |
| commit-msg | commitlint      | The Conventional Commits rules of `@commitlint/config-conventional`                 |

The affected checks run by staged path:

| Staged paths                                                                                                 | Extra checks                                                                   |
| ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| `packages/mdcp-core/**`                                                                                      | typecheck, build, `vitest related` on changed files                            |
| `packages/mdcp-cli/**`                                                                                       | core build (dependency), then cli typecheck, build, test                       |
| `packages/mdcp-presets/**`                                                                                   | JSONC preset validation                                                        |
| `docs/**`, `DEVELOPERS.md`, `packages/*/README.md`                                                           | core and CLI build, `docs:compile:repo`, then `mdcp check --warn-broken-links` |
| Root config (`package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `eslint.config.mjs`, `tsconfig*.json`) | repo-wide typecheck + `format:check`                                           |
| `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `packages/*/package.json`                           | `pnpm audit --audit-level=high`                                                |

The docs check in the hook skips `docs:lint:changeset-links`, and a broken link only warns there. Run `pnpm docs:check` before you push. When the audit fails, resolve the advisory as [Overrides and the release-age gate](./security-incident-triage.md#overrides-and-the-release-age-gate) describes before you commit the manifest change. A merge commit passes commitlint with git's default `Merge branch …` subject, and fails with a hand-written `merge: …` subject, because `merge` isn't a commit type.

## CI and the land gate

CI's Check job runs the steps of `pnpm run check`, except that it tests only mdcp-core, mdcp-cli and the repository scripts. The site's tests run in the Pages workflow. Before those steps it runs `pnpm run verify:peers`, which confirms that markdownlint-cli2 and Vale are on `PATH`, and the dependency audit `pnpm audit --audit-level=high`. A new high advisory, even on a devDependency, fails the audit, and the build and test steps after it don't run. [Overrides and the release-age gate](./security-incident-triage.md#overrides-and-the-release-age-gate) says how to resolve one. Before `docs:check` it runs `pnpm run prepare:docs`, which repeats the peer check and syncs the Vale styles. Last, it recompiles every guide and fails if `git diff` shows a change.

The other CI jobs run beside Check. The Coverage job runs `pnpm test:coverage`, as [Test code coverage](./packages-and-tests.md#test-code-coverage) describes, and the Formal models job runs `pnpm formal:check`. On pull requests the Changeset job runs the changeset checks that [When to add a changeset](./versioning-and-releases.md#when-to-add-a-changeset) describes.

The land gate's test step is the full `pnpm test`, so it also runs the site's tests. [Landing on `develop`](./versioning-and-releases.md#landing-on-develop) says what else it runs and what it pushes.
