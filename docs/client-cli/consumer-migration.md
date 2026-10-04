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

## Compile hooks and multi-guide links

Built-in hooks run by default — omit `compile.hooks` for the common case. Specs and multi-guide / `ignoreGuides` examples live in **core** docs (not duplicated here):

- [Default compile hooks](../features/default-compile-hooks.md)
- [Compile hooks](../client-core/compile-hooks/index.md)
- [Cross-guide links](../client-core/compile-hooks/cross-guide-links.md)

CLI config path rules remain in [Config essentials](./config-essentials.md).

## Verification checklist

After setting up a consumer repo:

1. **`mdcp compile`**: per-guide outputs under `_build/` (or explicit `compile.outputFile` targets); optional monolith when `outputFile` is set
2. **`mdcp check --require-lint`**: orphans, refs, links, and markdownlint on in-scope guide shards
3. **`mdcp check --require-vale`**: when Vale is configured
4. **Hook output**: diagram tables inlined (`inlineInserts`), code evidence blocks resolved (`codeEvidence`), cross-guide links rewritten to `#slug` targets in compiled output (or left as shard `.md` paths for guides in `compile.crossGuideLinks.ignoreGuides`)
