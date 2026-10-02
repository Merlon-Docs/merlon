# Doc-only workflow

Product capability: the **doc-only** workflow of the `mdcp` skill authors or refactors
MDCP shards as a technical-writer pass — durable guide content without changing
functional product code.

Workflow file: [`skills/mdcp/references/workflows/doc-only.md`](../../../../skills/mdcp/references/workflows/doc-only.md).
Shared workflow contract (intake, guide placement, glossary): [Skill workflows](../skill-workflows.md).

## End-user value

Readers and agents get accurate, current shards (intent, contracts, acceptance)
without waiting on a code change. Stale workflows and planning backlogs leave
durable docs so search stays trustworthy.

## What this workflow is for

See [Atomic commit groups](../../../glossary/atomic-commit-groups.md) for the plan-field contract.

| Obligation             | As-built expectation                                                                                    |
| ---------------------- | ------------------------------------------------------------------------------------------------------- |
| Work-item intake       | Ask for `WORK_ITEM` and `WORK_ITEM_LOOKUP` before branching or editing                                  |
| Atomic commit groups   | Include numbered Atomic commit groups in the plan before “go”; one commit per group after approval      |
| Docs-only branch       | One documentation scope per branch; revise `docs/features/`, `docs/client/`, and/or `docs/developer/`   |
| Contracts not samples  | Put intent, contracts, and acceptance in shards — not implementation dumps or product source paths      |
| Glossary hygiene       | Follow the shared glossary obligation; define non-universal jargon per the inclusion bar                |
| Indexes and validation | Update guide `index.md` files; run `mdcp check` (do not hand-edit compile output or `refs.json`)        |
| Current docs only      | Remove superseded workflows, planning backlogs, and pending `.changeset/*.md` links from durable shards |
| Hard scope boundary    | No `src/` edits, unit tests, or “just fix the code too” — defer code work to feature-level              |

## What this workflow is not

- **Implementing CLI flags, packages, or unit tests** — use
  the [feature-level workflow](./feature-level.md).
- **Architecture intent / ADR drafting as the primary deliverable** — use
  the [design-architecture workflow](./design-architecture.md).
- **Primary client-guide UX / journey design** — use the [ux workflow](./ux.md).
- **Bootstrapping MDCP in an empty or legacy repo** — use
  the [getting-started workflow](./getting-started.md).
- **Keeping “old way” sections for archaeology** — Git history preserves prior
  wording; consumer notice of removed behavior belongs in the changeset pipeline.
- **Leaving jargon or acronyms undefined against the inclusion bar** — if the
  project’s glossary bar says the term belongs, define it in `docs/glossary/`
  rather than unexplained shorthand in durable shards.

When the user also asks for bug fixes or implementation in the same session,
this workflow **MUST** refuse or defer that work to a separate `WORK_ITEM` under
feature-level.

## Acceptance (as-built)

A successful doc-only session typically:

1. Creates or updates focused Markdown under the appropriate guides
2. Applies glossary hygiene for jargon and acronyms introduced or left undefined (per inclusion bar)
3. Updates guide indexes so shards are discoverable
4. Leaves `packages/` / product `src/` unchanged
5. Describes current product behavior only
6. Passes repo docs validation (`mdcp check` / docs scripts)

Optional local with/without-skill grading for this workflow:
[doc-only workflow live evals](../../../../tests/skills/mdcp/evals/doc-only/README.md)
(maintainer workflow — not a CI gate). See [Live skill evals](../../../developer/live-skill-evals.md).
