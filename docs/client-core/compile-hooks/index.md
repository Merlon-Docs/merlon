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

**Guide link index**: `compileGuideResults` builds it once from every guide in `compileOrder`, and the cross-guide pass reads it. [Guide link index](../../features/compile-pipeline/cross-guide-links.md#guide-link-index) says which shards have an entry.

**Per-assembly hook state**: mutable `hookState` on `CompileHookContext` (such as `inlineInserts` counters and first-anchor map) shared across shard invocations within one assembly. Each assembly starts with fresh `hookState`, and a guide in the monolith has one assembly for each document, as [When it runs](../../features/compile-pipeline/publish-relative-links.md#when-it-runs) says. So every hook it runs, a registered custom hook included, sees each of its shards twice, and a hook with side effects beyond its return value repeats them.

The Features Guide's [Compile pipeline](../../features/compile-pipeline/index.md) specifies the assembly steps that aren't hooks, and the rules they share with the hooks. Its [Path lookup order](../../features/compile-pipeline/path-lookup-order.md) gives the directories each hook and pass tries when it follows a link to a file.

## Extension pattern

A custom hook runs only in a process that registers it with `registerCompileHook` before it calls `compileGuideResults` or `compileGuides`. Importing the core registers the built-in hooks and `identity`, which returns the body unchanged. The mdcp CLI doesn't load a custom hook, so `merlon compile` and `merlon check` compile without one. Register yours in your own build script:

```typescript
import { registerCompileHook } from '@merlon-docs/merlon-docs-core';

registerCompileHook('myHook', (ctx) => {
  return ctx.body.replace(/TODO/g, 'DONE');
});
```

Then list it in the array form of `compile.hooks` next to the built-in hooks the guide keeps, such as `["stripAnchors", "codeEvidence", "inlineInserts", "myHook"]`. [Explicit override](../../features/default-compile-hooks.md#explicit-override) says the array replaces the default pipeline, so it has to list them.

Compile skips any name in `compile.hooks` that has no registered hook, and it doesn't warn. A misspelled name, such as `codeEvidense`, compiles as if the list left it out, and no check reports it. Registering a hook under a name already in use replaces that hook, a built-in one included.

A hook gets a `CompileHookContext` and returns the new body. Assembly always sets `hookState`, and passes `{}` as `config` when the caller doesn't give one. `compileGuideResults` sets every other field, and `scopeRoot` only when the guide sets `compile.scopeRoot`. A direct `assembleGuide` call sets `outputFile`, `outputBasename`, `scopeRoot` and `linkIndex` only when its options give them.

| Field            | Value                                                                                                                          |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `body`           | The shard body, after heading demotion, preamble stripping and the hooks listed before this one                                |
| `guideName`      | The configured name of the guide being compiled                                                                                |
| `filename`       | The shard's file name                                                                                                          |
| `sourceFile`     | The shard's absolute path                                                                                                      |
| `config`         | The config the caller passed as `CompileOptions.config` (an `MerlonConfigInput`), or `{}`                                      |
| `outputFile`     | Optional. The absolute path of the guide's [link base](../../features/compile-pipeline/publish-relative-links.md#when-it-runs) |
| `outputBasename` | Optional. The file name of `outputFile`                                                                                        |
| `scopeRoot`      | Optional. The absolute `compile.scopeRoot`, unset when the guide doesn't set it                                                |
| `hookState`      | State that the hook calls of one assembly share, from one shard to the next. Always set, though the type marks it optional     |
| `linkIndex`      | Optional. The [guide link index](../../features/compile-pipeline/cross-guide-links.md#guide-link-index)                        |

Hook implementations should be **pure on `ctx.body`** except when intentionally using shared `hookState`. Leave unmatched links unchanged.

## Configuration

Built-in hooks run by default, so omit `compile.hooks` for the common case. [Default compile hooks](../../features/default-compile-hooks.md#configuration) gives the forms `compile.hooks` takes to turn a hook off or replace the list. Per-hook settings go under `guides[].compile.hooksConfig`, as [inlineInserts config](./inline-inserts.md#inlineinserts-config) shows, and the [config API](../api-config.md#compilehooks) covers `resolveCompileHooks`. [stripAnchors purpose](./strip-anchors.md#stripanchors-purpose) says what `compile.stripAnchors` does.

For manifest compile order and `compile.sectionsHeading`, see [Manifest compile order](../../features/manifest-compile-order.md).

## Built-in hooks

- **`stripAnchors`**: per shard. [stripAnchors](./strip-anchors.md): removes `{#id}` markers outside code, and every marker on a heading line.
- **`codeEvidence`**: per shard. [codeEvidence](./code-evidence.md): repo source links → `#L` fragments.
- **`inlineInserts`**: per shard. [inlineInserts](./inline-inserts.md): inline captioned insert libraries.

Assembly also runs the [link passes](../../features/compile-pipeline/link-passes.md), which aren't hooks. Its last step, after broken-link marking, is [table re-alignment](../../features/compile-pipeline/tables-after-link-rewriting.md), which prints an aligned table again once its links change width.
