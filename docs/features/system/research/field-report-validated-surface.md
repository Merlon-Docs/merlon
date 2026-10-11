# Field report: the edge of the validated surface

Evidence shard: what `mdcp check` caught and what it structurally could not, measured on a second repository by injecting defects and by replaying every commit. Parent: [Vision and roadmap](../00-vision-and-roadmap.md). The durable position this report argues for is [Enforceable rules](../../design-constraints/enforceable-rules.md).

## Setting

Reported 2026-09 from a second repository whose documentation is authored as shards and validated by `mdcp check` in a required CI job. One human author plus coding agents, which co-authored 23 of 50 commits. Repository, organization, and domain details are omitted; counts and mechanisms are the part that generalizes.

| Measure                                  | Value                      |
| ---------------------------------------- | -------------------------- |
| Shards across four compiled guides       | 75                         |
| Words across all shards                  | 32,400                     |
| Internal Markdown links                  | 397                        |
| Tracked history at measurement           | 8 days, 50 commits, 63 PRs |
| Shard size, median / p90 / max words     | 295 / 951 / 2,013          |
| Headings in the compiled registry        | 462                        |
| Headings needing a collision suffix      | 129 (28%)                  |
| Distinct internal links broken in 8 days | 11                         |
| Broken links still unfixed               | 3                          |
| `mdcp check` runtime, passing            | 1.3 s                      |

This corpus is smaller and younger than the dogfood corpus, and the same person maintains it and MDCP. It is a second data point, not independent large-scale evidence, and it says nothing about behavior at ten or a thousand times the size. What it does carry is a defect-injection matrix and a per-commit link history, so the mechanisms are measured rather than recalled.

## What held

- **Manifest bijection.** A shard absent from an index fails as an orphan, and an index entry with no file fails too. Both directions were injected and both failed the gate. This is the rule the maintainer named as the one to adopt on day one, because it makes adding a page a deliberate act and everything else checkable.
- **Markdown-to-Markdown link integrity.** A link to a missing shard in the same guide, in another guide, a dead anchor, a renamed heading with a stale inbound anchor, and a moved shard with un-updated inbound links: five injected defects, five gate failures. Across all 50 commits, every broken Markdown link inside the docs root was caught before it reached trunk.
- **Heading renames.** Of the 11 links that broke, renames caused zero. The rename fails the gate. The author then fixes inbound links in the same change. Stability came from the check rather than from explicit heading IDs, of which the corpus has none.
- **Precision.** The history contains zero spurious failures. For contrast, the throwaway checker written for this survey produced one false positive in three findings.
- **Cost.** A full compile plus check is 1.3 s, and the docs job is path-scoped, so the gate is cheap enough that nobody had a reason to skip it.

## What the gate did not see

Deletions caused seven of the eleven breaks in eight days, and wrong relative paths written at authoring time caused four. Grouped by why the gate passed:

| Links | Mechanism                                                 | Outcome                    |
| ----- | --------------------------------------------------------- | -------------------------- |
| 4     | Wrong relative path from a shard into a source file       | Deleted with the shard     |
| 3     | Contributor guide pointing at shards removed in a cutover | Still broken after 12 days |
| 3     | Links between files in an ignore-listed planning folder   | Purged with the folder     |
| 1     | Durable shard linking into that ignore-listed folder      | Broken until the link went |

Every link that broke and went unfixed pointed at a file the gate never reads. Injecting a link to a non-existent source file passed the gate. So did a bare fragment where seven headings collide. So did two shards sharing an H1 title.

Two further findings are outside the link graph entirely. A deleted feature shard is cited by path in running prose rather than as a link in two files, which puts it beyond any link checker, and both were still wrong 12 days later. The same wire format is also described twice, in two files outside the docs root, already drifting apart.

## Anchor identity depends on manifest order

Shards reuse templated section names, so 28% of the compiled headings needed a numeric suffix. "Strengths", "Weaknesses", "Related" and "Critical improvements" each appear 11 times, "Intent" 7 times. Suffixes are assigned in compile order, so reordering a manifest renumbers anchors such as `#intent-4` with nothing failing.

The cause is template reuse rather than corpus size, which means a small corpus with a decision-record template shows the same pattern. This repository is one: 47 of its 330 compiled headings are suffixed, across 17 colliding bases, the largest being seven headings named "Related". The renumbering is harmless here only because fragment links are rare, which was also true of the reported corpus, where 8 of 397 links carried a fragment and half of those were table-of-contents self-links.

## Current docs only, measured again

Nineteen of 75 shards, 25%, carry a "historical", "closed" or "superseded" marker. Half of the largest guide is archive material that the guide's own preamble tells readers not to trust. One decision record is kept explicitly so that agents reading older notes understand why a term appeared. Wrong and unlabelled statements number one inside the docs root and three outside it.

The pattern matches the [fully automated repository report](./field-report-automated-repository.md) from a different corpus under a different workflow: the rule is honoured by labelling rather than by deletion, because labelling doesn't cost anything at any gate and deletion risks losing context somebody wants back.

## Retrieval cost

Agents load whole shards, never chunks. Estimated at four characters per token, a guide index is 300 to 480 tokens and the median shard is 590, against 78,100 for the compiled everything file. An index-plus-shard read is roughly 1/78 of the monolith when the first shard is the right one. The skill preamble is 3,400 tokens and dominates a single lookup, at about three quarters of it.

These are static sizes rather than observed consumption. The corpus doesn't record agent session logs, token counts or costs. The ratio is the only figure it can contribute.

## What this means for the protocol

- **Every file that can carry a link should have its links checked.** This is the report's strongest finding, and it restates the conclusion of the first corpus: a rule with no failing check is a preference. Here the boundary was not a missing rule but a scoping decision that bought a fast, quiet check and paid with the only persistent breakage in the repository.
- **A scan ignore list answers one question and is used for two.** "This file is not a shard, so do not expect it in a manifest" and "do not check the links in this file" are separate exemptions behind one configuration key. Every link in the third and fourth rows above broke because the second exemption was granted along with the first.
- **Anchor identity should not depend on manifest order.** A suffix assigned by compile position makes a stable-looking anchor positional, and no signal distinguishes a fragment that resolves uniquely from one that resolves to the first of seven.
- **A size ceiling cannot be normative as one number.** Shard size here is bimodal by job rather than normal: glossary entries average 63 words and audit records 722. One ceiling would be either meaningless for the first or violated by every instance of the second. The corpus doesn't impose a ceiling. It splits on responsibility instead, which is the position [Shard single responsibility and idea mitosis](../shard-srp-and-mitosis.md) already argues.

Specific checker proposals are tracked in the issue tracker rather than here, so this shard stays a record of what was observed.

## Related

- [Field report: a fully automated repository](./field-report-automated-repository.md) — the first corpus, on content drift
- [Enforceable rules](../../design-constraints/enforceable-rules.md) — the durable design position
- [Link validation](../../link-validation.md) — the structural checks that held
- [Documentation coverage scan](../../coverage-scan.md) — where the scan boundary is drawn
- [Shard single responsibility and idea mitosis](../shard-srp-and-mitosis.md) — splitting on responsibility rather than length
- [Benefit claims and evidence](../benefit-claims-and-evidence.md) — how field evidence may be used in public copy
