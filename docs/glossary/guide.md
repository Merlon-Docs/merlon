# guide

A **guide** is a directory of [shards](./shard.md) plus its [manifest](./manifest.md). Compile turns it into one [compiled guide](./compiled-guide.md). Each name in `compileOrder` is a guide, read from the directory of that name under the docs root unless `guides[].path` points somewhere else. Its output can also include shards that the manifest links from other directories, or that compile reaches under `compile.scopeRoot`.

A guide without `compile.outputFile` can also be stitched into the [monolith](./monolith.md). A [standalone guide](./standalone-guide.md) is one registered file with no output of its own.

See [Project layout](../client-cli/project-layout.md).
