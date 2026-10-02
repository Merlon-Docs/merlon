# Feature-level workflow

Product capability: the **feature-level** workflow of the `mdcp` skill implements and
documents shipped features using a **docs-first** then **TDD** loop so MDCP
shards stay the contract before product code changes.

Workflow file: [`skills/mdcp/references/workflows/feature-level.md`](../../../../skills/mdcp/references/workflows/feature-level.md).
Shared workflow contract (intake, guide placement, glossary): [Skill workflows](../skill-workflows.md).

## End-user value

Shipped capabilities are documented for consumers and contributors before code
lands. Acceptance criteria in shards stay aligned with as-built behavior instead
of drifting in chat-only designs.

## What this workflow is for

See [Atomic commit groups](../../../glossary/atomic-commit-groups.md) for the plan-field contract.

| Obligation            | As-built expectation                                                                                        |
| --------------------- | ----------------------------------------------------------------------------------------------------------- |
| Work-item intake      | Ask for `WORK_ITEM` and `WORK_ITEM_LOOKUP` before branching or editing                                      |
| Atomic commit groups  | Include numbered Atomic commit groups in the plan before “go”; one commit per group after approval          |
| One focused branch    | Branch from updated `main` for a single issue; do not mix unrelated features                                |
| Place by audience     | User-facing work → `docs/features/` + `docs/client/`; maintainer-only → `docs/developer/` only              |
| Docs first            | Update guide shards and indexes before product code; put contracts in shards, not implementation dumps      |
| Glossary hygiene      | Follow the shared glossary obligation; define non-universal jargon per the inclusion bar                    |
| TDD when code changes | Write failing tests first where the repo uses tests, then implement, then refactor; skip TDD when docs-only |
| Current docs only     | Align shards to as-built behavior; no superseded-workflow archaeology in durable docs                       |
| Validate and wrap-up  | Run repo tests + `mdcp check`; changeset/release notes per repo conventions; link `WORK_ITEM`               |

## What this workflow is not

- **Docs-only technical writing with no product code** — prefer
  the [doc-only workflow](./doc-only.md) when the ask is shards-only.
- **Architecture intent / ADR drafting without implementation** — use
  the [design-architecture workflow](./design-architecture.md).
- **Primary client-guide UX / journey design** — use the [ux workflow](./ux.md).
- **Bootstrapping MDCP in an empty or legacy repo** — use
  the [getting-started workflow](./getting-started.md).
- **Expanding beyond the loaded `WORK_ITEM`** — stay on acceptance criteria
  unless the issue explicitly expands scope.

When the user asks for design-only or docs-only work, this workflow **SHOULD**
defer or narrow to the matching workflow rather than inventing end-to-end delivery.

## Acceptance (as-built)

A successful feature-level session typically:

1. Updates the correct guide tiers for the audience (features+client or developer)
2. Applies glossary hygiene for any non-universal language introduced (per inclusion bar)
3. Implements against documented acceptance when product code changes (TDD where applicable)
4. Leaves durable shards describing current behavior only
5. Passes repo tests and docs validation
6. Links `WORK_ITEM` in review; adds a changeset when published package behavior changes

Optional local with/without-skill grading for this workflow:
[feature-level workflow live evals](../../../../tests/skills/mdcp/evals/feature-level/README.md)
(maintainer workflow — not a CI gate). See [Live skill evals](../../../developer/live-skill-evals.md).
