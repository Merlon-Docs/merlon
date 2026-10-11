# Context sizes: this repository's guides against one shard

Evidence shard: how many characters and estimated tokens an agent loads when it reads one of this repository's compiled guides or the monolith in full, and when it reads one shard. Its parent is [Vision and roadmap](../00-vision-and-roadmap.md). The durable position this record feeds is the context-size wording in [Benefit claims and evidence](../benefit-claims-and-evidence.md).

Measured on October 5, 2026, at commit `f5033db`. This record is not updated afterwards. A later run gets a new record. The CSV moved here unchanged from beside the benefit claims page.

## Caveats first

- The corpus is this repository's own `docs/` at that commit: 132 shards in the features, developer, client-cli, client-core, repo-readme and glossary directories, index pages excluded. Of those, 53 are under `docs/features/`. The project's maintainers and their agents wrote the docs and the script.
- Token counts come from the `o200k_base` encoding of the open-source gpt-tokenizer package. Other models split text differently, so a count is a rough, relative estimate and not a cost for a particular model. The ratios are the figures meant for comparison.
- Not measured: what an agent loaded in a session. The figures are file sizes. Whether an agent reads one shard or a whole guide depends on the agent and the skill, and no session was observed.
- The docs change with most commits, and the absolute sizes go stale with them. This record can't say how the ratio moves as the docs grow.
- The monolith `docs/_build/guides.md` holds the features guide and the glossary terms it links. The ratios compare the features median with that file, characters with characters and tokens with tokens. The median of all 132 shards is in the CSV, and no ratio uses it.
- In the CSV, the `notes` value of each `shard_*` row is a glob with commas and no quotes, so a strict CSV reader sees extra fields on those rows.

## Method

- At commit `f5033db`, `pnpm build && pnpm docs:compile:repo && pnpm bench:context-size` runs [`bench-context-size.mjs`](../../../../scripts/bench-context-size.mjs) with its default tokenizer. The script counts the characters and tokens of the five compiled outputs in the results and of every shard in the six directories above. It writes one CSV row per metric.
- The script ranks the character counts and the token counts separately. So a median or 90th percentile figure for characters can come from a different shard than the figure for tokens in the same row. Measured by counting each shard at that commit with the same encoding: in both median rows and the 90th percentile row, the character figure and the token figure come from different shards. Only the largest shard is one file in both columns.
- Measured: running the same commands at that commit with the script's no-write flag prints every figure in the CSV unchanged.
- At commit `f5033db`, the script wrote its CSV to a fixed path beside the benefit claims page. From the change that moved this CSV here, the script puts the day of the run in its CSV's file name. A run on a later day then writes a new CSV beside this one and leaves this file as measured. A second run on October 5, 2026 writes over this file.
- The data is [`context-size-dogfood-2026-10-05.csv`](./context-size-dogfood-2026-10-05.csv). Its columns are `metric`, `value`, `unit`, `notes` (the file or glob measured) and `recorded_at`. The `guide_*` rows are the compiled guides and the monolith, read in full. The `shard_*` rows are statistics over the shards, each computed separately for characters and for tokens. The `feature_shard_*` rows cover `docs/features/` only, and the two `*_pct_of_monolith` rows divide the features median by the monolith.

## Results

Measured, in characters and in `o200k_base` tokens:

| What was measured                       | File or set                           | Characters | Tokens (estimate) |
| --------------------------------------- | ------------------------------------- | ---------- | ----------------- |
| The monolith                            | `docs/_build/guides.md`               | 282,975    | 61,941            |
| The developer guide                     | `DEVELOPERS.md`                       | 140,938    | 29,939            |
| The core guide                          | `packages/merlon-docs-core/README.md` | 81,349     | 18,387            |
| The CLI guide                           | `packages/merlon-docs-cli/README.md`  | 59,408     | 13,459            |
| The repository README                   | `README.md`                           | 10,366     | 2,537             |
| The largest shard                       | one of 132                            | 20,490     | 4,505             |
| 90th percentile, each column separately | 132 shards                            | 8,832      | 1,868             |
| Median, each column separately          | 132 shards                            | 2,696      | 651               |
| Features median, each column separately | 53 shards                             | 4,319      | 864               |

The mean is 3,839 characters and 832 tokens per shard. The features median is 1.5% of the monolith by characters and 1.4% by estimated tokens.

## What this feeds

- The context-size wording in [Benefit claims and evidence](../benefit-claims-and-evidence.md): when agents read one shard instead of the monolith, per-turn context can be smaller. These figures support that conditional claim for this repository at this commit, and for no other corpus.
- The context-size table on the documentation site, which reads this record's CSV.

## Related

- [Benefit claims and evidence](../benefit-claims-and-evidence.md): how a record's figures may be used in public copy
- [Usage model](../usage-model.md): reading one shard at a time
