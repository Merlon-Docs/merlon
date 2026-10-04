# Publishing

Packages: `@bwilliamson/mdcp-core`, `@bwilliamson/mdcp-cli`, `@bwilliamson/mdcp-presets` (npm). Skill carriers: `@bwilliamson/skill-*` under `packages/skill-*` (GitHub Releases only; not npm).

## Prerequisites

- npm account **`bwilliamson`** with access to publish `@bwilliamson/*`
- **2FA enabled** on npm (auth-and-writes)
- Repository secret **`RELEASE_GITHUB_TOKEN`**, set up as described below
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
2. Repository access: this repo only. Give it **Contents** read/write (commits, tags, releases). Every fine-grained token also includes read-only **Metadata** access.
3. Store as repository secret **`RELEASE_GITHUB_TOKEN`**.
4. Rotate when maintainers change or on a schedule.

Without it, the Release job fails before versioning (hard requirement).

## Dry run and manual fallback

Routine releases run in CI, as [Release schedule](./versioning-and-releases.md#release-schedule-release-pr-from-develop-to-main) describes. The dry run prints each release command without running it, so it doesn't change any file or push anything:

```bash
pnpm release:main --dry-run
```

With pending changesets, the dry run lists them and then exits 1 with "changeset version ran but no package versions changed", because it skipped the version step. So it can't preview a versioning release.

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
