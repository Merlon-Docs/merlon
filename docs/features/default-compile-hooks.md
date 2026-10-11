# Default compile hooks

Built-in compile hooks run on every guide compile **without** listing hook names in config. Authors express intent in shard markdown (evidence links, insert libraries); hook enablement is not a second manifest.

## Default pipeline rationale

Most guides want the same built-in hooks. A default pipeline keeps the hook array out of each guide's config, and a new built-in hook reaches every guide that omits `compile.hooks` without a config edit.

## Default hook pipeline

When `guides[].compile.hooks` is omitted, mdcp runs these hooks **in order** on each shard, after heading demotion and the preamble shard handling that [Project layout](../client-cli/project-layout.md#one-subdirectory--one-guide) describes:

| Hook            | Purpose                                              |
| --------------- | ---------------------------------------------------- |
| `stripAnchors`  | Remove `{#id}` anchor markers per shard              |
| `codeEvidence`  | Rewrite repo source links to `#L` line fragments     |
| `inlineInserts` | Inline captioned insert-library shards on first link |

[stripAnchors](../client-core/compile-hooks/strip-anchors.md) lists which `{#id}` examples in code the hook keeps, and why a heading line keeps none. Its [purpose](../client-core/compile-hooks/strip-anchors.md#stripanchors-purpose) says when the strip runs again on the stitched guide.

Hooks are no-ops when shard content does not match (no evidence links, no insert links, etc.).

**Cross-guide link rewriting** is not a compile hook. It runs automatically at assembly time from `compileOrder` and per-guide `compile.outputFile`. See [Cross-guide link rewriting](./compile-pipeline/cross-guide-links.md), whose [`ignoreGuides` section](./compile-pipeline/cross-guide-links.md#compilecrossguidelinksignoreguides) covers the per-guide exceptions.

Table re-alignment also runs outside the hooks, as the last step of each assembly, after broken-link marking. See [Tables after link rewriting](./compile-pipeline/tables-after-link-rewriting.md).

Custom hooks registered via `registerCompileHook` are **not** included in defaults — only built-in names above.

## Configuration

### Minimal (common case)

Omit `compile.hooks`. Optional per-hook config lives under `hooksConfig` (`inlineInserts.searchRoots`):

```json
{
  "name": "glossary",
  "compile": {
    "outputFile": "glossary.md"
  }
}
```

### Opt out per hook

Set `compile.hooks` to an object. Keys with `false` disable that hook; other keys are ignored:

```json
{
  "compile": {
    "hooks": { "inlineInserts": false, "codeEvidence": false }
  }
}
```

### Explicit override

Set `compile.hooks` to a string array to replace the default pipeline entirely:

```json
{
  "compile": {
    "hooks": ["stripAnchors"]
  }
}
```

## Acceptance criteria

- The default hook pipeline runs when `compile.hooks` is omitted.
- The object form of `compile.hooks` turns off single hooks.
- An explicit `compile.hooks` string array replaces the default pipeline.
- Tests cover the default pipeline and turning off single hooks.

## Implementation

`resolveCompileHooks` in `packages/mdcp-core/src/config/resolve-compile-hooks.ts` merges guide config into an effective hook name list before `assembleGuide` calls `applyCompileHooks`. Constant `DEFAULT_COMPILE_HOOKS` documents the default order.

Hook specs are in the [Compile hooks overview](../client-core/compile-hooks/index.md).
