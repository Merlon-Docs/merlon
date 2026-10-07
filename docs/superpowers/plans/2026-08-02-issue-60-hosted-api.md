# Issue #60: V3 Hosted context API — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Deliver GitHub [#60](https://github.com/betsalel-williamson/mdcp/issues/60) per acceptance criteria.

**Architecture:** Execute via MDCP helper `mdcp-design-architecture` in an isolated worktree; one concern per PR.

**Tech Stack:** TypeScript (mdcp-core, mdcp-cli), MDCP shards, pnpm, Vitest, optional Vale.

## Global Constraints

- One `WORK_ITEM` per branch; conventional commits; atomic commit groups
- `pnpm run check` before merge claims
- Shards are source of truth; run `pnpm docs:compile:repo` after doc edits
- No Tier C unmeasured claims on README ([benefit-claims-and-evidence](docs/features/protocol/benefit-claims-and-evidence.md))

## DAG metadata

| Field | Value |
| --- | --- |
| Wave | `wave-gate` |
| Mode | `gate-monitor` |
| Priority | `defer` |
| Depends on | none |
| MDCP helper | `/mdcp-design-architecture` |
| Plan file | `docs/superpowers/plans/2026-08-02-issue-60-hosted-api.md` |

## Atomic commit groups

| Id | Concern | Files | Commit subject |
| --- | --- | --- | --- |
| gate-doc | Gate criteria and unblock checklist only | `docs/superpowers/plans/2026-08-02-issue-60-hosted-api.md` | `docs(plan): gate monitor for #60` |

**No implementation PRs until a maintainer comments `gate: open` on the issue.**

---

### Task 1: Document gate (plan-only)

- [ ] Record gate criteria from issue body in this plan
- [ ] List `blocked_until` issues: [59,48,47]
- [ ] Add unblock checklist to issue comment when gate fires
- [ ] **Stop** — no code changes until `gate: open`

---

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**WORK_ITEM:** GitHub issue linked in title. **WORK_ITEM_LOOKUP:** `docs/developer/agent-work-item-tracking.md`

**Do not implement from this PR until the plan is reviewed and the orchestrator dispatches a worktree for this issue.**
