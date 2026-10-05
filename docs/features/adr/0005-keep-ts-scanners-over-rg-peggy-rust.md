# ADR 0005: Keep linear TypeScript scanners over rg, Peggy, or Rust for markdown micro-parsers

- **Status:** Accepted
- **Date:** 2026-07-31
- **Related:** GitHub issues [#201](https://github.com/betsalel-williamson/mdcp/issues/201) (Phase B ReDoS audit), [#200](https://github.com/betsalel-williamson/mdcp/issues/200) (Phase A helpers), [#66](https://github.com/betsalel-williamson/mdcp/issues/66) (Rust engine lookout), [#230](https://github.com/betsalel-williamson/mdcp/pull/230) (prose → Vale); [Safe markdown parsing](../../developer/safe-markdown-parsing.md); [Locale and language boundary](../design-constraints/locale-and-language.md); [Performance goals](../protocol/performance.md)

## Context

Phase A replaced polynomial-risk regexes for headings and leftover Pandoc `{#…}` cleanup with shared **linear TypeScript helpers** under `mdcp-core`. Phase B continued that audit for remaining **protocol** regexes (such as the code-evidence line ranges).

Phase B rewrote the code-evidence line-range regex as an imperative scanner that takes its words from the locale pack. It also replaced the regex that matched the About this guide H1 with `parseHeading` and the locale's title. Phase B kept the Markdown link idioms as regexes, such as `MD_LINK_RE` in link extract, because its timings found them linear. On crafted input their time grows at least with the square of the input's length. [Link idioms](../../developer/safe-markdown-parsing.md#link-idioms) in Safe markdown parsing lists those sites with the rule that applies to them now.

Separately, [#230](https://github.com/betsalel-williamson/mdcp/pull/230) moved **language/prose** chapter-cue lint (“See Chapter…”, bare section mentions) out of `mdcp-core` into the **`MDCP` Vale style** in `@bwilliamson/mdcp-presets` ([vale.sh](https://vale.sh/)). That is the durable home for en-US prose opinion, not a TypeScript micro-parser in core. The same change also moved the authoring opinion against Pandoc heading IDs to this repository's Vale style `MDCP-PandocId`.

While reviewing Phase B we asked whether the remaining **core** scanners should use:

1. **ripgrep (`rg`)** — external search over paths
2. **Peggy** (or similar PEG) — generated parsers from a grammar
3. **Rust** (napi-rs or wasm) — native or wasm hot path for compile/lint

The product already parks a **whole-engine** Rust spike behind benchmark fixtures and SLO misses ([#66](https://github.com/betsalel-williamson/mdcp/issues/66)). This ADR records the narrower decision for the **core micro-parser** layer so future agents and humans can re-evaluate without re-deriving the trade-offs.

## Decision

We will **keep hand-written linear TypeScript scanners** for heading, anchor cleanup, and line-range style helpers that stay in `mdcp-core`.

We will **not** adopt ripgrep, Peggy (or equivalent PEG generators), or a Rust/wasm engine **for these core micro-parsers** as the next step after the ReDoS work.

We will **not** reintroduce chapter-cue prose lint into `mdcp-core` — that stays in Vale per [#230](https://github.com/betsalel-williamson/mdcp/pull/230).

| Option                         | Disposition for core micro-parsers                                                                                                                                             |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **TypeScript linear scanners** | **Chosen** for protocol helpers — in-process, O(n), ReDoS-safe, easy parity with prior regex behavior                                                                          |
| **Vale styles**                | **Chosen** for en-US prose chapter cues — not a core parse stack ([vale.sh](https://vale.sh/))                                                                                 |
| **ripgrep (`rg`)**             | **Declined** — filesystem search via process spawn; wrong layer for already-loaded strings that need structured rewrite results                                                |
| **Peggy / PEG**                | **Declined for now** — pays off for recursive shared grammars; overhead without benefit for flat left-to-right line walks                                                      |
| **Rust / wasm micro-helpers**  | **Declined for now** — bridge and packaging cost dominate unless whole-document compile is the unit of work (see [#66](https://github.com/betsalel-williamson/mdcp/issues/66)) |

## Consequences

- New heading / leftover `{#…}` / line-range logic in core prefers imperative scanners (or the shared `markdown/` helpers), not new polynomial-risk regexes and not a second parse stack.
- Unlinked “See Chapter…” / bare section prose stays in presets Vale `MDCP`; do not add `lintXrefs` back to core.
- Standard markdown **link** extract/rewrite regexes may remain where Phase B dismissed them; that is separate from this ADR.
- Performance work follows [Performance goals](../protocol/performance.md). Node benchmarks and profiling come first. Rust is a candidate only as a **batched compile engine**, and calling Rust through FFI once per helper is out of scope.
- ReDoS duration-budget tests remain the regression control for the core scanner class.

## Re-evaluate when

Reopen or supersede this ADR when **any** of the following is true:

1. **Profiled need**: after the Node profiling work and fixtures from [#66](https://github.com/betsalel-williamson/mdcp/issues/66), `--profile` (or equivalent) shows these scanners dominate assemble/check CPU on a real multi-guide corpus, and Node parallelism still misses Tier 1/2 SLOs.
2. **Unified grammar**: we intentionally adopt an authored-GFM **subset grammar** as product surface (Peggy or another generator becomes the source of truth for many constructs).
3. **Engine commitment**: a production Rust/wasm compile engine is released per [#66](https://github.com/betsalel-williamson/mdcp/issues/66); micro-parsers move **with** that batched pipeline, not as standalone FFI calls per line.
4. **New ReDoS / correctness class**: CodeQL or adopters show a scanner family that hand walks cannot keep correct without a real grammar.

Until then, treat proposals to introduce `rg`, Peggy, or Rust solely to “speed up” the Phase A/B core helpers as out of scope unless they meet a trigger above. Proposals to move prose cues back into core need a new ADR against the [#230](https://github.com/betsalel-williamson/mdcp/pull/230) boundary.
