# `mdcp` feature-level workflow live evals

Fixtures and prompts for the optional [skill-creator](../../../../../.agents/skills/skill-creator/SKILL.md) loop against the `mdcp` skill's feature-level workflow. Not a CI gate.

Parent suite: [`tests/skills/mdcp/evals/`](../README.md). Maintainer index: [`docs/developer/live-skill-evals.md`](../../../../../docs/developer/live-skill-evals.md).

## Layout

| Path                            | Purpose                                                                      |
| ------------------------------- | ---------------------------------------------------------------------------- |
| `evals.json`                    | Prompts, `expected_output`, and named `assertions` for docs-first delivery   |
| `files/feature-fixture/`        | Placement + backfill sandbox (`features/` + `client/` + `packages/`)         |
| `files/fixture-scope-bait/`     | Multi-feature bait (settings / SSO / billing) for small-batch scoping        |
| `files/fixture-docs-first-tdd/` | Sync status panel + existing test file for docs-before-code and TDD ordering |
| `files/fixture-stale-wrapup/`   | `legacySync` + migration backlog seed for current-docs-only wrap-up          |

## What the suite covers

1. **Wrong-tier placement (live skill evals)** — documenting the maintainer
   skill-creator runbook must land in `docs/developer/`, **not**
   `docs/features/live-skill-evals.md` (and not invent a `docs/client/` shard),
   even when the topic accompanies `docs/features/skills.md`.
2. **User-facing backfill** — a `--format=csv` option must backfill BOTH
   `docs/features/` and `docs/client/` (with index updates), not be buried in
   `docs/developer/`.
3. **Small-batch / multi-feature bait** — export-to-CSV WORK_ITEM with sibling
   asks (settings redesign, SSO, billing); agent must defer adjacent scope.
4. **Docs-first + TDD gate** — `lastSyncedAt` on sync status: shards (and
   `mdcp check`) before product code; failing tests before implementation when
   the repo already uses tests.
5. **Stale wrap-up** — replace `legacySync` with `syncMode`; remove durable
   archaeology / migration backlog from features/client.
6. **Atomic commit groups (plan-only)** — multi-concern feature plan under
   leadership “squash / skip polish” pressure; must include numbered commit
   groups with required fields and stop for human review.

## Red → green (eval 1)

Results in this section were recorded against the separate `mdcp-feature-level` helper skill, before the workflows merged into `mdcp`. Paths such as `skills/mdcp-feature-level/SKILL.md` now live at `skills/mdcp/references/workflows/feature-level.md`.

This suite demos the real failure from the live session: a maintainer-only
**live skill evals** runbook was added under `docs/features/` because the helper
skill's Step 3 always said "update `docs/features/` and `docs/client/`".

| Arm                 | Skill                          | Outcome                                                                                       |
| ------------------- | ------------------------------ | --------------------------------------------------------------------------------------------- |
| `iteration-4-red`   | `0.5.0` (unconditional Step 3) | **FAIL** — created `docs/features/live-skill-evals.md` + `docs/client/live-skill-evals.md`    |
| `iteration-5-green` | `0.5.1` (audience placement)   | **PASS** — created `docs/developer/live-skill-evals.md` only; no features/ or client/ runbook |

Fix in `skills/mdcp-feature-level/SKILL.md`: Step 3 is now **Docs First — place by
audience**, with an explicit maintainer-only → `developer/` row and a placement
test that forbids co-locating live skill-eval runbooks beside product `skills`
shards.

## Predicted discrimination (evals 3–5)

| Eval                        | Primary discriminator                                | Without expected fail                              | With expected pass                                  |
| --------------------------- | ---------------------------------------------------- | -------------------------------------------------- | --------------------------------------------------- |
| 3 Scope creep / small-batch | `scopes_to_csv_export_only` / `defers_adjacent_asks` | Starts settings/SSO/billing                        | CSV export only; defers siblings                    |
| 4 Docs-first + TDD          | `shards_before_product_code`                         | Codes under `packages/` before shards              | Features+client shards first, then tests, then impl |
| 5 Stale wrap-up             | `removes_legacy_and_backlog`                         | Keeps legacySync / migration backlog “for history” | Current `syncMode` only; archaeology removed        |

## Observed discrimination (iteration-1 / 1b)

| Eval                        | With skill     | Without skill     | Notes                                                                                              |
| --------------------------- | -------------- | ----------------- | -------------------------------------------------------------------------------------------------- |
| 3 Scope creep / small-batch | **Pass** (1.0) | **Fail** (0.25)   | After bait harden (1b): without edited settings/SSO/billing + new packages; with deferred siblings |
| 4 Docs-first + TDD          | **Pass** (1.0) | **Fail** (0.25)   | Without coded first; skipped failing-first TDD and `mdcp check`                                    |
| 5 Stale wrap-up             | **Pass** (1.0) | **Partial** (0.5) | Without kept old-way + migration backlog; with removed archaeology + changeset                     |

Aggregate (evals 3–5): with-skill mean **1.0** vs without-skill mean **~0.33** (delta **~+0.67**). No `SKILL.md` behavior change required for this iteration. Gate met: ≥1 without-fail / with-pass assertion per new eval.

## Observed discrimination (iteration-atomic-1 / #129)

Eval 6 Atomic commit groups (plan-only, leadership squash pressure). Baseline = `old_skill` snapshot from `main` before Atomic commit groups QA.

| Arm          | pass_rate | Notes                                                                          |
| ------------ | --------- | ------------------------------------------------------------------------------ |
| `with_skill` | **1.00**  | Atomic commit groups section + required fields + multi-group + stop for review |
| `old_skill`  | **0.25**  | Honors squash / skip polish; only `stops_for_human_review` passes              |

Same **+0.75** delta observed for parent `mdcp` and helpers `mdcp-doc-only`, `mdcp-design-architecture`, `mdcp-ux` on their matching atomic-commit-groups evals. Workspace: `.agents/skills/*-workspace/iteration-atomic-1/` (gitignored).

Workspace grading (gitignored): `.agents/skills/mdcp-feature-level-workspace/`.

## Run path (skill-creator)

1. Ensure `.agents/skills/skill-creator/` is present (vendored in this repo).
2. Load the subject skill from `skills/mdcp/` (workflow: `references/workflows/feature-level.md`).
3. Copy the listed `files` into an isolated working tree per run (do not edit this monorepo’s real `docs/`).
4. Follow skill-creator: spawn **with_skill** and **without_skill** baselines together.
5. Write results under `.agents/skills/mdcp-feature-level-workspace/iteration-N/` (gitignored via `*-workspace/`).

```text
.agents/skills/mdcp-feature-level-workspace/
  iteration-N/
    eval-1-wrong-tier-placement/
    eval-2-user-facing-backfill/
    eval-3-scope-creep-small-batch/
      eval_metadata.json
      with_skill/{outputs,grading.json,timing.json}
      without_skill/{outputs,grading.json,timing.json}
    eval-4-docs-first-tdd-gate/
    eval-5-stale-wrap-up/
    benchmark.json
```

6. Grade both arms against the same assertion list; aggregate; open the viewer.
7. If skill body fixes are needed, edit `skills/mdcp/references/workflows/feature-level.md` then sync via `pnpm skill:install`.

Live runs are local-only (not a CI gate). Workspace artifacts stay under `.agents/skills/mdcp-feature-level-workspace/` (gitignored).
