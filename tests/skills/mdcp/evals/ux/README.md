# `mdcp` ux workflow live evals

Fixtures and prompts for the optional [skill-creator](../../../../../.agents/skills/skill-creator/SKILL.md) loop against the `mdcp` skill's ux workflow. Not a CI gate.

Parent suite: [`tests/skills/mdcp/evals/`](../README.md). Maintainer index: [`docs/developer/live-skill-evals.md`](../../../../../docs/developer/live-skill-evals.md).

## Layout

| Path                                          | Purpose                                                                |
| --------------------------------------------- | ---------------------------------------------------------------------- |
| `evals.json`                                  | Prompts, `expected_output`, and named `assertions` for client-guide UX |
| `files/fixture-client-guide/`                 | Onboarding persona guide + wrong-tier features bait                    |
| `files/fixture-stale-architecture-in-client/` | Seeded architecture dump in a client shard                             |
| `files/fixture-decoy-paths/`                  | Client settings + developer/features/source decoys                     |

Dogfood repos may map persona guides to other names (`client-cli`, `client-core`) via config — out of scope for these fixtures, which teach the protocol path `docs/client/`.

## What the suite covers

1. **Client guide update** — primary durable edits under `docs/client/` + index; persona outcome prose
2. **Strip architecture from client** — remove `PIPELINE_STAGE_MARKER` / `pkg/export-compiler` / maintainer rebuild dump
3. **Avoid decoy paths** — do not “helpfully” edit `packages/`, `docs/features/`, or developer checklists
4. **Atomic commit groups (plan-only)** — multi-shard client plan under “squash / skip polish” pressure; must include numbered commit groups and stop for review

## Discrimination notes

Results in this section were recorded against the separate `mdcp-ux` helper skill, before the workflows merged into `mdcp`. Paths such as `skills/mdcp-ux/SKILL.md` now live at `skills/mdcp/references/workflows/ux.md`.

### Iteration-1 (soft prompts — non-discriminating)

All three evals: with_skill **and** without_skill scored **5/5**. Soft “client guide” wording was too leading; baselines already stayed on-path. Evidence under `.agents/skills/mdcp-ux-workspace/iteration-1/` (local only).

### Iteration-2 bait (pressure prompts) — observed

| Eval                  | with_skill | without_skill | Discriminators (without fail / with pass)                      |
| --------------------- | ---------- | ------------- | -------------------------------------------------------------- |
| 1 Client guide update | 5/5        | 3/5           | `primary_edits_under_client`, `no_architecture_dump_in_client` |
| 2 Strip architecture  | 5/5        | 4/5           | `architecture_markers_removed`                                 |
| 3 Avoid decoy paths   | 5/5        | 3/5           | `settings_engine_unchanged`, `decoy_settings_ts_unchanged`     |

Aggregate: with_skill **100%** vs without_skill **67%** (delta **+33%**). Current `skills/mdcp-ux/SKILL.md` already passes under pressure — no skill body change required for this iteration.

Workspace (gitignored): `.agents/skills/mdcp-ux-workspace/iteration-2/`.

## Run path (skill-creator)

1. Ensure `.agents/skills/skill-creator/` is present (vendored in this repo).
2. Load the subject skill from `skills/mdcp/` (workflow: `references/workflows/ux.md`).
3. Copy the listed `files` into an isolated working tree per run (do not edit this monorepo’s real `docs/`).
4. Spawn **with_skill** and **without_skill** baselines together. Do **not** load the `mdcp` skill into without_skill arms.
5. Write results under `.agents/skills/mdcp-ux-workspace/iteration-N/` (gitignored via `*-workspace/`).

```text
.agents/skills/mdcp-ux-workspace/
  iteration-1/
    eval-1-client-guide-update/
      eval_metadata.json
      with_skill/outputs/
      without_skill/outputs/
    eval-2-strip-architecture/
    eval-3-avoid-decoy-paths/
    benchmark.json
```

6. Grade both arms against the same assertions (path/diff scripts for markers and decoys; grader judgment for outcome prose); aggregate; open the viewer (`eval-viewer/generate_review.py`, use `--static` when headless).
7. If skill body fixes are needed, edit `skills/mdcp/references/workflows/ux.md` then sync via `pnpm skill:install`.

Live runs are local-only (not a CI gate). Workspace artifacts stay under `.agents/skills/mdcp-ux-workspace/`.
