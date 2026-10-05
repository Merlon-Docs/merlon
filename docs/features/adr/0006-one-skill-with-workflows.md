# ADR 0006: Publish one skill that routes to workflows

- **Status:** Accepted
- **Date:** 2026-10-01
- **Related:** PR [#281](https://github.com/betsalel-williamson/mdcp/pull/281) (the consolidation); PR [#285](https://github.com/betsalel-williamson/mdcp/pull/285) (measured follow-up changes); [Agent Skill](../agent-skill.md); [Skill workflows](../protocol/skill-workflows.md); [Live skill evals](../../developer/live-skill-evals.md); [Skill eval round](../protocol/research/skill-eval-round-2026-10-03.md); [ADR 0007](./0007-doc-review-workflow.md)

## Context

MDCP was published as six Agent Skills: a parent `mdcp` skill and five helpers (`mdcp-getting-started`, `mdcp-doc-only`, `mdcp-design-architecture`, `mdcp-feature-level`, `mdcp-ux`). Each helper had its own description, so the host chose a helper by matching the request against six descriptions. A person had to install the set and learn which helper to call.

That layout had costs we could see before measuring anything:

- Shared rules were copied across skills. All six `SKILL.md` files described atomic commit groups, so the rule had six copies to keep in step.
- Routing happened in the host's skill matcher, where MDCP can only influence it through description text. A request that fit two helpers went to whichever description matched first.
- A new kind of task meant a new skill, with its own description, carrier package and eval suite. The doc-review work in [ADR 0007](./0007-doc-review-workflow.md) would have been a seventh.

The owner asked for one `mdcp` skill that pulls in what each task needs instead of many small skills.

## Decision

Publish one `mdcp` skill. Each former helper becomes a workflow file under [`skills/mdcp/references/workflows/`](../../../skills/mdcp/references/workflows/), and `SKILL.md` holds a routing table that picks one workflow per task and loads only that file. `SKILL.md` or [Skill workflows](../protocol/skill-workflows.md) defines each rule every workflow shares, such as atomic commit groups and guide placement, and workflow files link to it.

The helpers are no longer published. People install `mdcp` alone and invoke it as `/mdcp` with the task in plain words.

## Evidence

Measured on October 2, 2026, with headless agent runs in throwaway copies of the eval fixtures. The same model and the same permissions applied to both arms. A separate model call graded each run against the eval's assertions. The harness and raw results are kept with the project's working files, outside the repository.

| Measure                                                                 | Six skills | One skill       |
| ----------------------------------------------------------------------- | ---------- | --------------- |
| Workflow evals, workflow named in the prompt (23 evals)                 | 98 of 117  | 99 of 117       |
| Workflow evals, workflow name removed (two runs of the one-skill arm)   | 58 of 75   | 53 and 57 of 75 |
| Workflow-style requests that reached the intended workflow (two rounds) | 3 of 10    | 10 of 10        |

On identical prompts, two runs of the one-skill arm differed by 4 assertions. That is about the size of every gap in the first two rows. Those rows show the merge changed scores by less than noise, in either direction. The routing row is the measured gain. In the six-skill arm, `mdcp-doc-only` took the UX, doc-review and feature-level requests in both rounds.

The October 3 round in [Skill eval round](../protocol/research/skill-eval-round-2026-10-03.md) then changed the consolidated skill one variant at a time and kept four changes that beat noise. That round is evidence for the later changes, not for this decision.

## Consequences

- Installation is one command, and the skills.sh grouping lists one skill. The helper carrier packages are gone, and a changeset tells people who installed a helper to remove it.
- A prompt with a helper's command (`/mdcp-ux`) no longer resolves. People describe the task instead, and the routing table picks the workflow.
- `SKILL.md` grew from 245 lines in the old parent to 401, because it now holds the routing table and the shared rules. The longest helper was 128 lines. Workflow bodies stay in their own files and load only when picked.
- A new kind of task adds a workflow file and a row in the routing table. The doc-review workflow was the first to arrive this way.
- Live evals sit under `tests/skills/mdcp/evals/`, one folder per workflow, plus routing evals whose prompts mention neither the skill nor a workflow, so routing is measured rather than assumed.
- Archetype extensions (`mdcp-arch-*`) are still published as their own skills. They extend a project's layout rather than run a task, and [Agent Skill](../agent-skill.md) covers how they are published.

## Re-evaluate when

- One workflow needs tools, permissions or a model that the others must not have, since hosts scope those per skill.
- Routing evals show the table sending requests to the wrong workflow more often than run-to-run noise explains.
- `SKILL.md` grows past what a host loads comfortably, and moving shared rules into reference files can't bring it back.
