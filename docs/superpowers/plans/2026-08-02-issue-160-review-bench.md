# Issue #160: Review-bench MVP — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Deliver GitHub [#160](https://github.com/betsalel-williamson/mdcp/issues/160) per acceptance criteria.

**Architecture:** Optional in-repo HIL review falsification harness; makefile-only operator entry.

**Tech Stack:** TypeScript (mdcp-core, mdcp-cli), MDCP shards, pnpm, Vitest, optional Vale.

## Global Constraints

- One `WORK_ITEM` per branch; conventional commits; atomic commit groups
- `pnpm run check` before merge claims
- Shards are source of truth; run `pnpm docs:compile:repo` after doc edits
- No Tier C unmeasured claims on README ([benefit-claims-and-evidence](docs/features/protocol/benefit-claims-and-evidence.md))

## DAG metadata

| Field | Value |
| --- | --- |
| Wave | `wave-4` |
| Mode | `implement` |
| Priority | `P2` |
| Depends on | none |
| MDCP helper | `/mdcp-design-architecture` |
| Plan file | `docs/superpowers/plans/2026-08-02-issue-160-review-bench.md` |

## Atomic commit groups

| Id | Concern | Files | Commit subject |
| --- | --- | --- | --- |
| phase-0-1 | Mini-project docs tree | `docs/review-bench/` | `docs: review-bench docs tree #160` |
| phase-2 | Harness scaffold + makefile | `scripts/review-bench.mk` | `feat: review-bench harness scaffold #160` |
| phase-3-5 | Packs, proxy scoring, pilot protocol | `tests/review-bench/` | `feat: review-bench MVP packs #160` |

---

### Task 1: Load scope

- [ ] `gh issue view 160`
- [ ] Confirm acceptance criteria unchanged
- [ ] Invoke `/mdcp-design-architecture` with WORK_ITEM=160

### Task 2: Execute atomic commit groups (sequential PRs)

- [ ] One PR per commit group in table above
- [ ] `pnpm run check` before each push
- [ ] Final PR body: `Closes #160`

---

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**WORK_ITEM:** GitHub issue linked in title. **WORK_ITEM_LOOKUP:** `docs/developer/agent-work-item-tracking.md`

**Do not implement from this PR until the plan is reviewed and the orchestrator dispatches a worktree for this issue.**
