# md-tree integration

Merlon Docs uses `@kayvan/markdown-tree-parser` for **split only** (`extract-all`, `explode`).

Upstream `assemble` is **not used**, because it does not support:

- Per-section heading demotion (shard `#` → compiled `##`)
- The preamble shard handling that [Project layout](../../client-cli/project-layout.md#one-subdirectory--one-guide) describes

## When to fork

Vendor a fork into `packages/markdown-tree` when:

1. Merlon Docs moves compile onto md-tree's `assemble`, which then needs heading-transform hooks
2. `explode` must preserve the preamble without synthetic H2 promotion
3. Upstream is unresponsive or breaking

Part of [Design constraints](./index.md).
