# Path lookup order

A pass that follows a link to a file first drops any leading `./` and the `#fragment`. It then tries the directories below in order and uses the first one where the path exists. A path found in none of them stays as written. `codeEvidence` can still change the `#fragment` of such a link, as [codeEvidence path resolution](../../client-core/compile-hooks/code-evidence.md#codeevidence-path-resolution) says.

| Pass                      | Lookup order                                                                                                                                 |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `codeEvidence`            | Shard directory, working directory, parent of the working directory, `compile.scopeRoot`                                                     |
| `inlineInserts`           | Shard directory, working directory, parent of the working directory, `compile.scopeRoot`, each `hooksConfig.inlineInserts.searchRoots` entry |
| Cross-guide rewrite       | Shard directory, working directory, parent of the working directory, `compile.scopeRoot`, guide directory                                    |
| Intra-guide, per shard    | Shard directory, guide directory, then the first stitched shard with that file name                                                          |
| Intra-guide, after stitch | Guide directory, then the first stitched shard with that file name                                                                           |
| Publish-relative rewrite  | Shard directory, `compile.scopeRoot`, guide directory                                                                                        |

The shard directory contains the shard being compiled, and the guide directory contains the guide's manifest. `compile.scopeRoot` is resolved from the docs root and skipped when unset. The working directory is `process.cwd()`, where the command runs, and `searchRoots` entries are resolved from it, so the same shard can resolve differently from the repository root and from `docs/`. The intra-guide pass looks paths up among the shards the guide stitches rather than on disk. Its per-shard run skips paths that start with `../`, and the file-name match applies only to a link that is a file name alone, such as `name.md` or `./name.md`.

The publish-relative rewrite also finds a path to an output of the run before compile writes the output. A first compile then rebases a link to an output as later compiles do. The outputs of the run are the ones that [link validation](../link-validation.md#validation-phases) checks in memory: each guide's compiled guide, and the monolith when a guide is stitched into it. When every guide sets `compile.outputFile`, the run never writes the configured monolith. The rewrite then treats a path to the monolith as missing, even when an earlier run left the file on disk, as link validation does.

After lookup, `codeEvidence` and the publish-relative rewrite emit the path relative to the guide's [link base](./publish-relative-links.md#when-it-runs), and `inlineInserts` inlines the file. The cross-guide and intra-guide rewrites emit a heading target: `#slug`, after the other output's path when the target is in another file.

## Guide directory apart from its shards

Some guides set `path` to a compiled subdirectory while the shards are elsewhere in the same tree, often one level up from the guide directory:

```text
guide/
  compiled/shards.md   ← manifest (guide directory)
  section-a.md
  topic/section-b.md
  assets/diagram.md
```

The config uses `"path": "guide/compiled"` with `"compile": { "manifest": "shards.md", … }`. The manifest lists each shard with a path that starts with `../`, because a bare path can't step up out of a directory. A bare link between the shards, such as `[Section B](topic/section-b.md)` in section A, still resolves, because the per-shard intra-guide pass tries the shard directory before the guide directory.
