# Benchmark: this repository's docs before and after single-pass compile

Evidence shard: how long `mdcp compile` and `mdcp check` took on this repository's own docs before and after the toolchain stopped compiling more than once per command. Its parent is [Vision and roadmap](../00-vision-and-roadmap.md). The durable position this record feeds is [Performance goals](../performance.md).

Measured on June 18 and 19, 2026. This record is not updated afterwards. A later run gets a new record. The figures moved here unchanged from the performance page in October 2026.

## Caveats first

- The corpus is this repository's `docs/` at the time, with about 64 shards in four compiled guides. The performance page reported about 296 source links and 357 compiled links for it. A recount at the commit that produced the CSV finds 65 shards besides the index pages, which agrees with about 64. The link counts weren't re-counted.
- The SLOs are defined at 200 and 500 shards. A row marked `met` says only that the 64-shard corpus was fast enough. No row was measured at the shard count its target names.
- The "before" column was measured on June 18, 2026, and recorded in the project's issue tracker. It wasn't re-measured, and the bench script can't reproduce it, because the code it timed has been replaced.
- The "after" CLI timings are medians of three runs and the in-process timings are single samples, all on one machine that the CSV doesn't identify.
- The synthetic scaling figures came from a fixture harness that was never committed. They can't be re-run and are carried as reported.
- When this record was written up, the same docs had more than twice as many shards. Nothing here was re-run at that size.
- The CSV here is the run's output as first committed. The copy next to the performance page later lost its `refs lookup` row when that command was removed. The row is restored here because it was measured.

## Method

- `pnpm build && pnpm bench:dogfood` runs [`bench-dogfood-performance.mjs`](../../../../scripts/bench-dogfood-performance.mjs), which times the CLI and two in-process phases on `docs/` and writes one CSV row per operation. A re-run writes a new dated CSV beside this one and leaves this file as measured.
- The script divided the link lint time by a fixed count of 357 compiled links to get the time per link.
- The data is [`benchmark-dogfood-2026-06-19.csv`](./benchmark-dogfood-2026-06-19.csv). Its columns:

| Column               | Meaning                                                                              |
| -------------------- | ------------------------------------------------------------------------------------ |
| `operation`          | Command or phase measured                                                            |
| `tier`               | SLO tier (1 to 4) when applicable; blank for component timings                       |
| `slo_target`         | Target text from the SLO tables at the time                                          |
| `slo_shards`         | Shard count the SLO is defined at (200 or 500)                                       |
| `pre_p0_value`       | Baseline before the changes below, from the issue tracker; not re-measured           |
| `post_p0_value`      | Measurement from the bench script (median of 3 CLI runs or single in-process sample) |
| `value_unit`         | `ms`, `ms/link`, or `count`                                                          |
| `improvement_factor` | `pre_p0_value / post_p0_value` when units match and post > 0                         |
| `status`             | `met`, `miss`, or `open (P2)` for a target whose work was deferred                   |
| `pre_p0_source`      | Where the baseline came from                                                         |
| `post_p0_source`     | Bench script and run date, or the unit test that verifies a count                    |
| `notes`              | Measurement method (CLI wall clock vs in-process, peer linters included or not)      |
| `recorded_at`        | Date of the run                                                                      |

## Results

| Operation                      | Tier | Before  | After   | Factor | Status    |
| ------------------------------ | ---- | ------- | ------- | ------ | --------- |
| `mdcp compile` (full repo)     | 1    | 4900 ms | 133 ms  | 36.8   | met       |
| `mdcp check` (core, no peers)  | 2    | 4000 ms | 187 ms  | 21.4   | met       |
| `mdcp check` (with peers)      | 3    | 6600 ms | 1223 ms | 5.4    | met       |
| `compileGuideResults` (core)   |      | 700 ms  | 60 ms   | 11.7   |           |
| Built-in link lint             |      | 3000 ms | 18 ms   | 166.7  |           |
| Link lint per link             | 4    | 8 ms    | 0.05 ms | 160    | met       |
| Compile invocations per check  | 4    | 3       | 1       | 3      | met       |
| File reads per shard (compile) | 4    | 5       | 1       | 5      | met       |
| `mdcp refs lookup`             | 1    | 700 ms  | 128 ms  | 5.5    | open (P2) |

Unit tests count the compile invocations and the file reads, so those rows weren't timed. `compile-workspace.test.ts` in the CLI package counts compiles, and `shard-cache.test.ts` in the core package counts file reads.

The `refs lookup` target was 200 ms at 500 shards. [ADR 0002](../../adr/0002-remove-refs-lookup.md) records the later removal of that command. Its row stays because it was measured.

## What changed between the columns

Before the change, the toolchain compiled three times per `check` or `compile` and re-read target files for every cross-file `#fragment` link. The changes measured here:

- Compile once per command, and pass the results through write, refs, and link lint.
- Cache slug registries per output file during link validation, and compute each shard's slug set once.
- Split lines once in `buildSlugRegistry`.
- Read each shard once per compile through a compile-scoped shard cache (`ShardCache`) that keeps its body, slugs, links and provenance. Reuse the guide link index and section slug maps across guides and in link lint.

The first three changes were expected to give a two- to three-fold win, and the shard cache about a two-fold compile win. The results table has the measured factors. Peer linters weren't changed. Their cost is separate from core mdcp and grows with file count and rules.

Function names are as they were at the time.

## Scaling projections

Measured on June 18, 2026, before the changes above, on synthetic fixtures: one guide plus glossary, with simple intra-guide links. Not in the CSV.

| Shards | Links/shard | Core total (compile + lint) |
| ------ | ----------- | --------------------------- |
| 64     | 5           | ~74 ms                      |
| 100    | 5           | ~160 ms                     |
| 200    | 5           | ~543 ms                     |
| 500    | 5           | ~3.1 s                      |
| 200    | 20          | ~4.2 s                      |

Scaling was superlinear beyond about 200 shards, where repeated file reads and link-graph walks dominated.

Real multi-guide repos with publish outputs (`compile.outputFile`), cross-guide rewriting, and compile hooks were estimated at roughly ten times slower per shard than the synthetic fixtures. Extrapolated with that factor, before the changes:

| Scale      | Core compile + lint | Full `check` (with peers) |
| ---------- | ------------------- | ------------------------- |
| 200 shards | ~5 to 15 s          | ~15 to 30 s               |
| 500 shards | ~15 to 45 s         | ~45 to 90 s               |

## What this feeds

- The targets in [Performance goals](../performance.md). At 64 shards every SLO row was met except `refs lookup`, which was left open. No tier was measured at its stated 200- or 500-shard scale.
- The remaining optimization work was deferred until the docs grow to 200 shards or agent-loop latency becomes a blocker. Fixtures at 200 and 500 shards, a CI regression gate, and a phase profiler are part of it. The issue tracker tracks that work, and this shard stays a record of what was observed.

## Related

- [Performance goals](../performance.md): the targets this run is measured against
- [Link validation](../../link-validation.md): the check whose cost dominated before the change
