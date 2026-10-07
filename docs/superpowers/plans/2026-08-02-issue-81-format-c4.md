# Issue #81: Format pack C4 model — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Deliver GitHub [#81](https://github.com/betsalel-williamson/mdcp/issues/81) per acceptance criteria.

**Architecture:** Versioned format-c4/0.5.0.0 pack with viewpoint templates.

**Tech Stack:** TypeScript (mdcp-core, mdcp-cli), MDCP shards, pnpm, Vitest, optional Vale.

## Global Constraints

- One `WORK_ITEM` per branch; conventional commits; atomic commit groups
- `pnpm run check` before merge claims
- Shards are source of truth; run `pnpm docs:compile:repo` after doc edits
- No Tier C unmeasured claims on README ([benefit-claims-and-evidence](docs/features/protocol/benefit-claims-and-evidence.md))

## DAG metadata

| Field | Value |
| --- | --- |
| Wave | `wave-3` |
| Mode | `implement` |
| Priority | `P3` |
| Depends on | #78 |
| MDCP helper | `/mdcp-feature-level` |
| Plan file | `docs/superpowers/plans/2026-08-02-issue-81-format-c4.md` |

## Atomic commit groups

| Id | Concern | Files | Commit subject |
| --- | --- | --- | --- |
| design | Design shard or spec section | `docs/features/` shards per helper | `docs: design for #81` |
| impl | Implementation and tests | per issue acceptance criteria | `feat: deliver #81` |

---

### Task 1: Load scope

- [ ] `gh issue view 81`
- [ ] Confirm acceptance criteria unchanged
- [ ] Invoke `/mdcp-feature-level` with WORK_ITEM=81

### Task 2: Execute atomic commit groups (sequential PRs)

- [ ] One PR per commit group in table above
- [ ] `pnpm run check` before each push
- [ ] Final PR body: `Closes #81`

---

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**WORK_ITEM:** GitHub issue linked in title. **WORK_ITEM_LOOKUP:** `docs/developer/agent-work-item-tracking.md`

**Do not implement from this PR until the plan is reviewed and the orchestrator dispatches a worktree for this issue.**
