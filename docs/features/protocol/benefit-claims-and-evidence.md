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

### Tokens are a rough estimate

The CSV reports every size in characters and in tokens. Token counts come from an open-source tokenizer, [gpt-tokenizer](https://github.com/niieani/gpt-tokenizer) with the `o200k_base` encoding by default. Every model family tokenizes differently, so treat a token count as a rough estimate and use it to compare sizes, never as a bill for one model.

Switch the tokenizer to match your own stack:

```bash
pnpm bench:context-size -- --tokenizer cl100k_base         # another gpt-tokenizer encoding
pnpm bench:context-size -- --tokenizer chars4              # characters ÷ 4, no tokenizer
pnpm bench:context-size -- --tokenizer-module ./count.mjs  # your counter: export countTokens(text)
```

`MDCP_TOKENIZER` and `MDCP_TOKENIZER_MODULE` set the same choices from the environment, and `--no-write` prints the table without touching the CSV.

### How to read the numbers

- **Whole guide versus one shard.** The `guide_*` rows are what an agent loads when it reads a compiled guide in full, the same order of size as pasting a large docs excerpt into a prompt. The `shard_*` rows are what it loads when it reads one shard. The ratio between them is the useful number.
- **Sharding** can reduce per-turn context **when agents read one shard instead of the whole [monolith](../../glossary/monolith.md)**. See `median_shard_pct_of_monolith` and `median_shard_token_pct_of_monolith` in the CSV.
- MDCP does **not** stop an agent from reading the whole monolith or a whole compiled guide. Discipline and Agent Skill instructions matter.

### Tier B wording (dogfood measurement)

On this repository, the median `docs/features/` shard is about **1.5%** of the monolith `docs/_build/guides.md`, by characters and by estimated tokens (about 850 tokens against about 60,000). Here the monolith contains the features guide and the glossary terms it links. When agents follow the [usage model](./usage-model.md) and read one shard instead of the whole monolith, per-turn context can be smaller. MDCP does not enforce that discipline. The Agent Skill and your workflow do.

## Evidence elsewhere

- **`mdcp check` catches orphans and broken refs**: the feature catalog and the core tests
- **OpenAPI analogy**: the design intent is in [Scope and positioning](./01-scope-and-positioning.md#openapi-analogy). MDCP doesn't claim membership in a standards body.

## Adoption anecdotes

Qualitative outcomes belong in [GitHub adoption stories](https://github.com/betsalel-williamson/mdcp/issues/new?template=adoption-story.yml) — not unverified bullets on the README.
