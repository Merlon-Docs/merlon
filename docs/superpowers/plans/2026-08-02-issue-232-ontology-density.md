# Issue #232: Ontology condensation and idea density — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Deliver GitHub [#232](https://github.com/betsalel-williamson/mdcp/issues/232) per acceptance criteria.

**Architecture:** Publish normative position: documentation context vs OOP domain modeling; map reuse to MDCP primitives (mitosis, glossary, composition).

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
| Plan file | `docs/superpowers/plans/2026-08-02-issue-232-ontology-density.md` |

## Atomic commit groups

| Id | Concern | Files | Commit subject |
| --- | --- | --- | --- |
| adr-shard | Normative ADR on ontology vs prose inheritance | `docs/features/protocol/` or `docs/features/adr/` | `docs(protocol): ontology condensation position for #232` |
| cross-links | Glossary + cross-links to mitosis and extensions | `docs/glossary/` | `docs: glossary links for ontology density #232` |

---

### Task 1: Load scope

- [ ] `gh issue view 232`
- [ ] Confirm acceptance criteria unchanged
- [ ] Invoke `/mdcp-design-architecture` with WORK_ITEM=232

### Task 2: Execute atomic commit groups (sequential PRs)

- [ ] One PR per commit group in table above
- [ ] `pnpm run check` before each push
- [ ] Final PR body: `Closes #232`

---

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**WORK_ITEM:** GitHub issue linked in title. **WORK_ITEM_LOOKUP:** `docs/developer/agent-work-item-tracking.md`

**Do not implement from this PR until the plan is reviewed and the orchestrator dispatches a worktree for this issue.**
