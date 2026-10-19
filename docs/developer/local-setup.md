# Local setup

## Requirements

- Node.js **>= 22.13.0** for this monorepo (see `engines` in root [`package.json`](../../package.json); [`.nvmrc`](../../.nvmrc) pins major version `24` for `nvm use`). pnpm 11, Vitest, and the Astro docs site need Node 22 or later; CI runs Node 24.
- Published `@merlon-docs/*` packages (`merlon-docs-cli`, `merlon-docs-core`, `merlon-docs-presets`) declare **`engines.node` `>=20.19.0`** for adopters who install only those packages.
- [pnpm](https://pnpm.io/) 11.x (see `packageManager` in root [`package.json`](../../package.json))
- [Vale](https://vale.sh/docs/vale-cli/installation/) on `PATH` for prose lint (`pnpm docs:check` uses `--require-vale`). macOS: `brew install vale`; Linux: `snap install vale` or a [GitHub release](https://github.com/vale-cli/vale/releases) tarball. Any Vale 3.x works locally. CI pins **3.15.1**. The workflows that install Vale ([`ci.yml`](../../.github/workflows/ci.yml) and [`land-develop.yml`](../../.github/workflows/land-develop.yml)) and the Claude Code session-start hook (`.claude/hooks/session-start.sh`) each set `VALE_VERSION` to it. No check compares those copies with this line. A Vale bump edits all four.
- Java 17 or later on `PATH` for `pnpm formal:check`, which runs the [formal models](./formal-models.md).

## First-time bootstrap

```bash
pnpm install
pnpm build
pnpm vale:sync            # requires Vale on PATH; syncs styles for docs/ and examples/sample-guides/
```

`dist/` is gitignored, and `pnpm install` doesn't build it. Run `pnpm build` after a fresh checkout, and again after you edit `packages/*/src`, before any docs script or `merlon` CLI command. `pnpm vale:sync` downloads the styles, so it needs the network. Run it again when a `.vale.ini` changes.

## Work-item tracking

Agents load tracker issues and delivery conventions from [Agent work-item tracking](./agent-work-item-tracking.md).

## Daily commands

| Command                  | Purpose                                                                                                              |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| `pnpm build`             | Build all packages (`merlon-docs-core`, `merlon-docs-cli`)                                                           |
| `pnpm test`              | Run every package's tests, then the repo script tests under `scripts/`                                               |
| `pnpm test:coverage`     | Vitest coverage for `merlon-docs-core` and `merlon-docs-cli` (HTML under `packages/*/coverage/`)                     |
| `pnpm run typecheck`     | TypeScript across packages                                                                                           |
| `pnpm run lint`          | ESLint on package sources and repo scripts, and on the site with its Astro accessibility rules                       |
| `pnpm run format:check`  | Prettier check                                                                                                       |
| `pnpm run check`         | Full gate including skill:validate and docs:check                                                                    |
| `pnpm skill:update`      | Refresh the vendor-managed installs under `.agents/skills/` from `skills/`                                           |
| `pnpm skill:dev`         | Install this checkout's `merlon-docs` skill for Claude Code and Cursor without prompts (cloud session setup runs it) |
| `pnpm docs:compile:repo` | Regenerate every compiled output ([Guide directories](./docs-dogfooding.md#guide-directories))                       |
| `pnpm docs:check`        | Validate repo docs + `examples/sample-guides`                                                                        |
| `pnpm formal:check`      | Run the Alloy models under `formal/alloy/` (needs Java 17 or later)                                                  |

[Agent Skill development](./agent-skill.md#do-not-hand-edit-agentsskills) covers refreshing the vendor-managed installs and why nobody hand-edits them.

Optional locally: `brew install gitleaks` (CI always scans).

## Git hooks

`pnpm install` sets up three hooks. The pre-commit hook is fast and works offline, so it never builds, runs tests or reaches the network. The pre-push hook runs the full gate and may take minutes.

| Hook       | Step            | What runs                                                                            |
| ---------- | --------------- | ------------------------------------------------------------------------------------ |
| pre-commit | lint-staged     | Prettier and ESLint on staged files (including `.jsonc`)                             |
| pre-commit | affected checks | `scripts/pre-commit-affected.mjs`, with the offline checks the staged paths call for |
| pre-commit | gitleaks        | `gitleaks protect --staged` when gitleaks is on `PATH`, and a warning when it isn't  |
| commit-msg | commitlint      | The Conventional Commits rules of `@commitlint/config-conventional`                  |
| pre-push   | full gate       | `scripts/pre-push.mjs`, with the checks the [land gate](#ci-and-the-land-gate) runs  |

The affected checks run by staged path:

| Staged paths                                    | Extra checks               |
| ----------------------------------------------- | -------------------------- |
| TypeScript under `packages/merlon-docs-core/**` | merlon-docs-core typecheck |
| TypeScript under `packages/merlon-docs-cli/**`  | merlon-docs-cli typecheck  |
| `packages/merlon-docs-presets/**`               | JSONC preset validation    |

The pre-push hook runs the land gate's steps in its order, from `pnpm run verify:peers` and the dependency audit through `pnpm run docs:compile` and the `git diff` check. It then runs `pnpm formal:check` when the push changes the formal models, and the changeset checks against the merge base with `develop` on the remote you push to. It needs Vale and the network, and Java when it runs the models. It checks the commit you have checked out, so it stops when you push another branch or have uncommitted changes. `git push --no-verify` skips it.

CI doesn't rely on any hook, since a contributor may skip them or never install them. When the audit fails, resolve the advisory as [Overrides and the release-age gate](./security-incident-triage.md#overrides-and-the-release-age-gate) describes. A merge commit passes commitlint with git's default `Merge branch …` subject, and fails with a hand-written `merge: …` subject, because `merge` isn't a commit type.

## CI and the land gate

CI's Check job runs the steps of `pnpm run check`, except that it tests only merlon-docs-core, merlon-docs-cli and the repository scripts. The site's tests run in the Pages workflow. Before those steps it runs `pnpm run verify:peers`, which confirms that markdownlint-cli2 and Vale are on `PATH`, and the dependency audit `pnpm audit --audit-level=high`. A new high advisory, even on a devDependency, fails the audit, and the build and test steps after it don't run. [Overrides and the release-age gate](./security-incident-triage.md#overrides-and-the-release-age-gate) says how to resolve one. Before `docs:check` it runs `pnpm run prepare:docs`, which repeats the peer check and syncs the Vale styles. Last, it recompiles every guide and fails if `git diff` shows a change.

CI skips a draft pull request and runs when the PR is marked ready, as [Pull requests](./versioning-and-releases.md#pull-requests) describes. The other CI jobs run beside Check. The Coverage job runs `pnpm test:coverage`, as [Test code coverage](./packages-and-tests.md#test-code-coverage) describes, and the Formal models job runs `pnpm formal:check`. On pull requests the Changeset job runs the changeset checks that [When to add a changeset](./versioning-and-releases.md#when-to-add-a-changeset) describes, and the Benchmarks job runs `pnpm bench`, the [growth benchmarks](./packages-and-tests.md#growth-benchmarks) that `pnpm run check` and the git hooks leave out.

The land gate's test step is the full `pnpm test`, so it also runs the site's tests. [Landing on `develop`](./versioning-and-releases.md#landing-on-develop) says what else it runs and what it pushes.
