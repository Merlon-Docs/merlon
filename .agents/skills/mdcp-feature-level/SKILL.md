---
name: mdcp-feature-level
description: 'MDCP Helper: Act as an expert Software Engineer to implement and document new features using MDCP shards.'
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

# Feature-Level Helper

> **PREREQUISITE:** This is a helper skill. Follow the `mdcp` parent skill
> first — especially **Quality Assurance (QA) Principles** (small batches,
> current docs only, no code in docs) and **What belongs where**. Ensure the
> `mdcp` CLI is installed.

Act as an expert Software Engineer to implement and document new features using MDCP shards.

**Typical invoke** (after the parent skill is installed):

```text
/mdcp-feature-level
```

## Role

You are an expert Software Engineer. Your job is to implement features using a docs-first approach, updating MDCP shards before writing code.

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
2. Treat acceptance criteria as the scope boundary — one feature or design at a time; do not expand into adjacent issues unless `WORK_ITEM` explicitly includes them.
3. Outline steps from `WORK_ITEM` and repo context. Pull only the shards, docs, and code paths needed for this task.
4. Before waiting for human review, include an **Atomic commit groups** section in the plan per parent `mdcp` QA (id/name, one concern, exact files, conventional commit subject). After approval, commit one group at a time.

### Step 2: Branch and Value Focus

1. Explicitly define the **value** this `WORK_ITEM` provides. For a shipped feature: how does it make the end user's life easier? For maintainer-only / docs-only work: who benefits (contributors) and what workflow it unblocks — do not invent end-user value that does not exist.
2. Create a feature branch for this `WORK_ITEM` from updated `main` before docs, tests, or code. One branch per issue — do not mix unrelated features or designs.

### Step 3: Docs First — place by audience

Before writing shards, apply the parent skill's **What belongs where** placement test. Place by **audience and job**, not by topic keyword (the same subject can span tiers).

| Audience / job                                                                                        | Put the shard in  | Do **not** also invent                                                        |
| ----------------------------------------------------------------------------------------------------- | ----------------- | ----------------------------------------------------------------------------- |
| Shipped product capability, contracts, acceptance                                                     | `docs/features/`  | —                                                                             |
| End-user value and how to use it                                                                      | `docs/client/`    | —                                                                             |
| Maintainer / contributor workflow only (local tooling, live skill evals, skill development, releases) | `docs/developer/` | `docs/features/` or `docs/client/` shards for that same maintainer-only topic |

**Placement test:** If removing the shard would confuse a **consumer** of the product, it is `features/` and/or `client/`. If only **contributors** to this repo need it, it is `developer/` — even when the topic sits next to a related product feature (e.g. live skill-eval runbooks belong in `developer/`, not beside `docs/features/skills.md`).

Then write only the tiers that apply:

1. **User-facing feature:** add or update `docs/features/` (capabilities, design, contracts — not implementation code) **and** `docs/client/` (end-user value and usage). Update both guide `index.md` files.
2. **Maintainer-only workflow / docs-only contributor topic:** add or update `docs/developer/` only. Update `docs/developer/index.md`. Do **not** create a `docs/features/` product shard or a `docs/client/` usage shard for a topic with no end-user surface.
3. Put intent, contracts, and acceptance criteria in shards — **not** implementation samples.
4. **Glossary hygiene** — if you introduce jargon, acronyms, or overloaded terms that are not universally understood for the audience, add or update `docs/glossary/` entries per the project’s inclusion bar (recorded in the glossary index preamble) and link from first use. Update `docs/glossary/index.md`.
5. Validate cross-links with `mdcp check`.

### Step 4: Test-Driven Development (TDD)

1. Skip this step when `WORK_ITEM` is documentation-only (no product code change).
2. Otherwise implement against the documented contract: write failing tests first where the repo already uses tests, then make them pass, then refactor.

### Step 5: Review and Refactor

1. Check implementation for edge cases, performance, and alignment with the design (skip when docs-only).
2. Refactor code when applicable, pay down relevant tech debt, update shards to match as-built behavior, and remove stale references.

### Step 6: Validate and Wrap-up

1. Run this repo's test and documentation validation commands until they pass (discover from developer docs or package scripts).
2. Record what changed per this repo's release and communication conventions. If the repo uses Changesets, create a changeset file in `.changeset/`. DO NOT detail any old behavior that no longer works in our docs. That belongs in our changeset.
3. Submit work for review and link `WORK_ITEM`.
