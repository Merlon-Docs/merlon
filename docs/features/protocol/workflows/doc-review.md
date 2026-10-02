# Doc-review workflow

Product capability: the **doc-review** workflow of the `mdcp` skill reviews a
docs root as a set instead of shard by shard, then consolidates it. It looks for a rule stated in several shards, a guide index grown into a flat
list, or a shard serving a second audience or job, then merges, splits, moves,
rewords, or links them.

Workflow file: [`skills/mdcp/references/workflows/doc-review.md`](../../../../skills/mdcp/references/workflows/doc-review.md).
Shared workflow contract (intake, guide placement, glossary): [Skill workflows](../skill-workflows.md).

## End-user value

Readers keep finding the page they need as a project grows. Rules live in one
place, so an update cannot leave a stale copy behind. Agents load one shard
that is complete for its job instead of three partial ones.

Sprawl is gradual, so the person who should notice it rarely does. The skill
runs `mdcp review` at the end of a workflow when a sprawl trigger matches (several
new shards, a crowded index, a rule found twice) and offers this workflow
without being asked.

For projects whose docs change every week, the skill also recommends a weekly
routine that runs this workflow once per guide (`mdcp review --guide <name>`,
then a read of that guide) to settle where each duplicated rule belongs. For
one-off projects or projects that change only now and then, it says the
routine is not needed.

## What this workflow is for

| Obligation               | As-built expectation                                                                                        |
| ------------------------ | ----------------------------------------------------------------------------------------------------------- |
| Mechanical pass first    | Run `mdcp compile`, `mdcp check`, and `mdcp review`; fix check failures before judging review findings      |
| Reviewer lenses          | Read as product manager, staff engineer, technical writer, and designer                                     |
| One decision per finding | Merge, split, move, reword, link, delete, or leave, with a one-line reason                                  |
| Atomic commit groups     | One concern per group: moves, then merges and splits, then rewording, then index changes                    |
| Links keep working       | Every move, merge, or split updates incoming links in the same commit; `mdcp check` passes after each group |
| Raise the floor          | A finding that keeps recurring becomes a `review` threshold, a glossary entry, or a prose rule              |
| Weekly routine           | Recommended only for projects with changes every week; one run per guide, duplicates first                  |

## What this workflow is not

- **New content for a feature**: use the [feature-level workflow](./feature-level.md)
  or the [doc-only workflow](./doc-only.md).
- **Renaming code identifiers to match prose**: code keeps its names; prose
  follows the glossary.
- **Splitting a shard only because it is long**: a split needs a second
  audience, job, or concern ([idea mitosis](../shard-srp-and-mitosis.md)).

## Acceptance (as-built)

A successful review session typically:

1. Reports each `mdcp review` finding with the action taken or the reason it
   stays
2. Leaves every guide index readable as a map, grouped under headings once it
   passes about a dozen entries
3. States each rule in one shard, with other shards linking to it
4. Passes `mdcp check` after every commit group
