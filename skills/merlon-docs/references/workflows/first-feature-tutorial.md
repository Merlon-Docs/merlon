# First feature tutorial

Run this **after** bootstrap (`merlon compile` / `merlon check` clean). Same
session; do not invent a parallel workflow — **load and follow** each workflow’s
Process contract.

## Offer and EXAMPLE_MODE

1. Ask whether to run the **First feature tutorial**.
   - **novice** — default **yes**
   - **expert** — may skip
2. If **skip**: brief handoff to the day-to-day workflows.
3. If **yes**, ask **EXAMPLE_MODE**:
   - **recommended** — use [`hello-greeting`](#recommended-example-hello-greeting)
   - **bring-your-own** — user names FEATURE (and PERSONA if different); keep
     one small shippable slice

Set tutorial `WORK_ITEM` from the chosen example. Prefer
`WORK_ITEM_LOOKUP` = a `docs/developer/` shard when the repo has agent
work-item tracking; otherwise use the conversation + starter shards.

## Phase order

Pause for user “go” between phases. One concern per phase. Run `merlon check`
before advancing. Atomic commit groups apply **inside** each day-to-day workflow
(not during pure bootstrap).

| Phase | Workflow                                      | Focus                                                |
| ----- | --------------------------------------------- | ---------------------------------------------------- |
| 1     | [design-architecture](design-architecture.md) | Architecture / ADR shards under `docs/features/`     |
| 2     | [feature-level](feature-level.md)             | Docs-first, then TDD for the slice                   |
| 3     | [ux](ux.md)                                   | Client journey / end-user value under `docs/client/` |
| 4     | [doc-only](doc-only.md)                       | Polish: glossary, indexes, consistency               |

For each phase: open the matching workflow file in this folder, complete its
intake if values are missing, follow its Process, validate, then announce the
next phase.

## Recommended example: hello-greeting

Tiny greeting capability — one user-facing outcome, minimal surface.

| Field    | Value                                                                          |
| -------- | ------------------------------------------------------------------------------ |
| FEATURE  | `hello-greeting`                                                               |
| PERSONA  | Developers who want a one-line greeting from the library or CLI                |
| Outcome  | Something callable returns a short greeting string (e.g. `Hello, Merlon Docs`) |
| Design   | One capability shard (and optional short ADR) — no large system design         |
| Feature  | Docs + minimal implementation + tests against acceptance criteria              |
| UX       | Client guide: how PERSONA runs or calls the greeting                           |
| Doc-only | Glossary/index polish; remove stale bootstrap placeholders                     |
