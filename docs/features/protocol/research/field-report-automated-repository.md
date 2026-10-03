# Field report: a fully automated repository

Evidence shard: what MDCP held and what it did not hold on a repository where every commit was authored by an agent. Parent: [Vision and roadmap](../00-vision-and-roadmap.md). The durable position this report argues for is [Enforceable rules](../../design-constraints/enforceable-rules.md).

## Setting

Reported 2026-09 by the maintainer, from a trunk-based repository with no human-authored commits: agents wrote every change across two harnesses, and MDCP had been in use for roughly two weeks. Client, organization, and domain details are omitted; counts and mechanisms are the part that generalizes.

| Measure                                                             | Value                  |
| ------------------------------------------------------------------- | ---------------------- |
| Shards across two compiled guides                                   | 94                     |
| Commits on trunk                                                    | ~1,450                 |
| Commits touching a shard                                            | ~440                   |
| Commits touching code and a shard together                          | ~200                   |
| Shards carrying "used to" / "no longer" / "until \<date>" narrative | 21                     |
| Shards over 300 lines                                               | 7 (largest ~800 lines) |
| Backtick paths in shards or a standalone guide resolving to nothing | 4                      |
| `mdcp check` runtime, passing                                       | 1.5 s                  |

## What held

The structural half of the protocol worked without supervision:

- **Manifest membership.** Every shard was indexed. The [orphan check](../../feature-catalog.md#orphan-check-p13) makes an unindexed shard fail the gate, so agents added the index entry as part of the same change.
- **Link integrity.** No dangling internal link survived to trunk. [Link validation](../../link-validation.md) fails `mdcp check`, so a broken cross-reference never reached review.
- **Docs landing with code.** About 200 of the ~440 shard-touching commits also touched code. The "update as you go" habit survived contact with a fully automated workflow, which is the outcome the skill's small-batch guidance is aiming at.
- **Cost.** A 1.5 s gate is cheap enough that no agent had a reason to skip it.

All four are the same mechanism: a rule an agent cannot step past without the gate going red.

## What did not hold

The content half — the requirement that a shard describe the product as it works now — drifted in three distinct ways:

- **A removed component still documented.** The component was deleted with an architecture decision record and a sweep of roughly 40 shard edits across four commits. A [standalone guide](../../../glossary/standalone-guide.md) still described the component, still listed it in its repository map, and still told a new session to start it. `mdcp check` passed throughout.
- **Errata prose in a durable guide.** The same standalone guide carried paragraphs explaining what it had previously claimed wrongly, and when. An agent wrote them deliberately, in response to a real failure the wrong claim had caused. Under the current-docs rule that text should not exist; under the repository's local convention to explain a constraint, it should. Both rules were in force at once, and nothing decided between them.
- **A scheduled hygiene pass that never ran.** The repository documented a weekly documentation-hygiene pass: a skill, a registered skill row, and a stated cadence. Nothing fired it. Two cadence periods passed with no run, no ticket, and no commit. The corpus described a mechanism that did not exist, which is the drift the mechanism was meant to catch.

## Why the content rule did not hold

The report attributes the failure to structure rather than to agents ignoring the skill. Five mechanisms, in rough order of force:

1. **The gate is structural; the rule is semantic.** Agents stop when the gate is green, and `mdcp check` is green with stale prose, dead backtick paths, and a guide describing a removed component. The [check gate](../../feature-catalog.md#check-gate-p04) validates that documents refer to each other correctly, never that they refer to the product correctly.
2. **Standalone guides are less checked than compiled ones.** A standalone guide is register-only: compile never stitches or rewrites it, and the gate reads it for heading registration and outbound links — see [Documentation coverage scan](../../coverage-scan.md). It also sits outside the guide directories an agent sweeps when it greps `docs/`. The largest drift in this report was in a standalone guide, and that is not a coincidence.
3. **Ticket scope ends at the grep.** An agent removing a concept edits the shards its search returns inside its declared scope. The [two-level review](../../agent-skill.md#quality-assurance-qa-principles) asks it to compare the change against related shards, but nothing enumerates every guide that names the removed concept, and a standalone guide outside the searched tree is the one most likely to be missed.
4. **Deleting has a worse payoff than keeping.** Removing context risks a repeated incident that a reviewer or a later agent will notice and attribute. Keeping it costs nothing at any gate. Where a local rule offers any exception — here, narrative that "explains a constraint" — every agent resolves the tie in the same direction, so archaeology accumulates monotonically. A rule that is unconditional upstream is not safe either; it is simply unbudgeted.
5. **A hygiene pass with no named trigger does not exist.** The repository stated a cadence and described what the pass should do. It never stated what fires the pass or how a run is evidenced. A documented schedule with no actor behind it is indistinguishable from one that was never wired, including to the agents reading the corpus.

## What this means for the protocol

The report's conclusion is narrow and worth stating plainly: **in a repository with no human in the commit path, a documentation rule with no failing check is a preference.** MDCP's pitch is trustworthy context for agents that arrive with no history. The structural checks deliver that for links and indexes. Content is where the trust actually breaks, and today the content rules rely on a reader that a fully automated repository does not have.

Three positions follow, all of them protocol-level rather than repository-level:

- Anything mechanical in a content rule belongs in the checker. A backtick path that resolves to nothing is a factual claim about the repository that a gate can falsify, and it was the cheapest signal available in this field report.
- Whatever the gate validates for a compiled guide should also run over a standalone one. Being uncompiled is a compile property, not a reason to be trusted more.
- A rule that cannot be mechanized should say who enforces it and how a run is evidenced, or should be labelled advisory. See [Enforceable rules](../../design-constraints/enforceable-rules.md).

Specific checker proposals are tracked in the issue tracker rather than here, so this shard stays a record of what was observed.

## Related

- [Enforceable rules](../../design-constraints/enforceable-rules.md) — the durable design position
- [Benefit claims and evidence](../benefit-claims-and-evidence.md) — how field evidence may be used in public copy
- [Documentation coverage scan](../../coverage-scan.md) — standalone guide handling
- [Link validation](../../link-validation.md) — the structural checks that held
- [Usage model](../usage-model.md) — the workflow the report assumes
