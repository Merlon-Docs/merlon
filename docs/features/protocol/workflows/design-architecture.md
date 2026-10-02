# Design-architecture workflow

Product capability: the **design-architecture** workflow of the `mdcp` skill records
architecture and design decisions as **MDCP shards** so agents and humans can
load one concern at a time instead of growing a single architecture monolith.

Workflow file: [`skills/mdcp/references/workflows/design-architecture.md`](../../../../skills/mdcp/references/workflows/design-architecture.md).
Shared workflow contract (intake, guide placement, glossary): [Skill workflows](../skill-workflows.md).

## End-user value

Contributors find the right design note (components, contracts, ADR) in one
shard read. Architecture intent stays linked through feature and ADR indexes
instead of living only in chat or a thousand-line wiki page.

## What this workflow is for

See [Atomic commit groups](../../../glossary/atomic-commit-groups.md) for the plan-field contract.

| Obligation                  | As-built expectation                                                                                    |
| --------------------------- | ------------------------------------------------------------------------------------------------------- |
| Work-item intake            | Ask for `WORK_ITEM` and `WORK_ITEM_LOOKUP` before branching or editing                                  |
| Capture architecture intent | Draft system diagrams, API/data contracts, and boundaries as shards under `docs/features/`              |
| Atomic commit groups        | Include numbered Atomic commit groups in the plan before “go”; one commit per group after approval      |
| Land durable decisions      | Record accepted choices as ADRs under `docs/features/adr/` when the repo uses that layout               |
| Keep docs sharded           | Prefer **one primary concern per shard**; update feature/ADR `index.md` so new shards are discoverable  |
| Brownfield hygiene          | Split or retire legacy architecture monoliths; remove superseded planning from durable design shards    |
| Stay design-doc scoped      | No product/CLI/TypeScript implementation, no unit tests as delivery, no primary `docs/client/` work     |
| Glossary hygiene            | Follow the shared glossary obligation; define non-universal design jargon per the inclusion bar         |
| Skill QA                    | Current intended architecture only; no large implementation dumps; run repo `mdcp check` / docs scripts |

## What this workflow is not

- **Deep design critique / multi-option trade-off workshops** — pair with a
  separate design-thinking skill or human review, then record the agreed intent
  as shards.
- **Implementing CLI flags, packages, or unit tests** — use
  the [feature-level workflow](./feature-level.md).
- **End-user / client journey and workflow design** — use the [ux workflow](./ux.md).
- **Docs-only cleanup with no architecture change** — use
  the [doc-only workflow](./doc-only.md).
- **Bootstrapping MDCP in an empty or legacy repo** — use
  the [getting-started workflow](./getting-started.md).
- **Grading “good systems design” brilliance** — out of scope; this workflow owns
  **MDCP documentation-system** behavior (sharding, indexes, design-doc scope).

When the user asks for end-to-end delivery (design + client guide + code +
tests) in one session, this workflow **MUST** stay on design shards (or ask to
narrow scope) and state next steps for the other workflows.

## Acceptance (as-built)

A successful design-architecture session typically:

1. Creates or updates focused Markdown under `docs/features/` and/or `docs/features/adr/`
2. Updates the relevant guide indexes so shards link together
3. Applies glossary hygiene for any non-universal language introduced (per inclusion bar)
4. Leaves `packages/` / product `src/` unchanged
5. Avoids multi-function implementation dumps in durable shards
6. When deep design critique is requested, advises pairing and still lands the agreed intent as shards

Optional local with/without-skill grading for this workflow:
[design-architecture workflow live evals](../../../../tests/skills/mdcp/evals/design-architecture/README.md)
(maintainer workflow — not a CI gate). See [Live skill evals](../../../developer/live-skill-evals.md).
