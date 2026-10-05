# Doc-only workflow

Product capability: the **doc-only** workflow of the `mdcp` skill authors or refactors
MDCP shards as a technical-writer pass — durable guide content without changing
functional product code.

Workflow file: [`skills/mdcp/references/workflows/doc-only.md`](../../../../skills/mdcp/references/workflows/doc-only.md).
[Skill workflows](../skill-workflows.md) covers the shared workflow contract: intake, atomic commit groups, guide placement, the glossary, and concept removal.

## End-user value

Readers and agents get accurate, current shards (intent, contracts, acceptance)
without waiting on a code change. Stale workflows and planning backlogs leave
durable docs so search stays trustworthy.

## What this workflow is for

| Obligation             | As-built expectation                                                                                                                                                                    |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Docs-only branch       | One docs scope per branch, in `docs/features/`, `docs/client/`, `docs/developer/` and standalone guides                                                                                 |
| Contracts not samples  | Put intent, contracts, and acceptance in shards, not code dumps; link a source file only as evidence for a claim ([code evidence](../../../client-core/compile-hooks/code-evidence.md)) |
| Indexes and validation | Update guide `index.md` files; run `mdcp check` (do not hand-edit compile output or `refs.json`)                                                                                        |
| Current docs only      | Remove superseded workflows, planning backlogs, and pending `.changeset/*.md` links from durable shards                                                                                 |
| Hard scope boundary    | No `src/` edits, unit tests, or “just fix the code too”; defer code work to feature-level                                                                                               |

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
  Only the history behind a rule that still holds goes in an ADR that the shard
  or standalone guide links.

When the user also asks for bug fixes or implementation in the same session,
this workflow **MUST** refuse or defer that work to a separate `WORK_ITEM` under
feature-level.

## Acceptance (as-built)

A successful doc-only session typically:

1. Creates or updates focused Markdown under the appropriate guides
2. Updates guide indexes so shards are discoverable
3. Leaves `packages/` / product `src/` unchanged
4. Describes current product behavior only
5. Passes repo docs validation (`mdcp check` / docs scripts)

Optional local with/without-skill grading for this workflow:
[doc-only workflow live evals](../../../../tests/skills/mdcp/evals/doc-only/README.md)
(maintainer workflow — not a CI gate). See [Live skill evals](../../../developer/live-skill-evals.md).
