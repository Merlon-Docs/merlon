# Issue #153: skills.sh security audit sync — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Deliver GitHub [#153](https://github.com/betsalel-williamson/mdcp/issues/153) per acceptance criteria.

**Architecture:** Execute via MDCP helper `mdcp-feature-level` in an isolated worktree; one concern per PR.

**Tech Stack:** TypeScript (mdcp-core, mdcp-cli), MDCP shards, pnpm, Vitest, optional Vale.

## Global Constraints

- One `WORK_ITEM` per branch; conventional commits; atomic commit groups
- `pnpm run check` before merge claims
- Shards are source of truth; run `pnpm docs:compile:repo` after doc edits
- No Tier C unmeasured claims on README ([benefit-claims-and-evidence](docs/features/protocol/benefit-claims-and-evidence.md))

## DAG metadata

| Field | Value |
| --- | --- |
| Wave | `wave-0` |
| Mode | `inflight` |
| Priority | `P1` |
| Depends on | none |
| MDCP helper | `/mdcp-feature-level` |
| Plan file | `docs/superpowers/plans/2026-08-02-issue-153-skills-audit-sync.md` |

## Atomic commit groups

Implementation tracked in PR #154. This plan documents scope for post-merge verification.

| Id | Concern | Files | Commit subject |
| --- | --- | --- | --- |
| plan-only | Plan alignment with in-flight PR | `docs/superpowers/plans/2026-08-02-issue-153-skills-audit-sync.md` | `docs(plan): align plan with #153 PR #154` |

---

### Task 1: Load scope

- [ ] `gh issue view 153`
- [ ] Confirm acceptance criteria unchanged
- [ ] Invoke `/mdcp-feature-level` with WORK_ITEM=153

### Task 2: Execute atomic commit groups (sequential PRs)

- [ ] One PR per commit group in table above
- [ ] `pnpm run check` before each push
- [ ] Final PR body: `Closes #153`

---

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**WORK_ITEM:** GitHub issue linked in title. **WORK_ITEM_LOOKUP:** `docs/developer/agent-work-item-tracking.md`

**Do not implement from this PR until the plan is reviewed and the orchestrator dispatches a worktree for this issue.**
