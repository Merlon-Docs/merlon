# Issue #173: Repository security posture epic — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Deliver GitHub [#173](https://github.com/betsalel-williamson/mdcp/issues/173) per acceptance criteria.

**Architecture:** Execute via MDCP helper `mdcp-doc-only` in an isolated worktree; one concern per PR.

**Tech Stack:** TypeScript (mdcp-core, mdcp-cli), MDCP shards, pnpm, Vitest, optional Vale.

## Global Constraints

- One `WORK_ITEM` per branch; conventional commits; atomic commit groups
- `pnpm run check` before merge claims
- Shards are source of truth; run `pnpm docs:compile:repo` after doc edits
- No Tier C unmeasured claims on README ([benefit-claims-and-evidence](docs/features/protocol/benefit-claims-and-evidence.md))

## DAG metadata

| Field | Value |
| --- | --- |
| Wave | `wave-epic` |
| Mode | `rollup` |
| Priority | `P1` |
| Depends on | none |
| MDCP helper | `/mdcp-doc-only` |
| Plan file | `docs/superpowers/plans/2026-08-02-issue-173-security-posture.md` |

## Atomic commit groups

| Id | Concern | Files | Commit subject |
| --- | --- | --- | --- |
| rollup-plan | Epic rollup plan (this file) | `docs/superpowers/plans/2026-08-02-issue-173-security-posture.md` | `docs(plan): rollup plan for #173` |

Close epic when children satisfy acceptance: see issue body.

---

### Task 1: Track child completion

- [ ] Verify each child issue acceptance criteria
- [ ] Update epic checklist on GitHub
- [ ] Keep epic open per issue body

---

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**WORK_ITEM:** GitHub issue linked in title. **WORK_ITEM_LOOKUP:** `docs/developer/agent-work-item-tracking.md`

**Do not implement from this PR until the plan is reviewed and the orchestrator dispatches a worktree for this issue.**
