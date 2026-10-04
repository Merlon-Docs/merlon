# Consumer migration

Add `source` to your config pointing at your existing source document, then:

```bash
mdcp shard
mdcp compile
mdcp check
```

## Guide manifests and compile order

Compile order comes from link order in each guide's `index.md` or `shards.md`. List shards in the manifest in the order you want them stitched.

When a manifest has preamble prose with example inline links (not section shards), set `compile.sectionsHeading` — see [Manifest compile order](../features/manifest-compile-order.md).

After changing a guide's `index.md`, run `mdcp compile` and `mdcp check` — there is no separate manifest sync step.

## Compile hooks and multi-guide links

Built-in hooks run by default — omit `compile.hooks` for the common case. Specs and multi-guide / `ignoreGuides` examples live in **core** docs (not duplicated here):

- [Default compile hooks](../features/default-compile-hooks.md)
- [Compile hooks](../client-core/compile-hooks/index.md)
- [Cross-guide links](../client-core/compile-hooks/cross-guide-links.md)

CLI config path rules remain in [Config essentials](./config-essentials.md).

## Steps for a new consumer repo

1. Add `mdcp.config.json` to your docs shard directory
2. Add repo-root npm scripts, for example `mdcp compile --config docs/mdcp.config.json --docs-root docs` (see [Config essentials](./config-essentials.md#--config-vs---docs-root))
3. Add `mdcp check --require-lint` (and `--require-vale` when Vale is configured)
4. Discover shards with host search; validate cross-link slugs with `mdcp check` (optional `mdcp refs-list`; prefer GitHub auto-slugs over explicit heading ids)
5. Update CI to build and invoke `@bwilliamson/mdcp-cli`

Upgrade notes from earlier MDCP releases are in package **CHANGELOGs** (and GitHub Releases), not in the feature catalog.

## Verification checklist

After setting up a consumer repo:

1. **`mdcp compile`**: per-guide outputs under `_build/` (or explicit `compile.outputFile` targets); optional monolith when `outputFile` is set
2. **`mdcp check --require-lint`**: orphans, refs, links, and markdownlint on in-scope guide shards
3. **`mdcp check --require-vale`**: when Vale is configured
4. **Hook output**: diagram tables inlined (`inlineInserts`), code evidence blocks resolved (`codeEvidence`), cross-guide links rewritten to `#slug` targets in compiled output (or left as shard `.md` paths for guides in `compile.crossGuideLinks.ignoreGuides`)
