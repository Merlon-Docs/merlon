# Issue #48: MDCP 1.0 normative specification — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Deliver GitHub [#48](https://github.com/betsalel-williamson/mdcp/issues/48) per acceptance criteria.

**Architecture:** Complete normative MDCP 1.0 spec reconciled against mdcp-core behavior.

**Tech Stack:** TypeScript (mdcp-core, mdcp-cli), MDCP shards, pnpm, Vitest, optional Vale.

## Global Constraints

- One `WORK_ITEM` per branch; conventional commits; atomic commit groups
- `pnpm run check` before merge claims
- Shards are source of truth; run `pnpm docs:compile:repo` after doc edits
- No Tier C unmeasured claims on README ([benefit-claims-and-evidence](docs/features/protocol/benefit-claims-and-evidence.md))

## DAG metadata

| Field | Value |
| --- | --- |
| Wave | `wave-2` |
| Mode | `implement` |
| Priority | `P1` |
| Depends on | #46 |
| MDCP helper | `/mdcp-design-architecture` |
| Plan file | `docs/superpowers/plans/2026-08-02-issue-48-mdcp-1-0-spec.md` |

## Atomic commit groups

| Id | Concern | Files | Commit subject |
| --- | --- | --- | --- |
| spec-sections | Complete normative spec sections | `docs/features/protocol/mdcp-1.0-spec.md` | `docs(protocol): expand MDCP 1.0 spec #48` |
| spec-map | Feature catalog → spec clause map | `docs/features/feature-catalog.md` | `docs: map feature catalog to spec #48` |

---

### Task 1: Load scope

- [ ] `gh issue view 48`
- [ ] Confirm acceptance criteria unchanged
- [ ] Invoke `/mdcp-design-architecture` with WORK_ITEM=48

### Task 2: Execute atomic commit groups (sequential PRs)

- [ ] One PR per commit group in table above
- [ ] `pnpm run check` before each push
- [ ] Final PR body: `Closes #48`

---

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**WORK_ITEM:** GitHub issue linked in title. **WORK_ITEM_LOOKUP:** `docs/developer/agent-work-item-tracking.md`

**Do not implement from this PR until the plan is reviewed and the orchestrator dispatches a worktree for this issue.**
