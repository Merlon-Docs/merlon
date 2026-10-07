# Issue #233: Measure token context cost — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Deliver GitHub [#233](https://github.com/betsalel-williamson/mdcp/issues/233) per acceptance criteria.

**Architecture:** Extend measurement beyond char-based dogfood bench; document corpora, session definition, static-first verification bar.

**Tech Stack:** TypeScript (mdcp-core, mdcp-cli), MDCP shards, pnpm, Vitest, optional Vale.

## Global Constraints

- One `WORK_ITEM` per branch; conventional commits; atomic commit groups
- `pnpm run check` before merge claims
- Shards are source of truth; run `pnpm docs:compile:repo` after doc edits
- No Tier C unmeasured claims on README ([benefit-claims-and-evidence](docs/features/protocol/benefit-claims-and-evidence.md))

## DAG metadata

| Field | Value |
| --- | --- |
| Wave | `wave-1` |
| Mode | `implement` |
| Priority | `P1` |
| Depends on | none |
| MDCP helper | `/mdcp-design-architecture` |
| Plan file | `docs/superpowers/plans/2026-08-02-issue-233-token-cost-measurement.md` |

## Atomic commit groups

| Id | Concern | Files | Commit subject |
| --- | --- | --- | --- |
| method | Measurement method shard + bench script | `docs/features/protocol/` | `docs: token measurement method for #233` |
| results | Regenerable results + benefit-claims tier wording | `scripts/bench-context-size.mjs` | `chore: refresh context-size bench results #233` |

---

### Task 1: Load scope

- [ ] `gh issue view 233`
- [ ] Confirm acceptance criteria unchanged
- [ ] Invoke `/mdcp-design-architecture` with WORK_ITEM=233

### Task 2: Execute atomic commit groups (sequential PRs)

- [ ] One PR per commit group in table above
- [ ] `pnpm run check` before each push
- [ ] Final PR body: `Closes #233`

---

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**WORK_ITEM:** GitHub issue linked in title. **WORK_ITEM_LOOKUP:** `docs/developer/agent-work-item-tracking.md`

**Do not implement from this PR until the plan is reviewed and the orchestrator dispatches a worktree for this issue.**
