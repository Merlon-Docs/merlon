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
pnpm vale:sync            # once — requires Vale on PATH; syncs styles for docs/ and examples/sample-guides/
```

## Work-item tracking setup step

If you use coding agents with the MDCP skill ([skills index](../../docs/skills.md)), document how to load tracker issues **once per repo**. This project maintains that in [Agent work-item tracking](./agent-work-item-tracking.md) — add it to your setup checklist alongside install and build steps. Consumer repos should add a similar shard under `docs/developer/` and link it from local setup.

## Daily commands

| Command                  | Purpose                                                                                                       |
| ------------------------ | ------------------------------------------------------------------------------------------------------------- |
| `pnpm build`             | Build all packages (`mdcp-core`, `mdcp-cli`)                                                                  |
| `pnpm test`              | Run every package's tests, then the repo script tests under `scripts/`                                        |
| `pnpm test:coverage`     | Vitest coverage for `mdcp-core` and `mdcp-cli` (HTML under `packages/*/coverage/`)                            |
| `pnpm run typecheck`     | TypeScript across packages                                                                                    |
| `pnpm run lint`          | ESLint on TypeScript sources                                                                                  |
| `pnpm run format:check`  | Prettier check                                                                                                |
| `pnpm run check`         | Full gate including skill:validate and docs:check                                                             |
| `pnpm skill:update`      | Refresh the local skill installs under `.agents/skills/` from `skills/`                                       |
| `pnpm skill:dev`         | Install this checkout's `mdcp` skill for Claude Code and Cursor without prompts (cloud session setup runs it) |
| `pnpm docs:compile:repo` | Regenerate compiled docs (`guides.md`, `DEVELOPERS.md`, package READMEs)                                      |
| `pnpm docs:check`        | Validate repo docs + `examples/sample-guides`                                                                 |
| `pnpm formal:check`      | Run the Alloy models under `formal/alloy/` (needs Java 17 or later)                                           |

[Agent Skill development](./agent-skill.md#do-not-hand-edit-agentsskills) covers refreshing the skill installs and why nobody hand-edits them.

Optional locally: `brew install gitleaks` (CI always scans).

## Git hooks

Pre-commit runs in two phases:

| Phase           | What runs                                                                                |
| --------------- | ---------------------------------------------------------------------------------------- |
| lint-staged     | Prettier and ESLint on staged files (including `.jsonc`)                                 |
| affected checks | `scripts/pre-commit-affected.mjs` — build and test only packages touched by staged paths |

| Staged paths                                            | Extra checks                                             |
| ------------------------------------------------------- | -------------------------------------------------------- |
| `packages/mdcp-core/**`                                 | typecheck, build, `vitest related` on changed files      |
| `packages/mdcp-cli/**`                                  | core build (dependency), then cli typecheck, build, test |
| `packages/mdcp-presets/**`                              | JSONC preset validation                                  |
| `docs/**`, `DEVELOPERS.md`, package README shards       | `docs:compile:repo` + `docs:check:repo`                  |
| Root config (`package.json`, lockfile, eslint/tsconfig) | repo-wide typecheck + `format:check`                     |

## CI and the land gate

CI's Check job runs the steps of `pnpm run check`, except that it tests only mdcp-core, mdcp-cli and the repository scripts. The site's tests run in the Pages workflow. Before those steps it runs `pnpm run verify:peers`, which confirms that markdownlint-cli2 and Vale are on `PATH`, and the dependency audit `pnpm audit --audit-level=high`. Before `docs:check` it runs `pnpm run prepare:docs`, which repeats the peer check and syncs the Vale styles. Last, it recompiles every guide and fails if `git diff` shows a change.

The other CI jobs run beside Check. The Coverage job runs `pnpm test:coverage`, as [Test code coverage](./packages-and-tests.md#test-code-coverage) describes, and the Formal models job runs `pnpm formal:check`. On pull requests the Changeset job runs the changeset checks that [When to add a changeset](./versioning-and-releases.md#when-to-add-a-changeset) describes.

The land gate's test step is the full `pnpm test`, so it also runs the site's tests. [Landing on `develop`](./versioning-and-releases.md#landing-on-develop) says what else it runs and what it pushes.
