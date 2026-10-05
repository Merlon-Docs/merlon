# Benefit claims and evidence

Policy for public copy — README, npm package openings, and adoption material. Parent: [Personas and priority tiers](../personas-and-priority-tiers.md).

## Claim tiers

| Tier                        | Rule                                                                        | Landing page (README) | Deeper shards                              |
| --------------------------- | --------------------------------------------------------------------------- | --------------------- | ------------------------------------------ |
| **A — Mechanism**           | What the tool literally does                                                | Allowed (brief)       | Allowed                                    |
| **B — Conditional outcome** | Benefit when the user follows documented workflow; qualify with "when you…" | Allowed (WIIFM lines) | Allowed with qualification                 |
| **C — Unmeasured outcome**  | Speed, quality, token %, "easier LLM coding" without data                   | **Forbidden**         | Adoption stories or future benchmarks only |

## Common corrections

- **Scoped context** — Comes from **workflow** ([usage model](./usage-model.md): read one shard), not from a token-strip export profile.
- **Retrieval / lookup verb as WIIFM** — Forbidden. Doc discovery is host search; do not claim MDCP retrieves context by slug — see [ADR 0002](../adr/0002-remove-refs-lookup.md).
- **Ship faster with agents** — Tier C; use adoption stories or measured outcomes.

## Context size

When agents follow the [usage model](./usage-model.md) and read one shard instead of the whole [monolith](../../glossary/monolith.md), per-turn context can be smaller. That is the Tier B form of the claim. The figures for mdcp's own docs are in a dated record, [Context sizes: this repository's guides against one shard](./research/context-size-dogfood-2026-10-05.md). The Agent Skill tells an agent to find one shard with host search and open it, and to read compiled output only as a last resort. It can't stop an agent from reading a whole compiled guide or the monolith, and no record has measured how often agents stay at one shard.

Token counts in that record, and in any figure like it, are rough estimates for comparing sizes, because every model family tokenizes differently. [Benchmarks](../../developer/benchmarks.md) says how mdcp's contributors measure them.

## Evidence elsewhere

- **`mdcp check` catches orphans and broken links**: the [Check gate](../check-gate.md) spec and the CLI smoke tests
- **OpenAPI analogy**: the design intent is in [Scope and positioning](./01-scope-and-positioning.md#openapi-analogy). MDCP doesn't claim membership in a standards body.

## Adoption anecdotes

Qualitative outcomes belong in [GitHub adoption stories](https://github.com/betsalel-williamson/mdcp/issues/new?template=adoption-story.yml) — not unverified bullets on the README.
