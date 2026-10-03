# About research records

What belongs in this directory, and the rules a record follows. Parent: [Vision and roadmap](../00-vision-and-roadmap.md). The archetype that generalizes this layout for other projects is the `mdcp-arch-research` extension, described in [Extensions and archetypes](../extensions-and-archetypes.md).

## Why research is a separate tier

Product shards describe the system as it works now, and a claim that stops being true is corrected in place. A research record is the opposite: it describes what was observed at a moment, and correcting it in place would destroy the observation. Both rules are right, and they cannot apply to the same file.

Keeping them in one tier forces a choice between two failures. Either the current-docs rule is enforced and evidence gets overwritten, or the rule is relaxed and stale product prose hides behind the same exemption. The second is what happens in practice, and it is the accumulation [Enforceable rules](../../design-constraints/enforceable-rules.md) argues against.

Separating the tiers resolves it. Product shards carry no exemption. Records are dated by construction, and their datedness is the point rather than a lapse.

## What belongs here

| Belongs                                 | Does not belong                             |
| --------------------------------------- | ------------------------------------------- |
| Field reports and corpus measurements   | Normative protocol text                     |
| Defect-injection and detection matrices | Current behavior of the CLI or the compiler |
| Survey and questionnaire responses      | Roadmaps and planned work                   |
| Evidence that a design constraint cites | The design constraint itself                |

A record that no longer holds is superseded by a new record rather than edited, and the new one links back. The policy for turning any of this into public copy is [Benefit claims and evidence](../benefit-claims-and-evidence.md), which stays in the product tier because it is a rule rather than an observation.

## Rules a record follows

- **State the method.** Every figure names how it was produced, in enough detail to re-run. A record whose numbers cannot be reproduced is an anecdote.
- **Tag confidence.** Distinguish what a script measured, what was read without a metric, and what was looked for and not found. A recorded gap is a finding.
- **Caveat before the numbers.** Corpus size, age, authorship, and what the sample cannot speak to go above the first table, not in a footnote.
- **Describe sources structurally, never by name.** Repository, organization, domain, and client identity stay out. Counts and mechanisms generalize; identity does not, and naming a contributed corpus is the contributor's decision rather than the author's.
- **Separate observation from recommendation.** A record ends by naming which durable position it feeds and links to it. It does not itself become the rule.
- **Date it and leave it.** A superseding record is a new file.

## Related

- [Field report: a fully automated repository](./field-report-automated-repository.md)
- [Field report: the edge of the validated surface](./field-report-validated-surface.md)
- [Enforceable rules](../../design-constraints/enforceable-rules.md) — the position most records here feed
- [Benefit claims and evidence](../benefit-claims-and-evidence.md) — what may be said publicly from a record
- [Extensions and archetypes](../extensions-and-archetypes.md) — the archetype that packages this layout
