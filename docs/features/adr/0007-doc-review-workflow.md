# ADR 0007: Review the docs as a set in their own workflow

- **Status:** Accepted
- **Date:** 2026-10-01
- **Related:** PR [#281](https://github.com/betsalel-williamson/mdcp/pull/281); [Doc-review workflow](../protocol/workflows/doc-review.md); [`mdcp review`](../../client-cli/commands-reference.md#sprawl-review); [Enforceable rules](../design-constraints/enforceable-rules.md); [ADR 0006](./0006-one-skill-with-workflows.md)

## Context

The bootstrap, docs-only, design, feature and UX workflows each handle one task, such as adding a shard or recording a decision. `mdcp check` validates what each change touches: links, formatting and compiled output. Problems that only appear across shards pass both and accumulate unseen:

- A rule restated in several shards. Each copy passes `mdcp check`, and an update to one leaves the others stale.
- A guide index that grows into a flat list nobody can scan.
- A shard that has picked up a second audience or a second job.

The evidence that this happens in practice:

- In one field report ([Field report: the edge of the validated surface](../protocol/research/field-report-validated-surface.md)), the same wire format was described in two files that had already drifted apart.
- On this repository's own docs, the first review pass found four guide indexes over the 12-entry limit and three repeated paragraphs. It also found a restated copy of the skill's QA principles that no longer matched the skill. Later passes on October 4 and 5 produced nine more commits, each giving a repeated rule one home and linking the other places to it.
- Before this workflow existed, a request about a flat index full of duplicated rules went to `mdcp-doc-only`, which edits the shard in front of it.

Sprawl is gradual, so the person who should notice it rarely does. The owner asked for a review that catches it without a human starting it.

## Decision

Add a doc-review workflow to the `mdcp` skill, and an `mdcp review` command for its mechanical pass.

- **`mdcp review`** is report-only. It reads every shard compile reads and reports crowded index groups, long shards, paragraphs repeated across shards and look-alike titles, each with a fix sentence. `--json` gives a sorted list, `--guide` limits the report to one guide, and `--strict` exits 1 on any finding for repositories that want a gate.
- **The workflow** runs compile, check and review, fixes check failures first, then reads the set through four reviewer lenses. Each finding gets one decision with a reason: merge, split, move, reword, link, delete or leave. Changes are committed in atomic commit groups, and `mdcp check` passes after each group.
- **The skill offers it unprompted** at the end of any workflow when a sprawl trigger matches. `SKILL.md` lists the triggers. Two of them are three or more new shards in one session and a rule found already stated elsewhere.
- **A weekly routine** is recommended only for projects whose docs change every week, and only with a stated trigger and a record each run leaves. [Field report: a fully automated repository](../protocol/research/field-report-automated-repository.md) documents a weekly hygiene pass that nothing ever started. The trigger rule exists so that this workflow does not repeat it.

## Alternatives considered

- **Fail `mdcp check` on duplicates.** Some repetition is deliberate: a notice that compiles into several published guides has to appear in each. Picking the shard that should define a rule takes judgment. So the signal is report-only, and maintainers who want the build to fail on findings add `--strict`.
- **Leave it to the doc-only workflow.** That workflow edits the shard a task names. Asked to update a rule found in three shards, an agent edits all three. The doc-review evals test exactly this request, and in the October 3 baseline the eval passed 2 of 3 assertions in each run, failing because the agent edited every copy instead of linking to one. See [Skill eval round](../protocol/research/skill-eval-round-2026-10-03.md).
- **Rely on human review.** Reviewers see one change at a time, the same view a task-level workflow has.

## Consequences

- Readers and agents load the one shard that defines a rule instead of several partial copies.
- `mdcp review` and its optional `review` config object are new public surface in the CLI and core packages.
- Each review signal is a heuristic. Duplicates below the word threshold and rules restated in different words are left to the reviewer lenses. A finding the lenses keep making should become a `review` threshold, a glossary entry or a prose rule.
- This repository runs `mdcp review` by hand, not in CI. Until it adds `--strict` to its gate, "one home per rule" is advisory here in the sense of [Enforceable rules](../design-constraints/enforceable-rules.md).
- The live evals gained a doc-review suite of four evals on a sprawl fixture, and a routing eval whose prompt never mentions the workflow.

## Re-evaluate when

- `mdcp review` findings on real repositories turn out mostly to be deliberate repetition, which would make the signals noise.
- A check can tell a rule's defining shard from a restatement without judgment, which would let part of this move into `mdcp check`.
