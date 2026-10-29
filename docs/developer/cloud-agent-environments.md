# Cloud agent environments

Coding agents run in cloud sessions on two hosts, Claude Code and Cursor, and each host prepares a session with a committed file that runs different steps. [Local setup](./local-setup.md) has the toolchain, the bootstrap, the daily commands and the hooks that every checkout shares. This page adds what each host runs and the limits of its sessions.

The repository `AGENTS.md` (with `CLAUDE.md` as a symlink to it) stays short and links here for everything specific to cloud agents.

On either host, work reaches `develop` by pushing a `claude/**` or `land/**` branch through the [land gate](./versioning-and-releases.md#landing-on-develop). A human merges the release PR into `main`.

## Claude Code

`.claude/settings.json` runs `.claude/hooks/session-start.sh` when a session starts. The script exits at once unless `CLAUDE_CODE_REMOTE` is `true`, so it runs only in a cloud session. There it runs the whole [First-time bootstrap](./local-setup.md#first-time-bootstrap) and installs the skill:

1. `pnpm install`
2. Vale into `/usr/local/bin`, when `vale` isn't on `PATH`. The script pins its own `VALE_VERSION`, the version [Requirements](./local-setup.md#requirements) names.
3. `pnpm run vale:sync`
4. `pnpm build`
5. `pnpm run skill:dev`, which installs this checkout's `merlon-docs` skill for the agent ([Agent Skill development](./agent-skill.md))

The docs scripts and the `merlon` CLI work once the script finishes. The script installs neither gitleaks nor Java. Without gitleaks the pre-commit hook prints a warning in place of its scan, and `pnpm formal:check` needs Java 17 or later on `PATH`. `.gitignore` keeps everything under `.claude/` out of the repository except `.claude/settings.json` and `.claude/hooks/session-start.sh`.

## Cursor

A fresh Cursor VM needs the same toolchain as [Local setup](./local-setup.md#requirements), plus a few cloud-specific steps:

1. **Startup update script.** `.cursor/environment.json` holds the `install` command that runs on every VM start: it fetches remote refs and runs `pnpm install`, then `pnpm skill:dev` so the agent loads this checkout's `merlon-docs` skill ([Agent Skill development](./agent-skill.md)). That committed file is the source of truth and overrides any dashboard-saved environment. Keep it minimal: no service startup or build steps.
2. **Vale peer binary.** Vale is a peer binary that `pnpm install` doesn't fetch. Install the version that [Requirements](./local-setup.md#requirements) gives to `/usr/local/bin`, where it persists in the VM snapshot. The exact release command is in [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml).
3. **gitleaks peer binary.** `pnpm install` doesn't fetch gitleaks either, and the pre-commit hook runs `gitleaks protect --staged` when it is on `PATH`. Install version 8.30.1 to `/usr/local/bin`, where it persists in the VM snapshot. If it goes missing, reinstall from the [gitleaks releases](https://github.com/gitleaks/gitleaks/releases): download `gitleaks_8.30.1_linux_x64.tar.gz` and extract the `gitleaks` binary into `/usr/local/bin` (same pattern as Vale). CI runs its own scan via `gitleaks-action`, so the local install is defense-in-depth.
4. **Bootstrap.** The update script doesn't build `dist/` or sync the Vale styles. Run the rest of [First-time bootstrap](./local-setup.md#first-time-bootstrap) on a new VM, and rebuild as that section says. The synced styles then persist in the snapshot.
5. **Node version.** The `engines` floor is Node 22.23.4, and CI uses Node 24. Check `node --version` first: on an older Node 22, every pnpm command prints an `Unsupported engine` warning, so update the image's Node before working. Do not switch Node unless a version-specific issue appears.

### Cursor limitations and workarounds

These are constraints of Cursor's cloud agents, found in practice. Plan work around them rather than fighting them.

| Limitation                                                                                      | Workaround                                                                                                                                                                                                                                            |
| ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The `gh` CLI is **read-only** for the agent; it cannot create or modify issues or pull requests | A landing doesn't open a PR, so read-only `gh` is enough for work to reach `develop`. A human creates GitHub issues from agent-supplied text, as [Recording issues](#recording-issues-without-issue-creation-access) says. Add `Closes #N` afterward. |
| **No GitHub MCP** is available, and we do not add one in the cloud                              | Accept it. MCP servers load at session start and `.cursor/*` (except `environment.json`) is gitignored, so an agent cannot self-enable one mid-run.                                                                                                   |
| A GitHub **PAT in Secrets is not wired** to `gh` or any agent tool                              | A PAT doesn't unblock issue creation in the cloud. Issue creation stays a human step.                                                                                                                                                                 |

### Recording issues without issue-creation access

Because the agent cannot open GitHub issues, capture work items as ready-to-paste issue text (title, body with acceptance criteria, labels, and project fields per [Issue intake and labels](./issue-intake-and-labels.md)) in the commit message of the change that delivers the work. A maintainer creates the issue and links it with `Closes #N`.
