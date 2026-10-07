# Issue #45: Markdown-as-context usage model — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Deliver GitHub [#45](https://github.com/betsalel-williamson/mdcp/issues/45) per acceptance criteria.

**Architecture:** Polish usage-model shard for adoption paths and coexistence sections.

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
| Priority | `P3` |
| Depends on | #46 |
| MDCP helper | `/mdcp-doc-only` |
| Plan file | `docs/superpowers/plans/2026-08-02-issue-45-usage-model.md` |

## Atomic commit groups

| Id | Concern | Files | Commit subject |
| --- | --- | --- | --- |
| design | Design shard or spec section | `docs/features/` shards per helper | `docs: design for #45` |
| impl | Implementation and tests | per issue acceptance criteria | `feat: deliver #45` |

---

### Task 1: Load scope

- [ ] `gh issue view 45`
- [ ] Confirm acceptance criteria unchanged
- [ ] Invoke `/mdcp-doc-only` with WORK_ITEM=45

### Task 2: Execute atomic commit groups (sequential PRs)

- [ ] One PR per commit group in table above
- [ ] `pnpm run check` before each push
- [ ] Final PR body: `Closes #45`

---

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**WORK_ITEM:** GitHub issue linked in title. **WORK_ITEM_LOOKUP:** `docs/developer/agent-work-item-tracking.md`

**Do not implement from this PR until the plan is reviewed and the orchestrator dispatches a worktree for this issue.**
