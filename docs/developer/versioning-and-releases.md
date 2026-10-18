# Versioning and releases

Merlon Docs uses [Semantic Versioning 2.0.0](https://semver.org/) and [Changesets](https://github.com/changesets/changesets) for predictable releases. **Each npm package and each Agent Skill versions independently** — a changeset only bumps the items it lists.

| Item        | Identifier                         | Published to                                                       |
| ----------- | ---------------------------------- | ------------------------------------------------------------------ |
| CLI         | `@merlon-docs/merlon-docs-cli`     | npm + GitHub Release                                               |
| Core        | `@merlon-docs/merlon-docs-core`    | npm + GitHub Release                                               |
| Presets     | `@merlon-docs/merlon-docs-presets` | npm + GitHub Release                                               |
| Agent Skill | `@merlon-docs/skill-<id>`          | GitHub Release only (private carrier under `packages/skill-<id>/`) |

The CLI's newest final release is the repository's Latest release on GitHub. The release job creates every other final release with `--latest=false`, so a release that doesn't bump the CLI leaves the badge where it is, and it marks each prerelease as a prerelease.

Independent versioning is configured in [`.changeset/config.json`](../../.changeset/config.json) (`fixed` is empty). Dependents of a bumped workspace package still get a **patch** internal dependency update (`updateInternalDependencies`).

## Branches

| Branch     | Role                                                               | Who merges into it                                             |
| ---------- | ------------------------------------------------------------------ | -------------------------------------------------------------- |
| `develop`  | Integration trunk. Work lands here once it passes the gate         | `claude/**` and `land/**` pushes, topic PRs and Dependabot PRs |
| `main`     | Protected release branch. `npx skills add` installs from it        | Release PRs from `develop`, and `hotfix/*` branches            |
| `hotfix/*` | An urgent fix cut from `main` that can't wait for the next release | Merged to `main`; the sync job carries it to `develop`         |

### Landing on `develop`

Pushing to a branch named `claude/**` or `land/**` runs the [land workflow](../../.github/workflows/land-develop.yml). It merges the current `develop` into the pushed commit and runs the same gate as CI's Check and Changeset jobs on the result. When the gate passes, it pushes that tested merge to `develop`. When the branch changes anything under `formal/` or the formal-check scripts, the gate also runs `pnpm formal:check`, as CI's Formal models job does. There is no PR to open, review or merge.

- **Evidence lives with the work.** Put what was measured or verified in the commit message, or in a research record for larger results. The run summary lists the commits each landing brought in.
- **A failed gate lands nothing.** Fix the branch and push again, and do the same when it conflicts with `develop`. Only one run waits behind the running one, so a newer landing or sync cancels the waiting run. When that happens, or when `develop` moved during the run, re-run all jobs of the workflow, or push a new commit to the branch. After `develop` moves, re-running only the failed job reuses the old `develop` and fails again. Pushing a branch whose tip hasn't changed doesn't start a run.
- **Landings run one at a time**, and each one pushes only the tree that passed its gate. A clean sync from `main` goes through the same gate. Other paths move `develop` without the gate. A merged PR, from Dependabot or from the sync when `main` conflicts, does unless a branch rule makes PRs into `develop` up to date, and a maintainer can push directly unless a rule blocks it. When a PR's base changes from `main` to `develop`, CI runs again against `develop`. [Formal models](./formal-models.md#landing-and-release) shows which guards close each of those paths.
- **The gate doesn't wait for scans.** Gitleaks scans every `claude/**` and `land/**` push, in parallel with the land run, and every pull request that isn't a draft. The landing is pushed with the workflow's own `GITHUB_TOKEN`, and GitHub doesn't start workflows for such pushes. The scan's push trigger lists only `claude/**` and `land/**`, so the release commit's push to `main` and a push to a `hotfix/*` branch aren't scanned until they reach a pull request. The `Scan` check that `main`'s branch rule requires runs on the pull request. CodeQL and Zizmor first see landed work on the release PR. A finding from any of the three is fixed forward on `develop`.
- **Stakeholder review happens on topic PRs.** A push to `claude/**` or `land/**` lands without review, so put a change that someone should review on a topic branch instead, as [Reviewing a change](#reviewing-a-change) says.

Dependabot still opens PRs against `develop`, because its changes come from outside the project.

### Reviewing a change

Give a reviewer one concern at a time. Push the change to a topic branch, any name outside `claude/**` and `land/**`, open a draft PR into `develop`, mark it ready when the work is done, and squash-merge it after review. The reviewer sees only that change: its commits, its Files changed tab and its discussion.

The release PR from `develop` to `main` then bundles changes that were already reviewed. Review it on its Files changed tab. Its Commits tab lists the commits since the last release, because the sync resets `develop` to `main` after each release.

### Pull requests

Open a pull request as a draft, and mark it ready once, when its work is done. CI, CodeQL, Zizmor and the gitleaks scan skip a draft, so a push to a draft runs only the Release source check. Marking the PR ready runs them, and each push after that runs them again. GitHub won't merge a draft, so the skipped runs can't let one merge. Moving a ready PR back to draft and marking it ready again repeats the full run, so leave a PR in draft until it is ready. Dependabot opens its PRs as ready, and CI runs on them at once.

CI doesn't assume that a contributor ran the [git hooks](./local-setup.md#git-hooks). The pre-push hook runs the land gate's checks before a push, which catches a failure before CI spends a run on it.

`main` stays the repository's default branch because skills.sh installs from it, so GitHub proposes `main` as the base of a new PR. The **Release source** check fails any PR into `main` whose head is not `develop` or `hotfix/*`, and blocks the merge where `main`'s branch rule requires it. It runs from its own [workflow](../../.github/workflows/release-source.yml), which runs only on PRs into `main`, including a PR whose base changes to `main`.

## Release schedule (release PR from `develop` to `main`)

There is **no calendar cadence** and **no Version Packages PR**. A release is a PR from `develop` to `main`, followed by **one CI job**:

1. Changesets reach `develop` with the landings they describe ([When to add a changeset](#when-to-add-a-changeset)). The release workflow versions and publishes only after a release PR reaches `main`.
2. When `develop` is tested and ready, confirm that the pending `.changeset/*.md` files list only the packages and skills that should bump. Then open a PR from `develop` to `main` and **squash** it, the only merge method the repository allows. `main` then holds one commit per release, and the sync resets `develop` to it, as step 4 says, so each release PR lists only the commits since the last release. Review it on its Files changed tab, as [Reviewing a change](#reviewing-a-change) says.
3. The merge runs the [release workflow](../../.github/workflows/release.yml) (`pnpm release:main`), which needs the `RELEASE_GITHUB_TOKEN` secret described in [Publishing](./publishing.md). The **Release plan** job posts the pending changesets (and any **missing GitHub Releases**) to the run summary. Read that summary on the latest run to review the bumps and release notes, then approve the **`release` environment** there. The version job **resets to the current `origin/main` tip** (so post-approval work includes all merged changesets), then **sequentially**: applies changesets → syncs skill `metadata.version` → runs `pnpm skill:validate` → builds → runs `pnpm typecheck` and `pnpm test` → commits `chore: release` → **pushes to `main`** → runs the dependency audit `pnpm audit --audit-level=high` → publishes public packages to npm → **pushes tags** → creates GitHub Releases, the skill's included.
4. Every push to `main` runs the [sync workflow](../../.github/workflows/sync-develop.yml). After a squashed release, `develop` usually holds exactly `main`'s files, and the sync resets `develop` to `main`. That drops the old history from `develop`, so the next release PR lists only new commits. It pushes with a lease on the `develop` commit it compared, so a landing in between makes the reset fail instead of disappearing; run **Sync develop** again. When `develop` has commits `main` lacks, the sync merges `main` into it instead, and the rest of this step applies. A clean merge is pushed to the `land/sync-main` branch, and the sync dispatches the land workflow on it. The merge goes to `develop` only after it passes the gate. If the gate fails, `develop` doesn't get `main`'s commits until someone fixes the failure. They can merge `main` into a `land/**` branch other than `land/sync-main` and fix it there, or land the fix on `develop` and run **Sync develop** again. The next sync overwrites `land/sync-main`, so a fix pushed there is lost. A conflict opens a PR from `main` to `develop` instead. Resolve it the same way, by merging `main` into a `land/**` branch other than `land/sync-main`. The PR itself can't take the fix, because its head is the protected `main`. Once `develop` contains `main`, the PR closes as merged.
5. Check that each bumped item, skill carriers included, has a GitHub Release and that npm shows the new version of each public package. Then confirm that the sync reset `develop` to `main`, or, when it merged instead, that the land workflow's run on `land/sync-main` put the release commit on `develop`. A landing queued after it can cancel it while it waits, and it fails when `develop` moves during the run. In either case, re-run all of its jobs or run **Sync develop** again.
6. When a workflow change reached `develop` after the previous sync, check that the sync's push to `land/sync-main` went through. The sync pushes with `GITHUB_TOKEN`, which can't be given the `workflows` permission, and its force-push includes every workflow change `develop` gained since that sync. If the push was refused, reset `land/sync-main` to `develop` with your own access and run **Sync develop** again. Its push then includes only what `main` adds.

**Latest main wins:** concurrency does **not** cancel an in-flight publish (`cancel-in-progress: false`). The Release plan job **cancels** other Release runs on `main` that are still **waiting** (env approval) or **queued**. If `main` moves during the short version window, `pnpm release:main` aborts the push with a superseded message (no force-push).

On a run without pending changesets, the Release plan detects **missing** `name@version` git tags and GitHub Releases, and the release job **heals** them without bumping versions again (tag + `gh release create … --target` at the commit that last changed that package’s `package.json`). Heal restores tags and GitHub Releases, not npm packages. The audit runs after the push to `main`. When it fails on a new advisory, `main` holds versions that npm never received. [Dry run and manual fallback](./publishing.md#dry-run-and-manual-fallback) says how to publish them.

**Skills** are under `skills/`, the directory that `npx skills add` installs from. Each skill versions through a private carrier package in `packages/skill-<id>/`, which holds its `package.json` and CHANGELOG. Keep both files out of `skills/`, because every install would copy them into agent context. `pnpm release:main` syncs the carrier version into `skills/<id>/SKILL.md` `metadata.version`, so never edit that field by hand.

## Pre-1.0 policy (`0.x.y`)

Packages and skills are **pre-1.0** while on `0.x.y`. Until an item reaches **1.0.0**, that item has **no API stability guarantee**. On `0.x.y`, a breaking change is a **minor** bump. A **major** changeset takes an item to **1.0.0**, and from then on a breaking change needs a major. A `1.0.0-draft.N` prerelease has no stability guarantee either.

| Bump      | When                                                          |
| --------- | ------------------------------------------------------------- |
| **patch** | Bug fixes, internal refactors with no intended API change     |
| **minor** | New capabilities, or a breaking change on `0.x.y`             |
| **major** | The move to 1.0.0, then any breaking change from 1.0.0 onward |

## Prereleases

While `.changeset/pre.json` says `"mode": "pre"`, the repository is in Changesets prerelease mode. Each release then versions the items it bumps as prereleases of the line's tag, such as `1.0.0-draft.N` for the `draft` line, publishes them under that npm dist-tag, and marks their GitHub Releases as prereleases. `changeset version` moves each changeset it consumes into `.changeset/pre/`; leave the files there, because the final release reads them to write each item's CHANGELOG entry. The changeset status check counts a moved changeset as consumed. `pnpm release:build` refuses a prerelease version.

`pnpm changeset pre exit` ends a line by setting `"mode": "exit"`. The next release then versions each item the line drafted at its final version, publishes it under `latest`, and deletes `.changeset/pre/` and `pre.json`. The `draft` line ended this way at 1.0.0, so every package and skill carrier releases as `1.0.0`. `pnpm changeset pre enter <tag>` starts a new prerelease line.

## Durable docs vs pending changesets

Pending `.changeset/*.md` files are temporary. Point consumers at package CHANGELOGs under `packages/*/` or at GitHub Releases, never at pending changesets. `pnpm docs:check` fails on a link from a Markdown file under `docs/` to anything under `.changeset/` other than `README.md` and `config.json`. Its first step, `pnpm docs:lint:changeset-links`, runs that check.

A notice to consumers about removed or breaking behavior goes in the changeset. The release turns it into a package CHANGELOG entry.

## When to add a changeset

Run `pnpm changeset` when a change touches a published item:

- any file under `packages/merlon-docs-core/` → `@merlon-docs/merlon-docs-core`
- any file under `packages/merlon-docs-cli/` → `@merlon-docs/merlon-docs-cli`
- any file under `packages/merlon-docs-presets/` → `@merlon-docs/merlon-docs-presets`
- any file under `skills/<id>/` or `packages/skill-<id>/` → `@merlon-docs/skill-<id>`

Every file in those paths counts, tests and compiled READMEs included, so a shard edit that changes `packages/merlon-docs-cli/README.md` or `packages/merlon-docs-core/README.md` needs a changeset for that package. The skill carriers count although they are private, because `.changeset/config.json` sets `privatePackages.version`. A change that edits only `devDependencies` in a package's `package.json` is exempt. `packages/merlon-docs-site/` is never published, and Changesets ignores it.

The land gate and CI on pull requests both run `pnpm changeset:status`. For a package path, the status check fails unless the branch adds or edits a changeset. For `skills/<id>/` it fails only when no changeset is pending, so add one for the skill even when `develop` already has others. The status check passes any branch that consumed a changeset, and then it doesn't check the branch's own package changes either. A branch consumed one when its diff from the base deletes a changeset, as release and sync diffs do, or when its commits since the base include a release commit that deleted one. That release commit counts even when the changeset was never on the base, which happens to a sync when the hotfix sync before it didn't land.

## Dependabot

| Dependabot PR type                        | Changeset / merge gate                                  |
| ----------------------------------------- | ------------------------------------------------------- |
| Runtime deps in `packages/*/package.json` | **Human approval** + **patch** changeset (added by bot) |
| `devDependencies` only, or GitHub Actions | No changeset                                            |

The Dependabot changeset workflow writes the patch changeset for you. When a Dependabot PR changes `dependencies`, `peerDependencies` or `optionalDependencies` in a `packages/*/package.json`, it commits `.changeset/dependabot-pr-<n>.md` to the PR branch, and CI re-runs on that commit. The workflow lives in [`.github/workflows/dependabot-changeset.yml`](../../.github/workflows/dependabot-changeset.yml) and runs [`scripts/dependabot-changeset.mjs`](../../scripts/dependabot-changeset.mjs). It runs on `pull_request_target` from the base branch and reads the PR's manifests through the API as data; it never checks out or runs the PR's code.

The push uses the `DEPENDABOT_CHANGESET_TOKEN` secret that [Dependabot changeset token](./publishing.md#dependabot-changeset-token) sets up, so that the commit starts CI.

Once the workflow has committed to a PR, Dependabot stops rebasing it on its own. Comment `@dependabot rebase` to refresh it; the rebase drops the changeset commit and the workflow adds it again.

## Related docs

- [Publishing](./publishing.md)
- [Agent Skill](./agent-skill.md)
