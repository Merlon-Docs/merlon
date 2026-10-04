# Publishing

Packages: `@bwilliamson/mdcp-core`, `@bwilliamson/mdcp-cli`, `@bwilliamson/mdcp-presets` (npm). Skill carriers: `@bwilliamson/skill-*` under `packages/skill-*` (GitHub Releases only; not npm).

## Prerequisites

- npm account **`bwilliamson`** with access to publish `@bwilliamson/*`
- **2FA enabled** on npm (auth-and-writes)
- Repository secret **`RELEASE_GITHUB_TOKEN`** — **fine-grained** maintainer PAT with **Contents: Read and write** on this repo only (create commits/tags/releases). Prefer fine-grained over classic `repo`. Required for the single-step release job; do not use a broad classic PAT if avoidable.
- `pnpm install` at repo root

## First-time publish (chicken-and-egg)

First npm publish must happen from your machine with `npm login` before Trusted Publishing can be configured. Historical one-off steps remain in git history; routine releases use CI.

### Trusted Publishing

**Important:** The `release.yml` workflow is bound to the `release` GitHub Environment. Configure Environment protection (required reviewers) and allow **`main`** as a deployment branch.

1. Each package → **Settings** → **Trusted Publisher** → **GitHub Actions**
2. Repository: `betsalel-williamson/mdcp`
3. Workflow filename: `release.yml`

Also enable **Settings → Actions → General → Workflow permissions → Allow GitHub Actions to create and approve pull requests**. The [sync workflow](./versioning-and-releases.md#release-schedule-release-pr-from-develop-to-main) needs it. When merging `main` back into `develop` conflicts, that workflow opens a pull request from `main` to `develop` with its own `GITHUB_TOKEN`.

### `RELEASE_GITHUB_TOKEN`

1. Create a **fine-grained** PAT as the maintainer (avoid classic `repo` unless necessary).
2. Repository access: this repo only. Permissions: **Contents** read/write (commits, tags, releases).
3. Store as repository secret **`RELEASE_GITHUB_TOKEN`**.
4. Rotate when maintainers change or on a schedule.

Without it, the Release job fails before versioning (hard requirement).

Before approving the **`release` environment**, open the **Release plan** job summary on the same workflow run and review pending `.changeset` files (release notes / bump intent).

## Routine releases (one step)

1. Merge a release PR from `develop` to `main` with a merge commit ([Branches](./versioning-and-releases.md#branches)).
2. Open the **latest** Release workflow run → read the **Release plan** job summary (pending changesets and/or missing GitHub Releases). Older runs still waiting for approval are cancelled when a newer plan starts.
3. Approve the **`release` environment** deployment on that latest run.
4. After approval, CI **resets to `origin/main` tip**, then runs **`pnpm release:main`**: with pending changesets — version → sync skill frontmatter → build → commit → **push to `main`** → `changeset publish` → **push tags** → GitHub Releases (npm packages **and** skill carriers). With no changesets but missing tags/Releases — create those git tags and Releases idempotently at each package’s version-bump commit (`--target`). If `main` moved during versioning, the push aborts as superseded (no force-push).

There is no separate Version Packages PR.

Preview locally (consumes changesets — use a throwaway branch):

```bash
pnpm release:main --dry-run
```

Manual fallback:

```bash
pnpm run check
pnpm release:main
```

## Install surfaces

| Use case       | Command                                                    |
| -------------- | ---------------------------------------------------------- |
| Dev dependency | `npm i -D @bwilliamson/mdcp-cli @bwilliamson/mdcp-presets` |
| Global CLI     | `npm i -g @bwilliamson/mdcp-cli`                           |
| Programmatic   | `import { compileGuides } from '@bwilliamson/mdcp-core'`   |
| Agent Skills   | `npx skills add betsalel-williamson/mdcp --skill mdcp`     |

See [SECURITY.md](../../SECURITY.md) and [Security-incident triage](./security-incident-triage.md).
