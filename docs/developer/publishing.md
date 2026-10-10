# Publishing

Packages: `@bwilliamson/mdcp-core`, `@bwilliamson/mdcp-cli`, `@bwilliamson/mdcp-presets` (npm). Skill carriers: `@bwilliamson/skill-*` under `packages/skill-*` (GitHub Releases only; not npm).

Consumers install the Agent Skill as [Get started](../repo-readme/get-started.md) shows. The [CLI](../client-cli/install-and-quick-start.md#install) and [core](../client-core/about.md#install) package READMEs give their own install commands.

## Prerequisites

- npm account **`bwilliamson`** with access to publish `@bwilliamson/*`
- **2FA enabled** on npm (auth-and-writes)
- **`RELEASE_GITHUB_TOKEN`**, a secret of the `release` environment, as [Release token](#release-token) describes
- `pnpm install` at repo root

Security reporting and bad-release handling: [SECURITY.md](../../SECURITY.md) and [Security-incident triage](./security-incident-triage.md).

## First-time publish (chicken-and-egg)

First npm publish must happen from your machine with `npm login` before Trusted Publishing can be configured. Historical one-off steps remain in git history; routine releases use CI.

### Trusted Publishing

The release job in `release.yml` runs in the `release` environment. [Repository settings](./repository-settings.md) lists its reviewers and deployment branches.

1. Each package → **Settings** → **Trusted Publisher** → **GitHub Actions**
2. Repository: `betsalel-williamson/mdcp`
3. Workflow filename: `release.yml`

## Tokens

The release job and the Dependabot changeset workflow each push with a fine-grained personal access token instead of the default `GITHUB_TOKEN`. The copy of a workflow that any pushed branch runs can read a repository secret. Only the jobs that run in an environment get that environment's secrets, and the `release` environment's deployment branches and reviewer keep other branches' jobs out of it, as [Repository settings](./repository-settings.md) lists.

### Release token

The release job pushes the release commit and tags and creates GitHub Releases with `RELEASE_GITHUB_TOKEN`.

1. Create a **fine-grained** PAT as the maintainer (avoid classic `repo` unless necessary).
2. Repository access: this repo only. Give it **Contents** read/write (commits, tags, releases). Every fine-grained token also includes read-only **Metadata** access.
3. Store it as **`RELEASE_GITHUB_TOKEN`** under **Settings → Environments → `release`** → **Environment secrets**.

Without it, the Release job fails before versioning (hard requirement).

### Dependabot changeset token

The [Dependabot changeset workflow](./versioning-and-releases.md#dependabot) pushes its changeset commit to the pull request with `DEPENDABOT_CHANGESET_TOKEN`. A commit made with the default `GITHUB_TOKEN` would not start CI, and the required checks would stay pending.

1. Create a **fine-grained** PAT with **Contents: read and write** on this repository only.
2. Store it as the repository secret **`DEPENDABOT_CHANGESET_TOKEN`**.

The [GitHub Actions security checklist](./github-actions-security-checklist.md) lists the exposure of this repository secret as an open risk.

Without the secret, the workflow logs a warning and doesn't add a changeset. On a pull request that changes a package's runtime dependencies, the Changeset check then fails.

### Rotation

Rotation is advisory, because no workflow or check reads the tokens' expiry dates. A maintainer rotates each token before the expiry date set on it, and when the maintainer who created it leaves. The new expiry date in the token's settings is the record that a rotation happened. An expired token fails its run visibly: the Release job stops at its first call that uses the release token, and the Dependabot changeset run stops at its first API call.

## Dry run and manual fallback

Routine releases run in CI, as [Release schedule](./versioning-and-releases.md#release-schedule-release-pr-from-develop-to-main) describes. The dry run prints each release command without running it, so it doesn't change any file or push anything:

```bash
pnpm release:main --dry-run
```

With pending changesets, the dry run lists them and then exits 1 with "changeset version ran but no package versions changed", because it skipped the version step. So it can't preview a versioning release.

The manual fallback runs the release from a maintainer machine. `pnpm release:main` exits at once without `RELEASE_GITHUB_TOKEN` in the environment, and Trusted Publishing needs the OIDC token that only the release workflow gets. So export the token and sign in with `npm login` first. Run the fallback in a fresh clone of `main`, because the script points that clone's `origin` at a URL that contains the token and sets its git identity to `github-actions[bot]`. The clone has no dependencies or synced Vale styles yet, and `pnpm run check` needs both:

```bash
pnpm install --frozen-lockfile
pnpm vale:sync
pnpm run check
pnpm release:main
```

When a CI run pushed the release commit to `main` and stopped before it published, `main` has no pending changesets left, and `pnpm release:main` only heals tags and GitHub Releases. Publish the missing versions from a checkout of `main` instead. When the run stopped at the dependency audit, first resolve the advisory, or confirm that it is dev-only as [Classify impact first](./security-incident-triage.md#classify-impact-first) describes. The block's `pnpm audit --prod` step then fails on any high advisory left in a published package's dependencies. Give npm your 2FA code when it asks:

```bash
pnpm install --frozen-lockfile
pnpm audit --prod --audit-level=high
pnpm build
npm login
pnpm exec changeset publish --no-git-tag
```

`changeset publish` publishes each public package whose version npm doesn't have yet, and `--no-git-tag` leaves the tags to the Release run that the push of the release commit already started. That run waits for approval of the `release` environment. Leave it waiting until npm has the versions, then approve it, and it creates the missing tags and GitHub Releases. If that run is gone, start one from the Release workflow's manual trigger.
