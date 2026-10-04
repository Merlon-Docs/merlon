# Cursor Cloud environment

How this repository behaves inside Cursor cloud agents: how to stand up a new cloud environment, and the platform limitations to plan around. For the standard local toolchain and daily commands, read [Local setup](#local-setup) — this section only adds cloud-specific setup and constraints.

Durable, machine-facing notes for future agents also live in the repository `AGENTS.md` under "Cursor Cloud specific instructions". Keep the two in sync: this guide is the human-facing explanation; `AGENTS.md` is the short agent checklist.

## Setting up a new cloud environment

A fresh cloud VM needs the same toolchain as [Local setup](#local-setup), plus a few cloud-specific steps:

1. **Startup update script.** `.cursor/environment.json` holds the `install` command that runs on every VM start: it fetches remote refs, runs `pnpm install`, then runs `pnpm skill:dev` so the agent loads this checkout's `mdcp` skill ([Agent Skill development](#agent-skill-development)). That committed file is the source of truth and overrides any dashboard-saved environment. Keep it minimal: no service startup or build steps.
2. **Vale peer binary.** Vale is a peer binary, not an npm dependency. Install version 3.15.1 to `/usr/local/bin` (it persists in the VM snapshot); the exact release command is in [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml). `pnpm docs:check` needs Vale on `PATH`.
3. **gitleaks peer binary.** gitleaks is also a peer binary, not an npm dependency; the pre-commit hook runs `gitleaks protect --staged` when it is on `PATH`. Install version 8.30.1 to `/usr/local/bin` (persists in the VM snapshot). If it goes missing, reinstall from the [gitleaks releases](https://github.com/gitleaks/gitleaks/releases): download `gitleaks_8.30.1_linux_x64.tar.gz` and extract the `gitleaks` binary into `/usr/local/bin` (same pattern as Vale). CI runs its own scan via `gitleaks-action`, so the local install is defense-in-depth.
4. **Build before docs or CLI.** `dist/` is gitignored and is not produced by the update script. Run `pnpm build` after a fresh checkout before `pnpm docs:check`, `pnpm docs:compile`, or invoking the `mdcp` CLI.
5. **Sync Vale styles once.** Run `pnpm vale:sync` before the first `docs:check` on a fresh clone (network required); synced styles then persist in the snapshot.
6. **Node version.** The VM runs Node 22 (satisfies `engines >=18`); CI uses Node 24. Do not switch Node unless a version-specific issue appears.
7. **Full gate.** `pnpm check` mirrors CI (typecheck, lint, format, build, test, skill:validate, docs:check).

## Platform limitations and workarounds

These are cloud-agent constraints discovered in practice. Plan work around them rather than fighting them.

| Limitation                                                                                      | Workaround                                                                                                                                            |
| ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| The `gh` CLI is **read-only** for the agent; it cannot create or modify issues or pull requests | Use the dedicated pull-request tooling for PRs and PR comments. A human creates GitHub issues from agent-supplied text; add `Closes #N` afterward.    |
| **No GitHub MCP** is available, and we do not add one in the cloud                              | Accept it. MCP servers load at session start and `.cursor/*` (except `environment.json`) is gitignored, so an agent cannot self-enable one mid-run.   |
| A GitHub **PAT in Secrets is not wired** to `gh` or any agent tool                              | Do not rely on a PAT to unblock issue creation in the cloud; it does not help. Issue creation stays a human step.                                     |
| The agent **cannot push to protected `main`** or merge the release PR                           | Work reaches `develop` by pushing a `land/**` branch through the land gate. A human merges the release PR into `main`.                                |
| CI runs `pnpm audit --audit-level=high` **before** the build and test gates                     | A new advisory on a pre-existing devDependency fails audit and masks otherwise-green gates. Pin patched versions via `pnpm-workspace.yaml` overrides. |
| The pre-commit hook runs `pnpm audit` when dependency manifests change                          | Resolve advisories (overrides) before committing manifest changes, rather than bypassing the hook.                                                    |
| commitlint rejects non-conventional subjects, including merge commits                           | Give merge commits a conventional subject such as `chore: merge …`, not `merge: …`.                                                                   |

## Recording issues without issue-creation access

Because the agent cannot open GitHub issues, capture work items as ready-to-paste issue text (title, body with acceptance criteria, labels, and project fields per [Agent work-item tracking](#agent-work-item-tracking)) in the commit message of the change that delivers the work. A maintainer creates the issue and links it with `Closes #N`.
