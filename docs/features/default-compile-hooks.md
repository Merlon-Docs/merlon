# Default compile hooks

Built-in compile hooks run on every guide compile **without** listing hook names in config. Authors express intent in shard markdown (evidence links, insert libraries); hook enablement is not a second manifest.

## Problem

Consumer configs repeat the same hook array on every guide:

```json
"hooks": ["stripAnchors", "codeEvidence", "inlineInserts"]
```

New hooks require doc churn and config edits across all guides. Most guides want the same defaults.

## Default hook pipeline

When `guides[].compile.hooks` is omitted, mdcp runs these hooks **in order** on each shard (after heading demotion and preamble stripping):

| Hook            | Purpose                                                                                                 |
| --------------- | ------------------------------------------------------------------------------------------------------- |
| `stripAnchors`  | Remove `{#id}` anchor markers per shard; post-stitch strip uses `compile.stripAnchors` (default `true`) |
| `codeEvidence`  | Rewrite repo source links to `#L` line fragments                                                        |
| `inlineInserts` | Inline captioned insert-library shards on first link                                                    |

[stripAnchors](../client-core/compile-hooks/strip-anchors.md) lists which `{#id}` examples in code the hook keeps, and why a heading line keeps none.

Hooks are no-ops when shard content does not match (no evidence links, no insert links, etc.).

**Cross-guide link rewriting** is not a compile hook — it runs automatically at assembly time from `compileOrder` and per-guide `compile.outputFile`. Optional per-guide exceptions: `compile.crossGuideLinks.ignoreGuides`. See [Cross-guide link rewriting](../client-core/compile-hooks/cross-guide-links.md).

Table re-alignment also runs outside the hooks, as the last step of each assembly, after broken-link marking. See [Tables after link rewriting](../client-core/compile-hooks/index.md#tables-after-link-rewriting).

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

### Cross-guide exceptions (optional)

Cross-guide link rewrite runs at assembly by default. To keep shard `.md` paths for specific target guides, set `compile.crossGuideLinks.ignoreGuides` on the compiling guide — see [Cross-guide link rewriting](../client-core/compile-hooks/cross-guide-links.md):

```json
{
  "name": "glossary",
  "compile": {
    "outputFile": "glossary.md",
    "crossGuideLinks": {
      "ignoreGuides": ["technical-guide"]
    }
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

### Explicit override (backward compatible)

Set `compile.hooks` to a string array to replace the default pipeline entirely (existing behavior):

```json
{
  "compile": {
    "hooks": ["stripAnchors"]
  }
}
```

## Acceptance criteria

- [x] Default hook pipeline runs without `compile.hooks` when not specified
- [x] Documented opt-out mechanism (object form on `compile.hooks`)
- [x] Existing explicit `compile.hooks` string arrays continue to work
- [x] Tests for default-on behavior and selective disable
- [x] Client docs show minimal config first, opt-out second

## Implementation

`resolveCompileHooks` in `packages/mdcp-core/src/config/resolve-compile-hooks.ts` merges guide config into an effective hook name list before `assembleGuide` calls `applyCompileHooks`. Constant `DEFAULT_COMPILE_HOOKS` documents the default order.

Hook specs: [Compile hooks — overview](../client-core/compile-hooks/index.md).
