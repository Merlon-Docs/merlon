# AGENTS.md

Instructions for coding agents in this repository. `CLAUDE.md` is a symlink to this file, and every agent reads the same text.

## Project

This is the Merlon Docs monorepo: a documentation-system Agent Skill plus a TypeScript toolchain in pnpm workspaces. The application is the `merlon` CLI in `packages/merlon-docs-cli`, built on `packages/merlon-docs-core` and driven through `pnpm` scripts. The repository deploys no server, only the static docs site. Locally, `pnpm site:dev` serves that site.

## Shard discipline (critical)

Documentation is sharded under `docs/`. Shards are the source of truth and compiled output is generated. **Never hand-edit compiled files.** Edit the source shard under `docs/` and run `pnpm docs:compile:repo`. A file with `<!-- merlon-shard: start ... -->` markers is compiled output, and each marker gives the path of its source shard. [Guide directories](docs/developer/docs-dogfooding.md#guide-directories) lists every compiled output and its shard directory. CI recompiles every guide and fails when `git diff` shows a stale compiled file.

## Before you run anything

Run `pnpm build` after a fresh checkout and after editing `packages/*/src`, before any docs script or CLI command. [First-time bootstrap](docs/developer/local-setup.md#first-time-bootstrap) has the rest of the setup, and [Requirements](docs/developer/local-setup.md#requirements) lists the toolchain, including Vale for the docs checks and Java for the formal models.

## Commands

```bash
pnpm install             # dependencies (packageManager is pinned in package.json)
pnpm build               # build every package
pnpm test                # unit tests
pnpm typecheck
pnpm lint
pnpm format:check
pnpm docs:compile:repo   # recompile every compiled output
pnpm docs:check          # compile and check the repo docs and the examples
pnpm run check           # typecheck, lint, format:check, build, test, skill:validate, docs:check
pnpm formal:check        # the Alloy models in formal/alloy/
```

[Local setup](docs/developer/local-setup.md) says how CI's checks differ from `pnpm run check`.

## Pull requests and hooks

Open every pull request as a draft, and mark it ready once, when the work is done. CI skips drafts, as [Pull requests](docs/developer/versioning-and-releases.md#pull-requests) explains. The pre-commit hook runs fast offline checks, and the pre-push hook runs the full gate. [Git hooks](docs/developer/local-setup.md#git-hooks) lists what each one runs.

## Issues, labels, and the public roadmap

Work is tracked in GitHub, not in ad-hoc markdown backlogs.

| Surface                         | URL                                            |
| ------------------------------- | ---------------------------------------------- |
| Issues                          | https://github.com/Merlon-Docs/merlon/issues   |
| Public roadmap (Project)        | https://github.com/orgs/Merlon-Docs/projects/1 |
| Release PR (`develop` → `main`) | https://github.com/Merlon-Docs/merlon/pulls    |

Before you edit code for a scoped task, load a **WORK_ITEM** (issue number or URL) and follow [Agent work-item tracking](docs/developer/agent-work-item-tracking.md). When you open or first touch an issue, complete [New issue intake](docs/developer/issue-intake-and-labels.md#new-issue-intake-required): one `priority:*` label, type/component labels, a `track:*` label when the roadmap area is clear, **Status** on the org project board, and a milestone when the issue belongs to the current delivery cut.

During a release window, keep **only the develop → main release PR** open; close or land other pull requests so review and CI focus on that train. Dependabot stacks can be closed and refreshed on `develop` after the release lands.

Maintainers with `project` scope on `gh` can backfill board items with `node scripts/populate-github-project.mjs --open-only`. Agents without project scope should still fix labels and leave a comment if an issue is missing from the board.

## Developer guides

- [Versioning and releases](docs/developer/versioning-and-releases.md) covers how work reaches `develop` and how releases reach `main`.
- [Formal models](docs/developer/formal-models.md) lists the guards that keep both branches tested.
- [Agent Skill development](docs/developer/agent-skill.md) covers skill source under `skills/`, and why `.agents/skills/` is never hand-edited.
- [Cloud agent environments](docs/developer/cloud-agent-environments.md) covers cloud agent setup and limits.

## Code of conduct

This project follows the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md).
