# UX workflow

Product capability: the **ux** workflow of the `mdcp` skill applies **user-centric
design** to MDCP work — end-user value, processes, and workflows (how many
steps to accomplish X) — documented primarily in **client-guide shards**.
Interfaces and UI implementation are in scope when they serve those flows, not
as the sole focus.

Workflow file: [`skills/mdcp/references/workflows/ux.md`](../../../../skills/mdcp/references/workflows/ux.md).
Shared workflow contract (intake, guide placement, glossary): [Skill workflows](../skill-workflows.md).

## End-user value

Consumers get shorter, clearer paths to outcomes. Client-guide shards describe
the product journey as it works now — steps, decisions, and friction — so
product development stays anchored on what the end user must accomplish.

## What this workflow is for

See [Atomic commit groups](../../../glossary/atomic-commit-groups.md) for the plan-field contract.

| Obligation                  | As-built expectation                                                                                             |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Work-item intake            | Ask for `WORK_ITEM` and `WORK_ITEM_LOOKUP` before branching or editing                                           |
| Atomic commit groups        | Include numbered Atomic commit groups in the plan before “go”; one commit per group after approval               |
| One UX scope                | Branch from updated `main` for a single UX issue; do not mix unrelated UX work                                   |
| User-centric value first    | State the end-user outcome and friction to remove before designing steps or UI                                   |
| Map processes and workflows | Document the ideal journey under `docs/client/` — steps to accomplish X, decision points, failure/recovery paths |
| Interface when it serves UX | Implement or revise UI only as needed to support the documented workflow, using this repo’s existing patterns    |
| Glossary hygiene            | Follow the shared glossary obligation; define non-universal jargon per the inclusion bar                         |
| Align as-built docs         | Update client-guide shards to match the shipped experience; remove superseded journey or UI references           |
| Validate and wrap-up        | Run repo tests + docs validation; release notes per repo conventions; link `WORK_ITEM`                           |

## What this workflow is not

- **Feature engineering across features + client + product code as the primary frame** —
  use the [feature-level workflow](./feature-level.md) when the ask is a full
  shipped capability contract, not user-journey / workflow design.
- **Docs-only cleanup with no UX or journey change** — use
  the [doc-only workflow](./doc-only.md).
- **Architecture intent / ADR drafting** — use
  the [design-architecture workflow](./design-architecture.md).
- **Bootstrapping MDCP in an empty or legacy repo** — use
  the [getting-started workflow](./getting-started.md).
- **UI-only polish detached from user outcomes** — screens and components are
  means; this workflow owns the end-user process and value first.
- **Expanding beyond the loaded `WORK_ITEM`** — stay on the UX acceptance
  criteria unless the issue explicitly expands scope.

When the user asks for end-to-end delivery (architecture + feature code + UX)
in one session, this workflow **MUST** stay on user journeys, client workflows,
and only the interface needed to support them (or ask to narrow scope) and
state next steps for the other workflows.

## Acceptance (as-built)

A successful UX session typically:

1. Creates or updates focused shards under `docs/client/` that describe the
   end-user outcome and step-by-step workflow
2. Applies glossary hygiene for any non-universal language introduced (per inclusion bar)
3. Implements or adjusts UI only when needed to support those flows (repo patterns)
4. Leaves client docs describing the as-built experience only
5. Passes repo tests and docs validation
6. Links `WORK_ITEM` in review

Live evals (optional, not a CI gate):
[ux workflow live evals](../../../../tests/skills/mdcp/evals/ux/README.md).
See [Live skill evals](../../../developer/live-skill-evals.md) for maintainer
eval conventions.
