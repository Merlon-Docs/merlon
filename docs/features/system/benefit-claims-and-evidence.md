# Benefit claims and evidence

Policy for public copy, which covers the README and the npm package openings as well as the documentation site's pages and adoption material. Its parent is [Personas and priority tiers](../personas-and-priority-tiers.md).

## Claim tiers

| Tier                       | Rule                                                                        | Landing page (README or site) | Deeper shards                              |
| -------------------------- | --------------------------------------------------------------------------- | ----------------------------- | ------------------------------------------ |
| **A: mechanism**           | What the tool literally does                                                | Allowed (brief)               | Allowed                                    |
| **B: conditional outcome** | Benefit when the user follows documented workflow; qualify with "when you…" | Allowed (WIIFM lines)         | Allowed with qualification                 |
| **C: unmeasured outcome**  | Speed, quality, token %, "easier LLM coding" without data                   | **Forbidden**                 | Adoption stories or future benchmarks only |

The tiers are advisory, as [Enforceable rules](../design-constraints/enforceable-rules.md) uses the word, because no check reads claim wording. Whoever writes a change to public copy applies them, and the change's reviewer checks them. The review is the only evidence that a change met them.

## Common corrections

- **Scoped context**: comes from the **workflow** ([usage model](./usage-model.md): read one shard), not from a feature of the tool.
- **Retrieval / lookup verb as WIIFM**: forbidden. Doc discovery is host search, so don't claim Merlon Docs retrieves context by slug ([ADR 0002](../adr/0002-remove-refs-lookup.md)).
- **Faster delivery with agents**: a Tier C claim. Use adoption stories or measured outcomes.

## Figures from records and studies

A figure from a [research record](./research/about-research-records.md) supports at most a Tier B claim. Public copy that uses one gives the record's date and its main caveat, and it links the record. A record describes one corpus at one time. Its result is never stated as a general outcome. Field reports are records, and the same rule covers them.

Public copy that uses a figure from a published study, such as those in [Documentation and software reliability](./documentation-and-reliability.md), gives the study's year and its main caveat, and it links the study. A sponsor that sells tools for the problem the study measures is one such caveat.

The same advisory label applies, because no check reads how public copy cites a figure either.

## Context size

When agents follow the [usage model](./usage-model.md) and read one shard instead of the whole [monolith](../../glossary/monolith.md), per-turn context can be smaller. That is the Tier B form of the claim. The figures for Merlon Docs' own docs are in a dated record, [Context sizes: this repository's guides against one shard](./research/context-size-dogfood-2026-10-05.md). The Agent Skill tells an agent to find one shard with host search and open it, and to read compiled output only as a last resort. It can't stop an agent from reading a whole compiled guide or the monolith, and no record has measured how often agents stay at one shard.

Token counts in that record, and in any figure like it, are rough estimates for comparing sizes, because every model family tokenizes differently. [Benchmarks](../../developer/benchmarks.md) says how Merlon Docs' contributors measure them.

## Evidence elsewhere

- **`merlon check` catches orphans and broken links**: the [Check gate](../check-gate.md) spec and the CLI smoke tests
- **OpenAPI analogy**: the design intent is in [Scope and positioning](./01-scope-and-positioning.md#openapi-analogy). Merlon Docs doesn't claim membership in a standards body.

## Adoption anecdotes

Qualitative outcomes belong in adoption stories, not in unverified bullets on the README. [Versions and feedback](../../repo-readme/versions-and-feedback.md) says where to send one.
