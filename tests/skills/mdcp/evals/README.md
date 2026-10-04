# `mdcp` live evals

Fixtures and prompts for the optional [skill-creator](../../../../.agents/skills/skill-creator/SKILL.md) loop. Not a CI gate.

## Layout

| Path                                   | Purpose                                                                               |
| -------------------------------------- | ------------------------------------------------------------------------------------- |
| `evals.json`                           | Prompts + `expected_output` (add `expectations` after first with-skill runs)          |
| `files/hygiene/`                       | Stale backlog, old-way history and code-in-docs anti-patterns (eval 7)                |
| `files/routing/`                       | Minimal guides so workflow routing is observable (evals 8, 9, 13)                     |
| `files/bootstrap/`                     | Empty npm project for the bootstrap eval (eval 1)                                     |
| `files/workspace/`                     | Small docs tree with a cross-shard heading link and a backlog (evals 2 to 5)          |
| `files/removal/`                       | A worker that `AGENTS.md` names, removed (evals 17 and 19) or still in code (eval 18) |
| `triggers.json` / `trigger_evals.json` | Description-trigger tuning only                                                       |

The `AGENTS.md` under `files/removal/` is test data for evals 17 to 19. Its
instructions describe the fictional fixture repository and do not apply to work
in this repository. Only eval 18 copies `services/hooks/`, so the worker is
still in its code. Eval 19 asks for an ADR after the worker is gone, so the
design-architecture workflow runs the removal steps itself.

Eval 7 does not exercise the removal steps, because its change removes no
component, flag or command. The hygiene fixture's backlog still plans to delete
the webhook worker, so its product still has the worker. Evals 17 to 19 cover
removal.

## Run path (skill-creator)

1. Ensure `.agents/skills/skill-creator/` is present (vendored in this repo).
2. Dogfood the skill: `pnpm skill:install` → `.agents/skills/mdcp/`.
3. Follow skill-creator: prompts first, then spawn **with-skill** and **without_skill** baselines together.
4. Write results under `.agents/skills/mdcp-workspace/iteration-N/` (gitignored via `*-workspace/`).

```text
.agents/skills/mdcp-workspace/
  iteration-1/
    eval-6-small-batches/
      eval_metadata.json
      with_skill/outputs/
      without_skill/outputs/
    eval-7-hygiene-stale-code/
    eval-8-route-client-ux/
    eval-9-route-design-adr/
    benchmark.json
```

5. Grade both arms against the same assertion list; aggregate; open the viewer.
6. Eval 10 (`eval-10-atomic-commit-groups`) uses **with_skill** vs **old_skill**
   (snapshot of `skills/mdcp` from `main` before Atomic commit groups QA).

Each eval runs in a fresh git repository. Copy the eval's fixture files there
and commit them before the run (the fixture commit). Evals 17 and 19 search
with `git grep`, which finds nothing in a gitignored directory of this
repository.

Evals 11 to 16 are routing evals. Their prompts name neither the skill nor a workflow, and each sets
`expected_workflow`. The `reads_expected_workflow` assertion is checked from the transcript: the run
passes when it reads `references/workflows/<expected_workflow>.md`. They reuse the fixtures of the
workflow suites.

Workflow suites: [getting-started](getting-started/README.md), [doc-only](doc-only/README.md), [design-architecture](design-architecture/README.md), [feature-level](feature-level/README.md), [ux](ux/README.md), [doc-review](doc-review/README.md). Maintainer index: [`docs/developer/live-skill-evals.md`](../../../../docs/developer/live-skill-evals.md).
