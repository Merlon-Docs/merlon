# `merlon-docs` doc-only workflow live evals

Fixtures and prompts for the optional [skill-creator](../../../../../.agents/skills/skill-creator/SKILL.md) loop against the `merlon-docs` skill's doc-only workflow. Not a CI gate.

Parent suite: [`tests/skills/merlon-docs/evals/`](../README.md).

## Layout

| Path                       | Purpose                                                                    |
| -------------------------- | -------------------------------------------------------------------------- |
| `evals.json`               | Prompts, `expected_output`, and named `assertions` for docs-only checks    |
| `files/fixture-mini-repo/` | Tiny Merlon Docs sandbox (docs + bait `src/`) shared across all four evals |

## What the suite covers

1. **Author/refactor shards** — feature docs + index + `merlon check`; no product code
2. **Temptation to code** — fix stale client docs while refusing a bait bugfix/unit test
3. **Stale cleanup** — remove migration backlog / superseded workflow from durable shards
4. **Atomic commit groups (plan-only)** — multi-tier docs plan under “squash / skip polish” pressure; must include numbered commit groups and stop for review

## Discrimination notes (iteration-1)

| Eval                 | With skill | Without skill | Notes                                                      |
| -------------------- | ---------- | ------------- | ---------------------------------------------------------- |
| 1 Author/refactor    | Pass       | Partial       | Baseline often embeds implementation APIs in shards        |
| 2 Temptation to code | Pass       | Fail          | Primary discriminator — baseline edits `src/` + adds tests |
| 3 Stale cleanup      | Pass       | Pass          | Weak alone; still required for acceptance coverage         |

Live runs are local-only (not a CI gate). Workspace artifacts stay under `.agents/skills/merlon-docs-doc-only-workspace/` (gitignored).

## Run path (skill-creator)

1. Ensure `.agents/skills/skill-creator/` is present (vendored in this repo).
2. Load the subject skill from `skills/merlon-docs/` (workflow: `references/workflows/doc-only.md`).
3. Copy the listed `files` into an isolated working tree per run (do not edit this monorepo’s real `docs/`).
4. Follow skill-creator: spawn **with_skill** and **without_skill** baselines together.
5. Write results under `.agents/skills/merlon-docs-doc-only-workspace/iteration-N/` (gitignored via `*-workspace/`).

```text
.agents/skills/merlon-docs-doc-only-workspace/
  iteration-1/
    eval-1-author-refactor/
      eval_metadata.json
      with_skill/outputs/
      without_skill/outputs/
    eval-2-temptation-to-code/
    eval-3-stale-cleanup/
    benchmark.json
```

6. Grade assertions; aggregate; open the viewer (`eval-viewer/generate_review.py`, use `--static` when headless).
7. If skill body fixes are needed, edit `skills/merlon-docs/references/workflows/doc-only.md` then sync via `pnpm skill:install`.
