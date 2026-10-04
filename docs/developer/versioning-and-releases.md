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
- **A failed gate lands nothing.** Fix the branch and push again, and do the same when it conflicts with `develop`. Only one run waits behind the running one, so a newer landing or sync cancels the waiting run. When that happens, or when `develop` moved during the run, re-run all jobs of the workflow, or push a new commit to the branch. After `develop` moves, re-running only the failed job reuses the old `develop` and fails again. Pushing a branch whose tip hasn't changed doesn't start a run.
- **Landings run one at a time**, and each one pushes only the tree that passed its gate. A clean sync from `main` goes through the same gate. Other paths move `develop` without the gate. A merged PR, from Dependabot or from the sync when `main` conflicts, does unless a branch rule makes PRs into `develop` up to date, and a maintainer can push directly unless a rule blocks it. When a PR's base changes from `main` to `develop`, CI runs again against `develop`. [Formal models](./formal-models.md#landing-and-release) shows which guards close each of those paths.
- **Some scans wait for the release PR.** Gitleaks scans the pushed branch before it lands. The landing is pushed with the workflow's own `GITHUB_TOKEN`, and GitHub starts no workflows for such pushes, so CodeQL and Zizmor first see landed work on the release PR. A finding there is fixed forward on `develop`.
- **Review happens once**, on the release PR from `develop` to `main`.

Dependabot still opens PRs against `develop`, because its changes come from outside the project.

`main` stays the repository's default branch because skills.sh installs from it, so GitHub proposes `main` as the base of a new PR. The **Release source** check fails any PR into `main` whose head is not `develop` or `hotfix/*`, and blocks the merge where `main`'s branch rule requires it. It runs from its own [workflow](../../.github/workflows/release-source.yml), which runs only on PRs into `main`, including a PR whose base changes to `main`.

## Release schedule (release PR from `develop` to `main`)

There is **no calendar cadence** and **no Version Packages PR**. A release is a PR from `develop` to `main`, followed by **one CI job**:

