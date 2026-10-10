# Cursor Cloud environment

Cursor cloud agents need a few extra setup steps in this repository, and their platform has limitations to plan around. [Local setup](./local-setup.md) has the toolchain, the bootstrap, the daily commands and the hooks that every checkout shares. This page adds only the cloud-specific setup and constraints.

The repository `AGENTS.md` (with `CLAUDE.md` as a symlink to it) stays short and links here for everything specific to Cursor cloud agents.

## Setting up a new cloud environment

A fresh cloud VM needs the same toolchain as [Local setup](./local-setup.md#requirements), plus a few cloud-specific steps:

1. **Startup update script.** `.cursor/environment.json` holds the `install` command that runs on every VM start: it fetches remote refs and runs `pnpm install`, then `pnpm skill:dev` so the agent loads this checkout's `mdcp` skill ([Agent Skill development](./agent-skill.md)). That committed file is the source of truth and overrides any dashboard-saved environment. Keep it minimal: no service startup or build steps.
2. **Vale peer binary.** Vale is a peer binary that `pnpm install` doesn't fetch. Install version 3.15.1 to `/usr/local/bin`, where it persists in the VM snapshot. The exact release command is in [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml).
3. **gitleaks peer binary.** gitleaks is also a peer binary, not an npm dependency; the pre-commit hook runs `gitleaks protect --staged` when it is on `PATH`. Install version 8.30.1 to `/usr/local/bin` (persists in the VM snapshot). If it goes missing, reinstall from the [gitleaks releases](https://github.com/gitleaks/gitleaks/releases): download `gitleaks_8.30.1_linux_x64.tar.gz` and extract the `gitleaks` binary into `/usr/local/bin` (same pattern as Vale). CI runs its own scan via `gitleaks-action`, so the local install is defense-in-depth.
4. **Bootstrap.** The update script doesn't build `dist/` or sync the Vale styles. Run the rest of [First-time bootstrap](./local-setup.md#first-time-bootstrap) on a new VM, and rebuild as that section says. The synced styles then persist in the snapshot.
5. **Node version.** The VM runs Node 22, which satisfies `engines >=18`, and CI uses Node 24. Do not switch Node unless a version-specific issue appears.

## Platform limitations and workarounds

These are cloud-agent constraints discovered in practice. Plan work around them rather than fighting them.

| Limitation                                                                                      | Workaround                                                                                                                                          |
| ----------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| The `gh` CLI is **read-only** for the agent; it cannot create or modify issues or pull requests | Use the dedicated pull-request tooling for PRs and PR comments. A human creates GitHub issues from agent-supplied text. Add `Closes #N` afterward.  |
| **No GitHub MCP** is available, and we do not add one in the cloud                              | Accept it. MCP servers load at session start and `.cursor/*` (except `environment.json`) is gitignored, so an agent cannot self-enable one mid-run. |
| A GitHub **PAT in Secrets is not wired** to `gh` or any agent tool                              | A PAT doesn't unblock issue creation in the cloud. Issue creation stays a human step.                                                               |
| The agent **cannot push to protected `main`** or merge the release PR                           | Work reaches `develop` by pushing a `land/**` branch through the land gate. A human merges the release PR into `main`.                              |

## Recording issues without issue-creation access

Because the agent cannot open GitHub issues, capture work items as ready-to-paste issue text (title, body with acceptance criteria, labels, and project fields per [Issue intake and labels](./issue-intake-and-labels.md)) in the commit message of the change that delivers the work. A maintainer creates the issue and links it with `Closes #N`.
