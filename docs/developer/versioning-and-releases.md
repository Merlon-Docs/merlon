# Versioning and releases

mdcp uses [Semantic Versioning 2.0.0](https://semver.org/) and [Changesets](https://github.com/changesets/changesets) for predictable releases. **Each npm package and each Agent Skill versions independently** — a changeset only bumps the items it lists.

| Item        | Identifier                  | Published to                                                       |
| ----------- | --------------------------- | ------------------------------------------------------------------ |
| CLI         | `@bwilliamson/mdcp-cli`     | npm + GitHub Release                                               |
| Core        | `@bwilliamson/mdcp-core`    | npm + GitHub Release                                               |
| Presets     | `@bwilliamson/mdcp-presets` | npm + GitHub Release                                               |
| Agent Skill | `@bwilliamson/skill-<id>`   | GitHub Release only (private carrier under `packages/skill-<id>/`) |

Independent versioning is configured in [`.changeset/config.json`](../../.changeset/config.json) (`fixed` is empty). Dependents of a bumped workspace package still get a **patch** internal dependency update (`updateInternalDependencies`).

## Branches

| Branch     | Role                                                                    | Who merges into it                                     |
| ---------- | ----------------------------------------------------------------------- | ------------------------------------------------------ |
| `develop`  | Integration trunk. Work lands here without a PR once it passes the gate | `claude/**` and `land/**` pushes, and Dependabot PRs   |
| `main`     | Protected release branch. `npx skills add` installs from it             | Release PRs from `develop`, and `hotfix/*` branches    |
| `hotfix/*` | An urgent fix cut from `main` that can't wait for the next release      | Merged to `main`; the sync job carries it to `develop` |

### Landing on `develop`

Pushing to a branch named `claude/**` or `land/**` runs the [land workflow](../../.github/workflows/land-develop.yml). It merges the current `develop` into the pushed commit and runs the same gate as CI's Check and Changeset jobs on the result. When the gate passes, it pushes that tested merge to `develop`. When the branch changes anything under `formal/` or the formal-check scripts, the gate also runs `pnpm formal:check`, as CI's Formal models job does. There is no PR to open, review or merge.

- **Evidence lives with the work.** Put what was measured or verified in the commit message, or in a research record for larger results. The run summary lists the commits each landing brought in.
- **A failed gate lands nothing.** Fix the branch and push again. The same applies when the branch conflicts with `develop` or when `develop` moved during the run.
- **Landings run one at a time**, and each one pushes only the tree that passed its gate. Other paths move `develop` without the gate. The sync from `main` always does. A merged Dependabot PR does unless a branch rule makes PRs into `develop` up to date, and a maintainer can push directly unless a rule blocks it. A PR moved from `main` to `develop` can merge on its run against `main` even under the up-to-date rule, because CI does not rerun when a PR's base changes. [Formal models](./formal-models.md#landing-and-release) shows which guards close each of those paths.
- **Some scans wait for the release PR.** Gitleaks scans the pushed branch before it lands. The landing is pushed with the workflow's own `GITHUB_TOKEN`, and GitHub starts no workflows for such pushes, so CodeQL and Zizmor first see landed work on the release PR. A finding there is fixed forward on `develop`.
- **Review happens once**, on the release PR from `develop` to `main`.

Dependabot still opens PRs against `develop`, because its changes come from outside the project.

`main` stays the repository's default branch because skills.sh installs from it, so GitHub proposes `main` as the base of a new PR. The **Release source** check fails any PR into `main` whose head is not `develop` or `hotfix/*`, and blocks the merge where `main`'s branch rule requires it. It runs from its own [workflow](../../.github/workflows/release-source.yml) so that it also runs when a PR's base changes to `main`, which CI does not.

Changesets accumulate on `develop` with the work they describe. Nothing is versioned or published until a release PR reaches `main`.

## Release schedule (release PR from `develop` to `main`)

There is **no calendar cadence** and **no Version Packages PR**. A release is a PR from `develop` to `main`, followed by **one CI job**:

1. Contributors add a changeset with each change landed on `develop` that affects a published package or skill.
2. When `develop` is tested and ready, open a PR from `develop` to `main` and merge it with a **merge commit**. Squashing would give `main` history that `develop` lacks.
3. The merge runs the [release workflow](../../.github/workflows/release.yml) (`pnpm release:main`). After the **Release plan** job posts pending changesets (and any **missing GitHub Releases**) to the run summary, approve the **`release` environment**. The version job **resets to the current `origin/main` tip** (so post-approval work includes all merged changesets), then **sequentially**: applies changesets → syncs skill `metadata.version` → builds (so husky can run) → commits `chore: release` → **pushes to `main`** → publishes public packages to npm → **pushes tags** → creates GitHub Releases (including skill carriers).
4. Every push to `main` runs the [sync workflow](../../.github/workflows/sync-develop.yml), which merges `main` back into `develop` so the release commit and any hotfix reach the trunk. A clean merge is pushed with the workflow's own `GITHUB_TOKEN`. A conflict opens a PR from `main` to `develop` instead.

**Latest main wins:** concurrency does **not** cancel an in-flight publish (`cancel-in-progress: false`). The Release plan job **cancels** other Release runs on `main` that are still **waiting** (env approval) or **queued**. If `main` moves during the short version window, `pnpm release:main` aborts the push with a superseded message (no force-push).

If a prior run versioned/published but failed before tags/Releases finished, the next Release plan detects **missing** `name@version` git tags and/or GitHub Releases and the release job **heals** them without bumping versions again (tag + `gh release create … --target` at the commit that last changed that package’s `package.json`).

**Skills** are under `skills/`, the directory that `npx skills add` installs from. Version carriers and CHANGELOGs are kept under **`packages/skill-<id>/`** only, never under `skills/`, because those files would pollute agent context on install. `pnpm release:main` syncs the carrier version into `skills/<id>/SKILL.md` `metadata.version`. Skill changes need a changeset. See [When to add a changeset](#when-to-add-a-changeset).

## Pre-1.0 policy (`0.x.y`)

Packages and skills are **pre-1.0** while on `0.x.y`. Until an item reaches **1.0.0**, that item has **no API stability guarantee**. **Major bumps are disabled** (`pnpm changeset:reject-major`). Use **patch**, **minor** (including breaking-within-0.x), or **build** via `pnpm release:build`.

| Bump      | When                                                                       |
| --------- | -------------------------------------------------------------------------- |
| **patch** | Bug fixes, internal refactors with no intended API change                  |
| **minor** | New capabilities, or breaking-within-0.x until majors are opened           |
| **build** | Republish without API change (`0.1.0-build.1`, …) via `pnpm release:build` |

## Release checklist (maintainers)

1. Confirm pending `.changeset/*.md` files name only the packages/skills that should bump.
2. **Skills policy:** `mdcp` remains the only consumer skill; keep `skills/mdcp-arch-*` as `metadata.internal: true` until intentionally published (see [Agent Skill development](./agent-skill.md#skillsshjson-repo-page-layout)).
3. Ensure secret **`RELEASE_GITHUB_TOKEN`** is set (maintainer PAT with Contents + metadata for releases/push) — see [Publishing](./publishing.md).
4. Merge a release PR from `develop` to `main` with a merge commit. Approve the **`release` environment** deployment when prompted.
5. Verify GitHub Releases for each bumped item (npm packages and `@bwilliamson/skill-*`) and npm for public packages.
6. Confirm the **Sync develop** run merged the release commit into `develop`.

## Durable docs vs pending changesets

Pending `.changeset/*.md` files are temporary. Point consumers at package CHANGELOGs under `packages/*/` or GitHub Releases — never at pending changesets. Skill CHANGELOGs live under `packages/skill-<id>/CHANGELOG.md`, not under `skills/`.

## When to add a changeset

Run `pnpm changeset` when a change touches:

- `packages/mdcp-core/src/**` → `@bwilliamson/mdcp-core`
- `packages/mdcp-cli/src/**` → `@bwilliamson/mdcp-cli`
- `packages/mdcp-presets/*.jsonc` → `@bwilliamson/mdcp-presets`
- **`skills/<id>/**`** → `@bwilliamson/skill-<id>` (carrier under `packages/skill-<id>/`)

**Do not** put `package.json` or `CHANGELOG.md` under `skills/`. **Do not** hand-edit `skills/*/SKILL.md` `metadata.version`.

The land gate and CI on pull requests both run `pnpm changeset:reject-major` and `pnpm changeset:status`.

## Dependabot

| Dependabot PR type                        | Changeset / merge gate                                  |
| ----------------------------------------- | ------------------------------------------------------- |
| Runtime deps in `packages/*/package.json` | **Human approval** + **patch** changeset (added by bot) |
| `devDependencies` only, or GitHub Actions | No changeset                                            |

The Dependabot changeset workflow writes the patch changeset for you. When a Dependabot PR changes `dependencies`, `peerDependencies` or `optionalDependencies` in a `packages/*/package.json`, it commits `.changeset/dependabot-pr-<n>.md` to the PR branch, and CI re-runs on that commit. The workflow lives in [`.github/workflows/dependabot-changeset.yml`](../../.github/workflows/dependabot-changeset.yml) and runs [`scripts/dependabot-changeset.mjs`](../../scripts/dependabot-changeset.mjs). It runs on `pull_request_target` from the base branch and reads the PR's manifests through the API as data; it never checks out or runs the PR's code.

The push needs the repository secret `DEPENDABOT_CHANGESET_TOKEN`: a fine-grained personal access token with **Contents: read and write** on this repository only. A commit made with the default `GITHUB_TOKEN` would not start CI, leaving the required checks pending. Without the secret the workflow logs a warning and adds nothing, and the Changeset check fails as before.

Once the workflow has committed to a PR, Dependabot stops rebasing it on its own. Comment `@dependabot rebase` to refresh it; the rebase drops the changeset commit and the workflow adds it again.

## Related docs

- [Publishing](./publishing.md)
- [Agent Skill](./agent-skill.md)
- [.changeset/README.md](../../.changeset/README.md)
