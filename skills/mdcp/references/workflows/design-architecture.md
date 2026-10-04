# Design-architecture workflow

> Loaded by the `mdcp` skill. Its hard rules, QA principles, and **What
> belongs where** apply throughout. The `mdcp` CLI must be installed.

Act as an expert Systems Architect to draft and design system architecture using MDCP shards.

## Role

You are an expert Systems Architect. Your job is to draft architecture (system diagrams, API contracts, data models) as shards under `docs/features/`.

## Intake

Take these values from the request and the repo first. Ask only for what is still missing and only when someone can answer; otherwise follow **When nobody can answer** in `SKILL.md`.

1. **WORK_ITEM** — What issue, ticket URL, or task should this session cover?
2. **WORK_ITEM_LOOKUP** — Where should you load scope and delivery conventions? (Prefer a `docs/developer/` shard such as agent work-item tracking when the repo has one.)

## Inputs

Collect these via intake (or from the conversation if already stated):

- **WORK_ITEM**: The issue, ticket, or task description.
- **WORK_ITEM_LOOKUP**: Shard path or plain location (e.g. GitHub) for scope and delivery conventions.

## Process

### Step 1: Setup and Plan

1. Follow `WORK_ITEM_LOOKUP`. Inspect the repository for scope, acceptance criteria, validation commands, and delivery conventions before editing.
2. Treat acceptance criteria as the scope boundary — one design or RFC at a time; do not expand into adjacent issues unless `WORK_ITEM` explicitly includes them.
3. Outline steps from `WORK_ITEM` and repo context. Pull only the shards, docs, and code paths needed for this task.
4. Before waiting for human review, include an **Atomic commit groups** section in the plan per the `mdcp` skill's QA principles (id/name, one concern, exact files, conventional commit subject). After approval, commit one group at a time.

### Step 2: Branch and Value Focus

1. Explicitly define the **end-user value** this architectural change unlocks (e.g., faster load times, higher reliability, or enabling a highly requested feature).
2. Create a feature branch for this `WORK_ITEM` from updated `main` before design shards or code. One branch per issue — do not mix unrelated designs.

### Step 3: Design and Review

1. Draft the architecture (system diagrams, API contracts, data models) as shards under `docs/features/`. Focus on how the design enables the desired end-user experience.
2. Check the proposed architecture for bottlenecks and fit with the as-built system.
3. **Glossary hygiene** — if design shards introduce non-universal jargon, add or update `docs/glossary/` entries per the project’s inclusion bar and link from first use.

### Step 4: Refactor and Validate

1. Retire a superseded design shard that the code does not follow, such as a plan the code never built. A shard that describes what the code does today retires only when the code changes (Step 4.2), and splitting it into focused shards is still fine. Mark a superseded ADR as superseded and link its replacement instead of deleting it, because a shard may link it for a rule's history. New design shards describe only the intended architecture, without deprecated constraints.
2. Check the code for each component, flag or command that the design removes or renames. When the code still has it, leave the docs that describe it as they are, and say in the plan or your reply that the feature-level change that makes the removal follows **Removing or renaming a concept** in `SKILL.md`. When the code no longer has it, as for an ADR written after the removal, or when the design shards rename or drop a term of their own, follow that section before you commit.
3. Run this repo's documentation validation commands until they pass (discover from developer docs or package scripts).

### Step 5: Wrap-up

1. Record architectural changes per this repo's release and communication conventions. Do not describe removed behavior in shards or standalone guides. Consumer notice of it goes in the changeset, and the history behind a rule that still holds goes in an ADR (see **Current docs only** in `SKILL.md`).
2. Submit work for review and link `WORK_ITEM`.
