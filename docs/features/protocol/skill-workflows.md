# Skill workflows

Normative profile for the **workflows** inside the MDCP Agent Skill that drive shard authoring across the four [guide tiers](../../glossary/guide-tier.md). Parent spec: [MDCP 1.0 (draft)](./mdcp-1.0-spec.md).

## Purpose

Workflows are part of the MDCP **authoring protocol** — not host-specific rules. They tell agents how to load a `WORK_ITEM`, which guides to write, and how to validate before merge. People install one skill (`mdcp`) and invoke it as `/mdcp` with the task in plain words; the skill picks the workflow from its routing table and loads only that workflow's file.

Workflow files live in the skill under `skills/mdcp/references/workflows/` (e.g., `feature-level.md`). The canonical catalog is summarized below. **Do not edit** an installed copy of the skill if you want changes to persist — propose upstream or add extensions.

## Required intake

Every work-item workflow **MUST** open with an **Intake** section listing the fields below. The agent takes each value from the request and the repository first, and asks only for what is still missing when someone can answer. When nobody can answer, as in a headless or scheduled run, it states a default in one line and continues. `WORK_ITEM` is then the request itself. It stops to wait only when the user asked for a plan first, or before a destructive or irreversible step, a real change of scope, or input only the user can give. The skill's **When nobody can answer** section in `SKILL.md` holds these defaults.

Required fields for work-item workflows:

| Field              | Meaning                                                                                   | Example intake question                                                                   |
| ------------------ | ----------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `WORK_ITEM`        | Enough to resolve the task — tracker id, URL, or short issue name/description             | What issue, ticket URL, or task should this session cover?                                |
| `WORK_ITEM_LOOKUP` | Where to load scope and delivery conventions — shard path or plain location (e.g. GitHub) | Where should you load scope and delivery conventions? (Prefer a `docs/developer/` shard.) |

The getting-started workflow **MUST** collect `FEATURE`, `PERSONA`, and `EXPERIENCE` (novice vs expert onboarding depth) instead of `WORK_ITEM`. `EXPERIENCE` defaults to expert when nobody can answer. After a successful bootstrap, it **MUST** offer an optional **first-feature tutorial** (`RUN_FIRST_FEATURE_TUTORIAL`, default yes for novice) and, when accepted, resolve **EXAMPLE_MODE** (recommended `hello-greeting` or bring-your-own) before walking design → feature → UX → doc-only. Detail: [Getting-started workflow](./workflows/getting-started.md).

The doc-review workflow collects `SCOPE` and `WORK_ITEM_LOOKUP` instead of `WORK_ITEM`.

Agents **MUST** load the issue (or equivalent) before editing shards or code. One `WORK_ITEM` per branch.

## Atomic commit groups (plan obligation)

Coding and multi-concern plans **MUST** include an **[Atomic commit groups](../../glossary/atomic-commit-groups.md)** section before waiting for human review / “go”. Each numbered group lists id/name, one concern, exact files, and an intended conventional commit subject. After approval, work through the groups one at a time and `git commit` each one. Don't squash unrelated concerns into one commit.

Why: reviewable diffs, one concern per commit, and it matches small batches (the skill's [QA Principles](../agent-skill.md#quality-assurance-qa-principles)).

Day-to-day workflows that produce a plan (feature-level, doc-only, design-architecture, UX, doc-review) **MUST** require this section before “go” (doc-review plans its groups in Step 4, the other four in Step 1). Bootstrap scaffold (getting-started steps 1 to 6) stays out of scope for commit grouping; when the optional first-feature tutorial runs, each phase follows the matching day-to-day workflow (including commit groups).

## Standard workflows

| Workflow            | Role                                         | Primary guides                       |
| ------------------- | -------------------------------------------- | ------------------------------------ |
| getting-started     | Bootstrap + first-feature tutorial           | all tiers                            |
| feature-level       | Feature engineering                          | `features/`, `client/`, code + tests |
| doc-only            | Technical writing                            | `features/`, `client/`, `developer/` |
| design-architecture | Architecture as MDCP shards                  | `features/protocol/`, `features/`    |
| ux                  | User-centric journeys                        | `client/`, glossary                  |
| doc-review          | Whole-set review: merge, split, move, reword | any guide and its index              |

Goals and hard boundaries for each workflow (what it is / is not):

- [Getting-started workflow](./workflows/getting-started.md)
- [Feature-level workflow](./workflows/feature-level.md)
- [Doc-only workflow](./workflows/doc-only.md)
- [Design-architecture workflow](./workflows/design-architecture.md)
- [UX workflow](./workflows/ux.md)
- [Doc-review workflow](./workflows/doc-review.md)

Index: [skills.md](../../skills.md). Most workflows also have optional [live skill eval](../../developer/live-skill-evals.md) suites under `tests/skills/mdcp/evals/`.

## Guide placement obligations

Every workflow **MUST** apply the placement test in [Default guide layout](./mdcp-1.0-spec.md#2-default-guide-layout-code-repository-archetype) to each shard it writes. The **Primary guides** column in [Standard workflows](#standard-workflows) shows which guides each workflow writes.

## Glossary obligation (every workflow)

Every workflow **MUST** treat glossary hygiene as part of its session — not
an optional afterthought for doc-only or UX alone.

- **Non-universal language** — If a shard introduces jargon, acronyms, or
  overloaded terms that are not universally understood by the guide’s audience,
  define them under `docs/glossary/` (one term per shard) and link from first use.
- **Project inclusion bar** — What does / does not belong in the glossary is a
  judgment call. The **project’s** bar is recorded in the glossary itself
  (typically the `docs/glossary/index.md` preamble). Workflows **MUST** follow
  that bar; when none exists yet, [getting-started](./workflows/getting-started.md)
  establishes it with the end user.
- **Not a dump of everyday words** — Do not glossary terms that are already
  unambiguous for the stated audience; prefer a short entry over unexplained
  shorthand when the bar is unclear.

Shared layout and term mechanics: [domain glossary](../../glossary/domain-glossary.md).

## Entrypoint chain

```text
/mdcp <feature request> → feature-level workflow → intake questions → shards → mdcp check
/mdcp <design request>  → design-architecture workflow → intake → feature/ADR shards → mdcp check
/mdcp review the docs   → doc-review workflow → mdcp review → decisions → shards → mdcp check
```

The chosen workflow collects `WORK_ITEM_LOOKUP` via intake for scope.
