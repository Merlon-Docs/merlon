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
- **Not skills-ref validation.** [`pnpm skill:validate`](./agent-skill.md#verification)
  checks skill packages on disk with
  [skills-ref](https://agentskills.io/specification) and doesn't spawn agents.

## Tooling

- **skill-creator**: vendored at
  [`.agents/skills/skill-creator/`](../../.agents/skills/skill-creator/SKILL.md);
  evaluate loop (prompts → with/without skill → grade → aggregate)
- **writing-skills**: vendored at
  [`.agents/skills/writing-skills/`](../../.agents/skills/writing-skills/SKILL.md);
  a guide to writing a skill as test-driven process documentation, with
  pressure scenarios that subagents run before and after the skill exists.
  Nothing under `scripts/` or `.github/` runs it; a host that reads
  `.agents/skills/` loads it like skill-creator.
- **`skills-lock.json`**: pins each vendored skill and records its source
- **`pnpm skill:evals:view [N]`**: writes a static viewer for iteration N (default 1)
  of the top-level suite's workspace to `.agents/skills/merlon-docs-workspace/iteration-N/viewer.html`,
  and opens it where the `open` command exists. Elsewhere it prints the path to open.
  It doesn't open a workflow suite's workspace.
- **`.agents/skills/*-workspace/`**: per-iteration run outputs (gitignored via
  `*-workspace/`)

Refresh a vendored skill from upstream when needed, with the source that `skills-lock.json` records for it:

```bash
npx skills add <source> --skill <name>
```

## Suite inventory

Live eval fixtures live under `tests/skills/<skill>/evals/` so publishable packs
under `skills/` stay eval-free (`npx skills` / `pnpm skill:validate` only touch
`skills/`).

- [Merlon Docs](../../tests/skills/merlon-docs/evals/README.md) — subject `merlon-docs`; routing and
  QA principles; workspace `.agents/skills/merlon-docs-workspace/`
- One suite per workflow under `tests/skills/merlon-docs/evals/<workflow>/`, each with
  subject `merlon-docs`:
  [getting-started](../../tests/skills/merlon-docs/evals/getting-started/README.md),
  [doc-only](../../tests/skills/merlon-docs/evals/doc-only/README.md),
  [design-architecture](../../tests/skills/merlon-docs/evals/design-architecture/README.md),
  [feature-level](../../tests/skills/merlon-docs/evals/feature-level/README.md),
  [ux](../../tests/skills/merlon-docs/evals/ux/README.md),
  [doc-review](../../tests/skills/merlon-docs/evals/doc-review/README.md); workspace
  `.agents/skills/merlon-docs-<workflow>-workspace/`

Each suite README holds operational run steps and discrimination notes. This
shard is the maintainer index.

## Layout contract

Shared shape for workflow suites:

| Path                                   | Purpose                                                                 |
| -------------------------------------- | ----------------------------------------------------------------------- |
| `evals.json`                           | `skill_name`, prompts, `expected_output`, `files[]`, named `assertions` |
| `files/`                               | Isolated fixture trees for run workspaces (not real monorepo `docs/`)   |
| `triggers.json` / `trigger_evals.json` | Optional description-trigger tuning (top-level suite only)              |
| `README.md`                            | How to run and grade that suite                                         |

An eval may also set `expected_workflow`, the workflow file a routing eval must read. That check
reads the transcript instead of going to the grader. An eval may set `setup` too, which asks the
runner to add dated commits after the fixture commit (see the doc-review suite README).

Workflow intake and write obligations stay in
[Skill workflows](../features/system/skill-workflows.md).
