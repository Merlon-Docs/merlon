# refs registry

Derived catalog of [heading slugs](./heading-slug.md) from compile output, typically written as `refs.json` under `outputDir`. It lists the headings of each file compile writes, slugged file by file. Those files are every [compiled guide](./compiled-guide.md) and the [monolith](./monolith.md), and a compiled guide can be a [publish output](./publish-output.md). Parent concept: [refs](./refs.md).

The registry is **generated state**, not authored shards. `mdcp compile`, `mdcp refs-gen` and `mdcp check` rewrite it from their own compile. `mdcp refs-check` compiles without writing and fails when the file on disk no longer matches, as [Stale registry check](../features/refs-registry-path.md#stale-registry-check) says. [Refs registry path](../features/refs-registry-path.md) gives the path rules, and [registry contents](../client-cli/compile-refs-registry.md#registry-contents) lists its fields.
