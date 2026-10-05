# Consumer migration

Use these steps to move an existing Markdown document into shards. For a new repo with no docs to migrate, the [Quick start](./install-and-quick-start.md#quick-start) covers setup.

Add `source` to your config pointing at your existing source document, then:

```bash
mdcp shard
mdcp compile
mdcp check
```

## Guide manifests and compile order

There is no separate manifest sync step, so rerun `mdcp compile` and `mdcp check` after a manifest change. [Manifest compile order](../features/manifest-compile-order.md) says how link order in the manifest sets compile order and when to set `compile.sectionsHeading`.
