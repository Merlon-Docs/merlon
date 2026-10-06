# orphan

An **orphan** is a top-level shard in a [guide](./guide.md) directory that the guide's [manifest](./manifest.md) does not link. [Manifest compile order](../features/manifest-compile-order.md) explains which manifest links count, including the `compile.sectionsHeading` rule and the [file-name fallback](../features/manifest-compile-order.md#linked-shards-and-the-file-name-fallback).

Unlinked shards in a guide subdirectory or under a `compile.scopeRoot` are out of scope for this check. See [Relationship to the orphan check](../features/coverage-scan.md#relationship-to-the-orphan-check).
