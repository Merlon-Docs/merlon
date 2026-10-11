# Doc-review workflow

Product capability: the **doc-review** workflow of the `mdcp` skill reviews a
docs root as a set instead of shard by shard, then consolidates it. It looks for a rule stated in several shards, a guide index grown into a flat
list, or a shard serving a second audience or job, then merges, splits, moves,
rewords, or links them.

Workflow file: [`skills/merlon-docs/references/workflows/doc-review.md`](../../../../skills/merlon-docs/references/workflows/doc-review.md).
[Skill workflows](../skill-workflows.md) covers the shared workflow contract: intake, atomic commit groups, guide placement, the glossary, and concept removal.

## End-user value

Readers keep finding the page they need as a project grows. Rules live in one
place, so an update cannot leave a stale copy behind. Agents load one shard
that is complete for its job instead of three partial ones.

Sprawl is gradual, so the person who should notice it rarely does. The skill
runs `merlon review` at the end of a workflow when one of the
[sprawl triggers](../../../../skills/merlon-docs/SKILL.md#6-sprawl-triggers) in
`SKILL.md` matches. When the review reports findings, the skill offers this
workflow without being asked.

## Weekly review routine

For projects whose docs change in most weeks, the skill also recommends a
weekly routine that runs this workflow once per guide (`merlon review --guide <name>`,
then a read of that guide) to settle where each duplicated rule belongs. Most
weeks means commits in at least three different weeks of
`git log --since="4 weeks ago" -- docs/`. For one-off projects or projects that
change only now and then, it says the routine is not needed.

When it recommends the routine, the repo's contributor docs state what starts
each run. A CI cron workflow or a scheduled task can start it, and so can a
named role that the docs assign the run to as a duty. A schedule alone is no
trigger, and neither is a team or role that the docs name without assigning it
the run. The docs also say what record each run leaves that outlasts CI log
retention, such as a comment on a standing tracker item. A run that doesn't
find anything leaves one too. The docs state only a trigger the repo has.
Until it has one, the skill tells the user what to set up and leaves the
routine out of the docs, or labels the routine advisory with the role that may
run it and what a run leaves behind. An advisory routine can skip the record of
a run that finds nothing.

In any project, a documented cadence with no trigger is removed or labeled
advisory in the same way. One with a trigger but no stated evidence gains the
record its runs leave, or the skill tells the user what to add when runs leave
none.

## What this workflow is for

| Obligation               | As-built expectation                                                                                              |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| Mechanical pass first    | Run `merlon compile`, `merlon check`, and `merlon review`; fix check failures before judging review findings      |
| Reviewer lenses          | Read as product manager, staff engineer, technical writer, and designer                                           |
| One decision per finding | Merge, split, move, reword, link, delete, or leave, with a one-line reason                                        |
| Atomic commit groups     | One concern per group: moves, then merges and splits, then rewording, then index changes                          |
| Links keep working       | Every move, merge, or split updates incoming links in the same commit; `merlon check` passes after each group     |
| Raise the floor          | A finding that keeps recurring becomes a `review` threshold, a glossary entry, or a prose rule                    |
| Weekly routine           | Docs that change most weeks; a trigger and run evidence, or labeled advisory; one run per guide, duplicates first |

## What this workflow is not

- **New content for a feature**: use the [feature-level workflow](./feature-level.md)
  or the [doc-only workflow](./doc-only.md).
- **Renaming code identifiers to match prose**: code keeps its names; prose
  follows the glossary.
- **Splitting a shard only because it is long**: a split needs a second
  audience, job, or concern ([idea mitosis](../shard-srp-and-mitosis.md)).

## Acceptance (as-built)

A successful review session typically:

1. Reports each `merlon review` finding with the action taken or the reason it
   stays
2. Leaves every guide index readable as a map, grouped under headings once it
   passes about a dozen entries
3. States each rule in one shard, with other shards linking to it
4. Passes `merlon check` after every commit group

Optional local with/without-skill grading for this workflow:
[doc-review workflow live evals](../../../../tests/skills/merlon-docs/evals/doc-review/README.md)
(maintainer workflow, not a CI gate). See [Live skill evals](../../../developer/live-skill-evals.md).
