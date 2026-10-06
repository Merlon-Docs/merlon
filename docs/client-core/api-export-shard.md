# API — Shard and peers

## Shard (split)

| Export                           | Purpose                                        |
| -------------------------------- | ---------------------------------------------- |
| `shardFromMonolith`, `runMdTree` | Split a source document into guide directories |

`shardFromMonolith` reads a source document such as a legacy README, not the compiled [monolith](../glossary/monolith.md). It splits the source at its H1 headings. Each `mappings` entry either picks H1 sections for one guide (`h1Index` or `mergeH1Indices`) and splits them at `splitLevel`, or copies an existing directory (`directoryPath`). `mdcp shard` builds the mappings from each guide's `source` config.

## Peer tools

| Export                      | Purpose                                                           |
| --------------------------- | ----------------------------------------------------------------- |
| `findPeerBinary`, `runPeer` | Locate and run host-repo linters (`markdownlint-cli2`, `vale`, …) |

Peer linters are not bundled. Detection order: `node_modules/.bin` → PATH → skip with info.
