# Doc-review workflow

Product capability: the **doc-review** workflow of the `merlon-docs` skill reviews a
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

## Evidence check

Every claim the review makes about a doc, such as an error, a duplicate, or a
mismatch with the code, is checked against its source before the review acts on
it or reports it. A finding from `merlon review`, a reviewer lens, an earlier
report, or the agent's own notes is a claim, not a fact. The record for each
claim has five parts:

1. The claim, as printed, with the file and line it is about
2. What the reviewer opened to test it: the file or URL, not the citation the
   claim gives
3. What that source says, quoted
4. A verdict, one of matches, disagrees, missing, impossible, superseded, or
   can't tell, and how confident the reviewer is
5. What the reviewer would have concluded had they stopped one step earlier

Only a claim that matches with high or moderate confidence leads to an edit. The
others are dropped or reported as open. The record goes in the reply and in the
commit message of the commit group that acts on the claim, not in a durable
shard. The [evidence check reference](../../../../skills/merlon-docs/references/review/evidence-check.md)
in the skill defines each verdict and gives an example record.

Why: a finding read from a report or a heuristic is often wrong in ways that
only opening the source shows. Parallel pages repeat a paragraph on purpose, a
wrong reference has more copies than the finding counted, or the finding came
from an older version of the tool.

## Review outcomes

Each doc a review looks at ends in one of four outcomes. Two questions decide
which: did the doc need to change, and did the review change it? A
**positive** means the review flagged or changed the doc, and a **negative**
means it left the doc as it was. **True** means the review was right, and
**false** means it was wrong.

| Did the doc need to change? | Review changed it                                                                     | Review left it                                                                          |
| --------------------------- | ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Yes                         | [True positive](../../../glossary/true-positive.md): a needed fix was made            | [False negative](../../../glossary/false-negative.md) (type II error): a fix was missed |
| No                          | [False positive](../../../glossary/false-positive.md) (type I error): a needless edit | [True negative](../../../glossary/true-negative.md): a correct doc was left alone       |

The [evidence check](#evidence-check) guards against false positives, because a
claim edits a doc only when its verdict is that it matches. A claim that the
check drops is a true negative when the doc was right, and a false negative when
the doc did need the change. A false negative leaves no trace in the review
itself. A later review, a reader, or a bug report finds it, so a review reports
the claims it dropped as well as the edits it made.

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
| Evidence for each claim  | The five-step [evidence check](#evidence-check) before any decision; only a claim that matches leads to an edit   |
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
   stays, and each claim about a doc with its five-step evidence record
2. Leaves every guide index readable as a map, grouped under headings once it
   passes about a dozen entries
3. States each rule in one shard, with other shards linking to it
4. Passes `merlon check` after every commit group

Optional local with/without-skill grading for this workflow:
[doc-review workflow live evals](../../../../tests/skills/merlon-docs/evals/doc-review/README.md)
(maintainer workflow, not a CI gate). See [Live skill evals](../../../developer/live-skill-evals.md).
