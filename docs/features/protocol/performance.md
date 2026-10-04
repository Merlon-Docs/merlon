# Performance goals

Latency targets for MDCP compile, validation, and agent query paths, and the shard count each target is defined at.

MDCP is designed for **full programs** (hundreds of shards across multiple guides with dense cross-links) while keeping interactive agent loops and CI gates fast. This page sets the targets. Measurements against them are [research records](./research/about-research-records.md), dated and kept as measured.

## Why performance matters

| Actor                    | Hot path                        | Expectation                                        |
| ------------------------ | ------------------------------- | -------------------------------------------------- |
| LLM doc author           | edit shard → `check`            | Compile+check under a few seconds during authoring |
| CI                       | `mdcp check --require-lint`     | PR gate completes before reviewer context switches |
| Agent (context consumer) | Host search → single-shard read | No full-repo compile on every query                |

The [usage model](./usage-model.md) prefers granular context (one shard at a time). Performance work keeps that model viable as repos grow.

## Service level objectives (SLOs)

Normative targets below. Each target is defined at a shard count. A smaller corpus that meets a target doesn't show the target is met at that count. The most recent measured run is [Benchmark: this repository's docs before and after single-pass compile](./research/benchmark-dogfood-2026-06-19.md).

### Tier 1: Interactive (agent authoring loop)

| Operation                | Target                    | Rationale                                    |
| ------------------------ | ------------------------- | -------------------------------------------- |
| `compile` (single guide) | **< 500 ms** @ 200 shards | Fast feedback while editing one feature area |
| `compile` (full repo)    | **< 2 s** @ 200 shards    | Pre-push sanity check                        |

### Tier 2: CI gate (core mdcp only, no peers)

| Operation                                  | Target                  | Rationale                            |
| ------------------------------------------ | ----------------------- | ------------------------------------ |
| `check` (orphans + compile + refs + links) | **< 5 s** @ 200 shards  | PR feedback under 10 s total         |
| Same                                       | **< 15 s** @ 500 shards | Large program still acceptable in CI |

### Tier 3: Full CI (with peer linters)

| Operation                             | Target                  | Rationale                                    |
| ------------------------------------- | ----------------------- | -------------------------------------------- |
| `check --require-lint --require-vale` | **< 30 s** @ 200 shards | Peers are opt-in; budget separately          |
| Same                                  | **< 60 s** @ 500 shards | Upper bound before parallelization / caching |

### Tier 4: Regression metrics

The benchmark measures the lint time and writes the ms/link row. It records the compile time, not a time per shard. The ms/shard row is the compile time divided by the shard count. Both timings are compared from one run to the next. CI doesn't run the benchmark, so a regression in them shows up only when someone runs it by hand.

| Metric                          | Target                                      |
| ------------------------------- | ------------------------------------------- |
| ms / shard (compile)            | Trend down; a regression over 20% is a miss |
| ms / link (lint)                | Trend down                                  |
| File reads / shard              | → 1                                         |
| Compile invocations per `check` | → 1                                         |

For the last two rows the benchmark writes a fixed 1, so only unit tests can catch a regression there. [`shard-cache.test.ts`](../../../packages/mdcp-core/test/shard-cache.test.ts) fails when a compile reads a shard file more than once, and [`compile-workspace.test.ts`](../../../packages/mdcp-cli/test/compile-workspace.test.ts) fails when one command compiles more than once.

A guide in the [monolith](../../glossary/monolith.md) is assembled once for its compiled guide and once for the monolith, because paths and section slugs differ between the two files. Shard reads stay at one per shard. The second assembly can push ms per shard past the 20% limit in the table above, and the double assembly is an accepted exception to that limit.

## Related

- [Usage model](./usage-model.md): query preference order and actor obligations
- [Link validation](../link-validation.md): built-in link lint specification
- [Benchmark: this repository's docs before and after single-pass compile](./research/benchmark-dogfood-2026-06-19.md): the most recent measured run
- [Vision and roadmap](./00-vision-and-roadmap.md): phased delivery
