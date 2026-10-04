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

## Context-size measurement (dogfood repo)

**Source:** [context-size-dogfood.csv](./context-size-dogfood.csv)

Regenerate after compile:

```bash
pnpm build && pnpm docs:compile:repo && pnpm bench:context-size
```

### How to read the numbers

- **Sharding** can reduce per-turn context **when agents read one feature shard instead of the whole [monolith](../../glossary/monolith.md)**. See `median_shard_pct_of_monolith` in the CSV.
- MDCP does **not** stop an agent from reading the whole monolith or a whole compiled guide. Discipline and Agent Skill instructions matter.

### Tier B wording (dogfood measurement)

On this repository, the median `docs/features/` shard is **~2%** of the monolith `docs/_build/guides.md` by character count (median ~5.3k chars vs ~261k chars). Here the monolith contains the features guide and the glossary terms it links. When agents follow the [usage model](./usage-model.md) and read one shard instead of the whole monolith, per-turn context can be smaller. MDCP does not enforce that discipline. The Agent Skill and your workflow do.

## Evidence elsewhere

- **`mdcp check` catches orphans and broken refs**: the feature catalog and the core tests
- **OpenAPI analogy**: the design intent is in [Scope and positioning](./01-scope-and-positioning.md#openapi-analogy). MDCP doesn't claim membership in a standards body.

## Adoption anecdotes

Qualitative outcomes belong in [GitHub adoption stories](https://github.com/betsalel-williamson/mdcp/issues/new?template=adoption-story.yml) — not unverified bullets on the README.
