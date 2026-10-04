# Compile hooks

Per-shard transforms run during `assembleGuide` **before** sections are stitched. Hooks receive each shard body after heading demotion and preamble stripping; assembly-time passes (cross-guide rewrite, publish-relative rewrite, anchor stripping, intra-guide rewrite) run around the hook pipeline.

Hooks assemble [authored GFM](../../glossary/authored-gfm.md). They don't do variable substitution or template logic. See [Preprocessor / templating (out of scope)](../../features/design-constraints/preprocessor-templating.md#preprocessor--templating-out-of-scope).

## Architecture

```text
assembleGuide (per guide)
  │
  ├─ for each manifest shard (in order)
  │    ├─ processSection (demote headings, strip about-this-guide)
  │    ├─ applyCompileHooks (named hooks from config, in order)
  │    ├─ rewriteCrossGuideFileLinks (automatic when link index present)
  │    └─ rewritePublishRelativeLinks (every guide, relative to its link base)
  │
  └─ stitch → stripAnchors (default) → intra-guide .md
```

**Guide link index**: built once per `compileGuideResults` from every guide in `compileOrder` (manifest sections plus transitively linked shards). Used by the automatic cross-guide pass. Optional `compile.crossGuideLinks.ignoreGuides` on the compiling guide skips the rewrite for links to listed guides. See [Cross-guide link rewriting](./cross-guide-links.md).

**Per-guide hook state**: mutable `hookState` on `CompileHookContext` (such as `inlineInserts` counters and first-anchor map) shared across shard invocations within one guide compile.

**Path resolution**: hooks and assembly passes resolve relative paths from `dirname(sourceFile)` first, then `guideDir` and then `compile.scopeRoot`. Every guide rebases remaining `../` file links per shard via absolute-path resolution, relative to the guide's [link base](./publish-relative-links.md#when-it-runs). Cross-guide and `codeEvidence` use the same resolve-then-rebase model for their link classes.

## Extension pattern

Register custom hooks in consumer or library code:

```typescript
import { registerCompileHook } from '@bwilliamson/mdcp-core';

registerCompileHook('myHook', (ctx) => {
  return ctx.body.replace(/TODO/g, 'DONE');
});
```

Custom hooks are **not** in the default pipeline — list them explicitly in `compile.hooks` when needed.

Hook implementations should be **pure on `ctx.body`** except when intentionally using shared `hookState`. Leave unmatched links unchanged. Prefer docs-first specs with tests mapped to spec sections (see each hook shard below).

## Configuration

Built-in hooks run **by default**. Omit `compile.hooks` for the common case. Optional per-hook config lives under `guides[].compile.hooksConfig`.

```json
{
  "name": "glossary",
  "compile": {
    "scopeRoot": ".",
    "outputFile": "glossary.md",
    "hooksConfig": {
      "inlineInserts": { "searchRoots": ["diagrams"] }
    }
  }
}
```

Optional assembly-time cross-guide exceptions: `compile.crossGuideLinks.ignoreGuides` on the compiling guide — see [Cross-guide link rewriting](./cross-guide-links.md).

### Opt out per hook

Disable specific defaults with an object on `compile.hooks` (`false` removes a hook):

```json
{
  "compile": {
    "hooks": { "inlineInserts": false }
  }
}
```

### Explicit override

Replace the entire default pipeline with a string array (backward compatible):

```json
{
  "compile": {
    "hooks": ["stripAnchors", "codeEvidence"]
  }
}
```

Default hook order and behavior: [Default compile hooks](../../features/default-compile-hooks.md). Config API: [API — Config](../api-config.md).

For manifest compile order and `compile.sectionsHeading`, see [Manifest compile order](../../features/manifest-compile-order.md).

## Built-in hooks

- **`stripAnchors`**: per shard (also default post-stitch). [stripAnchors](./strip-anchors.md): removes `{#id}` markers outside code, and every marker on a heading line.
- **`codeEvidence`**: per shard. [codeEvidence](./code-evidence.md): repo source links → `#L` fragments.
- **`inlineInserts`**: per shard. [inlineInserts](./inline-inserts.md): inline captioned insert libraries.
- **Cross-guide rewrite** _(assembly)_: per shard before stitch. [Cross-guide links](./cross-guide-links.md): automatic from `compileOrder`, with optional `crossGuideLinks.ignoreGuides`.
- **Publish-relative rewrite** _(assembly)_: per shard before stitch, for every guide. [Publish-relative links](./publish-relative-links.md): resolve shard links to absolute paths, emit paths relative to the guide's link base.

`stripAnchors` is also controlled by `compile.stripAnchors` (default `true`) after assembly.
