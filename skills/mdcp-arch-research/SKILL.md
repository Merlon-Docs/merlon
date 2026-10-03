---
name: mdcp-arch-research
description: >-
  Documentation system archetype for research projects: keep evidence durable
  and separable from product docs — records are dated observations that are
  never edited in place, product shards describe current state. Use when
  documenting studies, field reports, corpus measurements, surveys,
  benchmarks, or experiments, or when a project needs evidence to justify a
  specification without letting research accumulate inside its product
  documentation.
license: MIT
compatibility: >-
  Requires Node.js 18+ for @bwilliamson/mdcp-cli (docs compile,
  validate, and cross-link registry commands). Skill scripts are thin
  wrappers; they do not replace the CLI. Install the mdcp parent skill first.
metadata:
  author: betsalel-williamson
  internal: true
  version: '0.7.2'
  openclaw:
    category: 'documentation'
---

# MDCP Archetype: Research Project

For work that produces **evidence** rather than a shipping surface: field reports, corpus measurements, benchmarks, surveys, and experiments. Use it standalone for a research repository, or as an overlay that adds a research tier to a project that already has product documentation.

## The problem this archetype solves

Two documentation rules are both correct and cannot apply to the same file.

| Rule                        | Applies to       | What a correction does                 |
| --------------------------- | ---------------- | -------------------------------------- |
| Describe current state only | Product shards   | Edit in place; the old claim goes away |
| Preserve what was observed  | Research records | Never edit; a new record supersedes    |

Put them in one tier and the second rule becomes a blanket exemption the first one leaks through. Stale product prose then hides behind the same "historical" label that legitimately protects evidence, and the share of labelled-historical shards grows without bound. Separating the tiers is what keeps the current-docs rule enforceable.

## Layout

```text
docs/
  glossary/
  features/
    design-constraints/     # durable positions the evidence feeds
    research/               # dated records; never edited in place
      about-research-records.md
      field-report-*.md
      survey-*.md
      benchmark-*.md
  client/
  developer/
```

As an overlay on an existing repository, add `research/` under the guide that holds design rationale and leave every other tier alone.

## What separates a record from a product shard

| Content                                          | Tier                                   |
| ------------------------------------------------ | -------------------------------------- |
| What a corpus measured on a date                 | `research/`                            |
| The durable position that measurement argues for | `design-constraints/`                  |
| How the tool behaves today                       | `features/`                            |
| Whether a claim may appear in public copy        | `features/` (policy, not observation)  |
| A superseded measurement                         | `research/`, kept, with a link forward |

The sorting test: **would this still be true if the project shipped tomorrow and nobody ran another experiment?** Yes means product. No means record.

## Rules for a record

- **State the method.** Every figure names how it was produced, in enough detail for someone else to re-run. Numbers that cannot be reproduced are anecdote.
- **Tag confidence per claim.** Measured (a script produced it), observed (read without a metric), and not measured (looked for, absent) are three different things, and the third is a finding worth recording.
- **Caveat above the first table.** Corpus size, age, authorship, and what the sample cannot speak to belong before any number, not in a closing footnote.
- **Describe a source structurally, never by name.** Repository, organization, domain, and client identity stay out; counts and mechanisms are what generalize. Naming a contributed corpus is the contributor's decision, and an offer of attribution is a decision to refer back rather than a licence to take.
- **Separate observation from recommendation.** A record names the durable position it feeds and links to it. The record does not become the rule.
- **Supersede, never overwrite.** A later measurement is a new file that links back to the one it replaces.

## Deriving a normative claim from records

Evidence justifies a specification clause; it does not become one. Keep the derivation visible:

1. The record states what was observed and what it cannot support.
2. The durable position cites the record by link.
3. The normative clause cites the position.

A clause with no record behind it is a guess presented as a standard. Say so in the specification rather than quietly picking a number: a threshold derived from one small corpus is the failure this separation exists to make visible.

## Checking what the gate cannot

`mdcp check` validates structure, not truth. Two rules keep records honest where the gate cannot reach:

- A record cites its own scripts or commands, so the method is falsifiable by re-running rather than by review.
- Cross-repository references are URLs, never relative paths. A relative path into another repository resolves for nobody and is checked by nothing.

## Extension hooks

- Add a `research-provenance.md` shard under `docs/extensions/` for organization-specific rules on attribution, anonymity, embargo, and how contributed evidence is licensed.
- Data files a record cites (CSV, JSON) sit beside it and are referenced by link, so `mdcp check` validates their existence.
