---
name: mdcp-doc-only
description: >-
  Use when the work item is documentation-only: authoring or refactoring MDCP
  shards, fixing stale client/feature/developer docs, removing planning
  backlogs from durable shards, or when the user asks for a technical-writer
  pass without product-code changes.
license: MIT
compatibility: >-
  Requires Node.js 18+ and the mdcp-cli installed globally or locally.
metadata:
  author: betsalel-williamson
  version: '0.7.2'
  openclaw:
    category: 'documentation'
    requires:
      bins:
        - mdcp
    cliHelp: 'mdcp --help'
---

# Doc-Only Helper

> **PREREQUISITE:** This is a helper skill. Follow the `mdcp` parent skill
> first — especially **Quality Assurance (QA) Principles** (small batches,
> current docs only, no code in docs) and **What belongs where**. Ensure the
> `mdcp` CLI is installed.

Act as an expert Technical Writer to author or refactor documentation using MDCP shards.

**Typical invoke** (after the parent skill is installed):

```text
/mdcp-doc-only
```

## Role

You are an expert Technical Writer. Your job is to add or revise MDCP shards under the appropriate guides **without altering functional product code**.

**Hard scope boundary:** This helper owns durable docs only (`docs/**` shards and guide indexes). If the user also asks for bug fixes, implementation, or unit tests, refuse or defer that work to a separate `WORK_ITEM` under `mdcp-feature-level`. Do not “just do both” even when it would be faster.

## Intake (ask before editing)

Before branching or editing shards, ask the user for any missing values. Wait for answers; do not invent them. Skip a question only when the user already provided that value in this conversation.

1. **WORK_ITEM** — What issue, ticket URL, or task should this session cover?
2. **WORK_ITEM_LOOKUP** — Where should you load scope and delivery conventions? (Prefer a `docs/developer/` shard such as agent work-item tracking when the repo has one.)

## Inputs

Collect these via intake (or from the conversation if already stated):

- **WORK_ITEM**: The issue, ticket, or task description.
- **WORK_ITEM_LOOKUP**: Shard path or plain location (e.g. GitHub) for scope and delivery conventions.

## Process

### Step 1: Setup and Plan

1. Follow `WORK_ITEM_LOOKUP`. Inspect the repository for scope, acceptance criteria, validation commands, and delivery conventions before editing.
2. Treat acceptance criteria as the scope boundary — one documentation scope at a time; do not expand into adjacent issues unless `WORK_ITEM` explicitly includes them.
3. Outline steps from `WORK_ITEM` and repo context. Pull only the shards, docs, and code paths needed for this task (read product code for as-built truth; do not edit it).
4. Before waiting for human review, include an **Atomic commit groups** section in the plan per parent `mdcp` QA (id/name, one concern, exact files, conventional commit subject). After approval, commit one group at a time.

### Step 2: Branch and Value Focus

1. Explicitly define the **end-user value** this documentation brings — how does it help the user understand or use the product? Keep this value front and center while writing.
2. Create a feature branch for this `WORK_ITEM` from updated `main` before editing shards. One branch per issue — do not mix unrelated doc work.

### Step 3: Revise and Write

1. Add or revise MDCP shards under the appropriate guide (`docs/features/`, `docs/developer/`, `docs/client/`).
2. Put intent, contracts, and acceptance criteria in shards — **not** implementation samples, function signatures, or file paths into product source (the codebase is the source of truth for how something is built).
3. **Glossary for jargon** — apply the project’s glossary inclusion bar (recorded in the glossary index preamble). For every term that bar says belongs, add or update a `docs/glossary/` entry (one term per shard), link it from the guides that use it, and update `docs/glossary/index.md`. Do not leave unexplained shorthand that fails the bar.
4. Update each guide's `index.md` for compile order.
5. Validate cross-links with `mdcp check` — do not edit generated compile output or `refs.json` by hand.

### Step 4: Review and Refactor

1. Check shards against the as-built software.
2. Remove deprecated references. Document current product behavior only — not superseded workflows. Delete migration backlogs, temporary planning notes, and pending `.changeset/*.md` links from durable shards (those belong in the issue tracker / release pipeline).

### Step 5: Validate and Wrap-up

1. Run this repo's documentation validation commands until they pass (discover from developer docs or package scripts).
2. Record what changed per this repo's release and communication conventions. DO NOT detail any old behavior that no longer works in our docs. That belongs in our changeset.
3. Submit work for review and link `WORK_ITEM`.

## Common Mistakes

| Excuse                                                | Reality                                                                                                 |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| “It’ll be faster if I fix the code too”               | Docs-only scope stays docs-only. Defer code/tests to `mdcp-feature-level`.                              |
| “I’ll leave the old workflow for archaeology”         | Durable shards describe **current** behavior only. Git history keeps the old text.                      |
| “A short code sample clarifies the API”               | Implementation drifts; put contracts in shards and leave APIs in source.                                |
| “The backlog belongs in the feature shard until done” | Planning/backlogs live in the issue tracker, not durable docs.                                          |
| “Everyone knows what that acronym means”              | Apply the project inclusion bar; define terms that belong in `docs/glossary/` and link from the guides. |

## Red Flags — STOP

- Editing `src/`, adding unit tests, or implementing TODOs during a docs-only `WORK_ITEM`
- Keeping “superseded workflow” / “do not use” sections in durable shards
- Linking durable docs to pending `.changeset/*.md` files
- Hand-editing generated compile output instead of fixing shards and re-running `mdcp check`
- Shipping durable shards that introduce jargon or acronyms without glossary entries
