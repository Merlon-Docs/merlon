# Compile hooks

Per-shard transforms run during `assembleGuide` **before** sections are stitched. Hooks receive each shard body after heading demotion and preamble stripping. The diagram below shows the steps around the hooks.

Hooks assemble [authored GFM](../../glossary/authored-gfm.md). They don't do variable substitution or template logic. See [Preprocessor / templating (out of scope)](../../features/design-constraints/preprocessor-templating.md#preprocessor--templating-out-of-scope).

## Architecture

```text
assembleGuide (per guide, once for each document it is written to)
  │
  ├─ for each shard (manifest order, then linked shards)
  │    ├─ processSection (demote headings, strip about-this-guide)
  │    ├─ applyCompileHooks (named hooks from config, in order)
  │    ├─ mark the paths codeEvidence rebased
  │    ├─ cross-guide pass (automatic when link index present, marks what it writes)
  │    ├─ rewriteIntraGuideFileLinks (same-guide links, from the shard directory)
  │    └─ rewritePublishRelativeLinks (every guide, relative to its link base, marks what it writes)
  │
  ├─ stitch → stripAnchors (default) → intra-guide .md → unmark
  │
  └─ markBrokenLinks → realignTables (the last step)
```

**Guide link index**: built once per `compileGuideResults` from every guide in `compileOrder` (manifest sections plus [linked shards](../../features/manifest-compile-order.md#linked-shards-and-the-file-name-fallback)). Used by the automatic cross-guide pass. Optional `compile.crossGuideLinks.ignoreGuides` on the compiling guide keeps shard paths in its links to listed guides, except in the cases that [its config section](../../features/compile-pipeline/cross-guide-links.md#compilecrossguidelinksignoreguides) points to.

**Per-assembly hook state**: mutable `hookState` on `CompileHookContext` (such as `inlineInserts` counters and first-anchor map) shared across shard invocations within one assembly. A guide in the [monolith](../../glossary/monolith.md) is assembled twice, once for its compiled guide and once for the monolith. So every hook it runs, a registered custom hook included, sees each shard twice, with fresh `hookState` each time. A hook with side effects beyond its return value repeats them.

The Features Guide's [Compile pipeline](../../features/compile-pipeline/index.md) specifies the assembly steps that aren't hooks, and the rules they share with the hooks. Its [Path lookup order](../../features/compile-pipeline/path-lookup-order.md) gives the directories each hook and pass tries when it follows a link to a file.

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
      "inlineInserts": { "searchRoots": ["shared"] }
    }
  }
}
```

Optional assembly-time cross-guide exceptions: `compile.crossGuideLinks.ignoreGuides` on the compiling guide — see [Cross-guide link rewriting](../../features/compile-pipeline/cross-guide-links.md).

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

Assembly also runs the [link passes](../../features/compile-pipeline/link-passes.md), which aren't hooks. Its last step, after broken-link marking, is [table re-alignment](../../features/compile-pipeline/tables-after-link-rewriting.md), which prints an aligned table again once its links change width.

`stripAnchors` is also controlled by `compile.stripAnchors` (default `true`) after assembly.
