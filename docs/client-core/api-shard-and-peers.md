# Shard and peers API

## Shard (split)

| Export                           | Purpose                                        |
| -------------------------------- | ---------------------------------------------- |
| `shardFromMonolith`, `runMdTree` | Split a source document into guide directories |

`shardFromMonolith` reads a source document such as a legacy README, not the compiled monolith. It splits the source at its H1 headings. Each `mappings` entry either picks H1 sections for one guide (`h1Index` or `mergeH1Indices`) and splits them as [Map the document to guides](../client-cli/consumer-migration.md#map-the-document-to-guides) describes, or copies an existing directory (`directoryPath`). `merlon shard` builds the mappings from each guide's `source` config.

## Peer tools

| Export                      | Purpose                                                           |
| --------------------------- | ----------------------------------------------------------------- |
| `findPeerBinary`, `runPeer` | Locate and run host-repo linters (`markdownlint-cli2`, `vale`, …) |

`findPeerBinary(name, cwd)` returns `source: 'local'` for a `node_modules/.bin` binary found from `cwd` upward, `'path'` for one on PATH, and `found: false` otherwise. `runPeer` then skips the tool with an info line unless `require` is set, which makes a missing tool an error. [Peer linters](../features/design-constraints/peer-linters.md) is the policy.
