# refs registry

Derived catalog of [heading slugs](./heading-slug.md) from compile output, typically written as `refs.json` under `outputDir`. It holds the [monolith](./monolith.md)'s headings when the config sets top-level `outputFile`, and otherwise the headings of every [compiled guide](./compiled-guide.md). Parent concept: [refs](./refs.md).

The registry is **generated state**, not authored shards. `mdcp compile` (and `mdcp refs gen`) rebuild it; `mdcp check` / `mdcp refs check` verify it still matches the latest compile. Path rules: [Refs registry path](../features/refs-registry-path.md).