1. Changesets reach `develop` with the landings they describe ([When to add a changeset](#when-to-add-a-changeset)). The release workflow versions and publishes only after a release PR reaches `main`.
2. When `develop` is tested and ready, confirm that the pending `.changeset/*.md` files list only the packages and skills that should bump, and that each unreleased skill is still internal, as [Publishing the skill pack](./agent-skill.md#publishing-the-skill-pack) requires. Then open a PR from `develop` to `main` and merge it with a **merge commit**. Squashing would give `main` history that `develop` lacks.
3. The merge runs the [release workflow](../../.github/workflows/release.yml) (`pnpm release:main`), which needs the `RELEASE_GITHUB_TOKEN` secret described in [Publishing](./publishing.md). The **Release plan** job posts the pending changesets (and any **missing GitHub Releases**) to the run summary. Read that summary on the latest run to review the bumps and release notes, then approve the **`release` environment** there. The version job **resets to the current `origin/main` tip** (so post-approval work includes all merged changesets), then **sequentially**: applies changesets → syncs skill `metadata.version` → builds (so husky can run) → commits `chore: release` → **pushes to `main`** → publishes public packages to npm → **pushes tags** → creates GitHub Releases (including skill carriers).
4. Every push to `main` runs the [sync workflow](../../.github/workflows/sync-develop.yml), which merges `main`, with the release commit and any hotfix, back into `develop`. A clean merge is pushed to the `land/sync-main` branch, and the sync dispatches the land workflow on it. The merge goes to `develop` only after it passes the gate. If the gate fails, `develop` doesn't get `main`'s commits until someone fixes the failure. They can merge `main` into a `land/**` branch other than `land/sync-main` and fix it there, or land the fix on `develop` and run **Sync develop** again. The next sync overwrites `land/sync-main`, so a fix pushed there is lost. A conflict opens a PR from `main` to `develop` instead. Resolve it the same way, by merging `main` into a `land/**` branch other than `land/sync-main`. The PR itself can't take the fix, because its head is the protected `main`. Once `develop` contains `main`, the PR closes as merged.
5. Check that each bumped item, skill carriers included, has a GitHub Release and that npm shows the new version of each public package. Then confirm that the land workflow's run on `land/sync-main` put the release commit on `develop`. A landing queued after it can cancel it while it waits, and it fails when `develop` moves during the run. In either case, re-run all of its jobs or run **Sync develop** again.
6. When a workflow change reached `develop` after the previous sync, check that the sync's push to `land/sync-main` went through. The sync pushes with `GITHUB_TOKEN`, which can't be given the `workflows` permission, and its force-push includes every workflow change `develop` gained since that sync. If the push was refused, reset `land/sync-main` to `develop` with your own access and run **Sync develop** again. Its push then includes only what `main` adds.

**Latest main wins:** concurrency does **not** cancel an in-flight publish (`cancel-in-progress: false`). The Release plan job **cancels** other Release runs on `main` that are still **waiting** (env approval) or **queued**. If `main` moves during the short version window, `pnpm release:main` aborts the push with a superseded message (no force-push).

If a prior run versioned/published but failed before tags/Releases finished, the next Release plan detects **missing** `name@version` git tags and/or GitHub Releases and the release job **heals** them without bumping versions again (tag + `gh release create … --target` at the commit that last changed that package’s `package.json`).

**Skills** are under `skills/`, the directory that `npx skills add` installs from. Each skill versions through a private carrier package in `packages/skill-<id>/`, which holds its `package.json` and CHANGELOG. Keep both files out of `skills/`, because every install would copy them into agent context. `pnpm release:main` syncs the carrier version into `skills/<id>/SKILL.md` `metadata.version`, so never edit that field by hand.

## Pre-1.0 policy (`0.x.y`)

Packages and skills are **pre-1.0** while on `0.x.y`. Until an item reaches **1.0.0**, that item has **no API stability guarantee**. **Major bumps are disabled** (`pnpm changeset:reject-major`). Use **patch**, **minor** (including breaking-within-0.x), or **build** via `pnpm release:build`.

| Bump      | When                                                                       |
| --------- | -------------------------------------------------------------------------- |
| **patch** | Bug fixes, internal refactors with no intended API change                  |
| **minor** | New capabilities, or breaking-within-0.x until majors are opened           |
| **build** | Republish without API change (`0.1.0-build.1`, …) via `pnpm release:build` |

## Durable docs vs pending changesets

Pending `.changeset/*.md` files are temporary. Point consumers at package CHANGELOGs under `packages/*/` or at GitHub Releases, never at pending changesets.

A notice to consumers about removed or breaking behavior goes in the changeset. The release turns it into a package CHANGELOG entry.

## When to add a changeset

Run `pnpm changeset` when a change touches a published item:

- any file under `packages/mdcp-core/` → `@bwilliamson/mdcp-core`
- any file under `packages/mdcp-cli/` → `@bwilliamson/mdcp-cli`
- any file under `packages/mdcp-presets/` → `@bwilliamson/mdcp-presets`
- any file under `skills/<id>/` or `packages/skill-<id>/` → `@bwilliamson/skill-<id>`

Every file in those paths counts, tests and compiled READMEs included, so a shard edit that changes `packages/mdcp-cli/README.md` or `packages/mdcp-core/README.md` needs a changeset for that package. The skill carriers count although they are private, because `.changeset/config.json` sets `privatePackages.version`. A change that edits only `devDependencies` in a package's `package.json` is exempt. `packages/mdcp-site/` is never published, and Changesets ignores it.

The land gate and CI on pull requests both run `pnpm changeset:reject-major` and `pnpm changeset:status`. For a package path, the status check fails unless the branch adds or edits a changeset. For `skills/<id>/` it fails only when no changeset is pending, so add one for the skill even when `develop` already has others. The status check passes any branch that consumed a changeset, and then it doesn't check the branch's own package changes either. A branch consumed one when its diff from the base deletes a changeset, as release and sync diffs do, or when its commits since the base include a release commit that deleted one. That release commit counts even when the changeset was never on the base, which happens to a sync when the hotfix sync before it didn't land.

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
