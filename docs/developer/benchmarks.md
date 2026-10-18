# Benchmarks

`pnpm bench:dogfood` times compile and check on this repository's own docs against the [Performance goals](../features/system/performance.md). `pnpm bench:context-size` measures how much context a whole compiled guide and one shard of those docs take. CI doesn't run either script. The growth benchmarks that CI runs on pull requests are separate: [Growth benchmarks](./packages-and-tests.md#growth-benchmarks) describes them.

## Before you run

`pnpm bench:dogfood` loads the built CLI and core and compiles the docs itself, so it needs `pnpm build`. `pnpm bench:context-size` reads the compiled outputs, which `pnpm docs:compile:repo` writes after a build:

```bash
pnpm build && pnpm docs:compile:repo
```

`pnpm bench:dogfood` also runs `merlon check` with the peer linters required. It needs Vale on `PATH` and the styles that `pnpm vale:sync` installs, as [Local setup](./local-setup.md#first-time-bootstrap) describes, and `pnpm install` provides markdownlint-cli2.

## Performance benchmark

`pnpm bench:dogfood` runs [`bench-dogfood-performance.mjs`](../../scripts/bench-dogfood-performance.mjs). It times `merlon compile` and `merlon check` on `docs/` as the median of three CLI runs, and one in-process compile and link lint. It writes `docs/features/system/research/benchmark-dogfood-<date>.csv`, one row per operation. [Tier 4](../features/system/performance.md#tier-4-regression-metrics) of the performance goals says what its ms/link row measures, and how to work out ms/shard by hand from the compile time.

## Context-size benchmark

`pnpm bench:context-size` runs [`bench-context-size.mjs`](../../scripts/bench-context-size.mjs). It counts the characters and tokens of five compiled outputs and of the shards in the six directories it lists, and it writes `docs/features/system/research/context-size-dogfood-<date>.csv`. `--out <path>` writes the CSV elsewhere, and `--no-write` prints the table without writing a file. The [context-size record](../features/system/research/context-size-dogfood-2026-10-05.md) explains the rows.

Token counts come from the open-source [gpt-tokenizer](https://github.com/niieani/gpt-tokenizer), with the `o200k_base` encoding by default. [Benefit claims and evidence](../features/system/benefit-claims-and-evidence.md#context-size) says how to read a token count. Switch the tokenizer to match your own stack. With `--no-write`, the examples below print the table and leave the day's CSV alone:

```bash
pnpm bench:context-size --tokenizer cl100k_base --no-write         # another gpt-tokenizer encoding
pnpm bench:context-size --tokenizer chars4 --no-write              # characters ÷ 4, no tokenizer
pnpm bench:context-size --tokenizer-module ./count.mjs --no-write  # your counter: export countTokens(text)
```

The other encodings are `o200k_harmony`, `p50k_base`, `p50k_edit`, `r50k_base` and `gpt2`. A counter module maps text to a number through its `countTokens` export or its default export. The script resolves a counter module's path and the `--out` path against the directory it runs in, which under pnpm is the repository root. `MERLON_TOKENIZER` and `MERLON_TOKENIZER_MODULE` set the same choices from the environment. `--tokenizer` overrides `MERLON_TOKENIZER`, and `--tokenizer-module` overrides `MERLON_TOKENIZER_MODULE`. A counter module from either source wins over an encoding, so unset `MERLON_TOKENIZER_MODULE` before you compare encodings with `--tokenizer`.

## Keeping a run

Each script puts the UTC date of the run in its CSV's file name, and a second run on the same UTC day overwrites that day's file. Commit a CSV you keep before you run again, and delete the CSV of a run you don't keep.

A run you keep gets a research record beside its CSV, and earlier CSVs and records stay as measured. The new record goes into the records list in [About research records](../features/system/research/about-research-records.md#records), and the page it feeds links to it. For a context-size record that page is [Benefit claims and evidence](../features/system/benefit-claims-and-evidence.md#context-size), and its record link moves to the new record, as does the link on this page. The documentation site's context-size table reads one record's CSV, so a new context-size record also changes three things in `packages/merlon-docs-site/src/components/ContextSizes.astro`: the CSV import, `RECORD_PATH` and `RECORD_TITLE`.
