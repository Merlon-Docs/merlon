# Live skill evals

Optional local workflow that runs an agent **with** and **without** a subject
Agent Skill, grades behavior against named assertions, and reviews results in a
viewer. Maintainers use it to tune skill instructions and prove each workflow's scope
(for example design-only vs product code).

This is **maintainer workflow**, not a product capability — it belongs in the
Developer Guide. Product Agent Skill delivery stays in
[Agent Skill](../features/agent-skill.md).

## What it is not

- **Never a CI gate.** Do not require Claude CLI, skill-creator, or live agent
  runs in GitHub Actions.
- **Not skills-ref validation.** `pnpm skill:validate`
  ([skills-ref](https://agentskills.io/specification)) checks skill packages on
  disk; it does not spawn agents.

Contrast: `pnpm skill:validate` remains the CI/static skill gate. See
[Agent Skill development](./agent-skill.md).

## Tooling

- **skill-creator** — vendored at
  [`.agents/skills/skill-creator/`](../../.agents/skills/skill-creator/SKILL.md);
  evaluate loop (prompts → with/without skill → grade → aggregate)
- **`pnpm skill:evals:view`** — open the eval viewer helper script
- **`.agents/skills/*-workspace/`** — per-iteration run outputs (gitignored via
  `*-workspace/`)

Refresh skill-creator from upstream when needed:

```bash
npx skills add anthropics/skills --skill skill-creator
```

## Suite inventory

Live eval fixtures live under `tests/skills/<skill>/evals/` so publishable packs
under `skills/` stay eval-free (`npx skills` / `pnpm skill:validate` only touch
`skills/`).

- [mdcp](../../tests/skills/mdcp/evals/README.md) — subject `mdcp`; routing and
  QA principles; workspace `.agents/skills/mdcp-workspace/`
- One suite per workflow under `tests/skills/mdcp/evals/<workflow>/`, each with
  subject `mdcp`:
  [getting-started](../../tests/skills/mdcp/evals/getting-started/README.md),
  [doc-only](../../tests/skills/mdcp/evals/doc-only/README.md),
  [design-architecture](../../tests/skills/mdcp/evals/design-architecture/README.md),
  [feature-level](../../tests/skills/mdcp/evals/feature-level/README.md),
  [ux](../../tests/skills/mdcp/evals/ux/README.md),
  [doc-review](../../tests/skills/mdcp/evals/doc-review/README.md); workspace
  `.agents/skills/mdcp-<workflow>-workspace/`

Each suite README holds operational run steps and discrimination notes. This
shard is the maintainer index.

## Layout contract

Shared shape for workflow suites:

| Path            | Purpose                                                                 |
| --------------- | ----------------------------------------------------------------------- |
| `evals.json`    | `skill_name`, prompts, `expected_output`, `files[]`, named `assertions` |
| `files/`        | Isolated fixture trees for run workspaces (not real monorepo `docs/`)   |
| `triggers.json` | Optional description-trigger tuning (top-level suite only)              |
| `README.md`     | How to run and grade that suite                                         |

An eval may also set `expected_workflow`, the workflow file a routing eval must read. That check
reads the transcript instead of going to the grader. An eval may set `setup` too, which asks the
runner to add dated commits after the fixture commit (see the doc-review suite README).

Workflow intake and write obligations stay in
[Skill workflows](../features/protocol/skill-workflows.md).
