# `mdcp` design-architecture workflow live evals

Fixtures and prompts for the optional [skill-creator](../../../../../.agents/skills/skill-creator/SKILL.md) loop against the `mdcp` skill's design-architecture workflow. Not a CI gate.

Parent suite: [`tests/skills/mdcp/evals/`](../README.md). Maintainer index: [`docs/developer/live-skill-evals.md`](../../../../../docs/developer/live-skill-evals.md).

## Layout

| Path                         | Purpose                                                                     |
| ---------------------------- | --------------------------------------------------------------------------- |
| `evals.json`                 | Prompts, `expected_output`, and named `assertions` for MDCP sharding checks |
| `files/greenfield-design/`   | Empty feature/ADR indexes — capture architecture as new shards              |
| `files/brownfield-monolith/` | Large `docs/ARCHITECTURE.md` monolith to split into `docs/features/` shards |
| `files/design-fixture/`      | Thin sandbox + packages bait for design-only scope pressure                 |

## What the suite covers

1. **Greenfield shard capture** — create focused feature/ADR shards + indexes (not one mega-file); advise pairing for deep design critique
2. **Brownfield monolith split** — break `ARCHITECTURE.md` into related shards/ADR; retire superseded planning text
3. **Design-only scope** — oversized “build the feature” ask stays within the design-architecture workflow's boundaries
4. **Atomic commit groups (plan-only)** — ADR + design shard + indexes under “squash / skip polish” pressure; must include numbered commit groups and stop for review

Focus is **MDCP documentation-system** behavior (small shards, links, indexes, no drive-by product code) — not grading systems-design brilliance. A separate design-thinking skill is out of scope; prompts only check that the workflow advises pairing when deep critique is requested.

## Discrimination notes (iteration-2)

Results in this section were recorded against the separate `mdcp-design-architecture` helper skill, before the workflows merged into `mdcp`. Paths such as `skills/mdcp-design-architecture/SKILL.md` now live at `skills/mdcp/references/workflows/design-architecture.md`.

| Eval                        | With skill | Without skill | Notes                                                                  |
| --------------------------- | ---------- | ------------- | ---------------------------------------------------------------------- |
| 1 Greenfield shard capture  | Pass       | Fail          | Baseline wrote one mega-file with TypeScript sketches and no ADR index |
| 2 Brownfield monolith split | Pass       | Fail          | Baseline edited `ARCHITECTURE.md` in place and preserved stale backlog |
| 3 Design-only scope         | Pass       | Fail          | Baseline implemented packages, CLI, client docs, and tests             |

Aggregate (iteration-2): with-skill **100%** vs without-skill **15%** (delta
**+0.85**). The current skill snapshot already passed the hardened pressure
scenarios, so no `SKILL.md` behavior change was required for this iteration.
Reviewer artifact: `.agents/skills/mdcp-design-architecture-workspace/iteration-2/review.html`.

## Run path (skill-creator)

1. Ensure `.agents/skills/skill-creator/` is present (vendored in this repo).
2. Load the subject skill from `skills/mdcp/` (workflow: `references/workflows/design-architecture.md`).
3. **RED before skill edits:** snapshot the current skill, run **without_skill** (and/or `old_skill`) baselines on new prompts first; only tighten `SKILL.md` when the current skill fails a pressure scenario.
4. Copy the listed `files` into an isolated working tree per run (do not edit this monorepo’s real `docs/`).
5. Follow skill-creator: spawn **with_skill** and baseline together.
6. Write results under `.agents/skills/mdcp-design-architecture-workspace/iteration-N/` (gitignored via `*-workspace/`).

```text
.agents/skills/mdcp-design-architecture-workspace/
  iteration-N/
    eval-1-greenfield-shard-capture/
      eval_metadata.json
      with_skill/outputs/
      without_skill/outputs/
    eval-2-brownfield-monolith-split/
    eval-3-design-only-scope/
    benchmark.json
```

7. Grade assertions; aggregate; open the viewer (`eval-viewer/generate_review.py`, use `--static` when headless).
8. If skill body fixes are needed, edit `skills/mdcp/references/workflows/design-architecture.md` then sync via `pnpm skill:install`.
