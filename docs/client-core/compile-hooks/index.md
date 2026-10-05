# Compile hooks

Per-shard transforms run during `assembleGuide` **before** sections are stitched. Hooks receive each shard body after heading demotion and preamble stripping. Assembly then runs the [link passes](#link-passes) on the shard, and it strips anchors after stitching.

Hooks assemble [authored GFM](../../glossary/authored-gfm.md). They don't do variable substitution or template logic. See [Preprocessor / templating (out of scope)](../../features/design-constraints/preprocessor-templating.md#preprocessor--templating-out-of-scope).

## Architecture

```text
assembleGuide (per guide, once for each document it is written to)
  │
  ├─ for each shard (manifest order, then linked shards)
  │    ├─ processSection (demote headings, strip about-this-guide)
  │    ├─ applyCompileHooks (named hooks from config, in order)
  │    ├─ rewriteCrossGuideFileLinks (automatic when link index present)
  │    ├─ rewriteIntraGuideFileLinks (same-guide links, from the shard directory)
  │    └─ rewritePublishRelativeLinks (every guide, relative to its link base)
  │
  └─ stitch → stripAnchors (default) → intra-guide .md
```

**Guide link index**: built once per `compileGuideResults` from every guide in `compileOrder` (manifest sections plus [linked shards](../../features/manifest-compile-order.md#linked-shards-and-the-file-name-fallback)). Used by the automatic cross-guide pass. Optional `compile.crossGuideLinks.ignoreGuides` on the compiling guide skips the rewrite for links to listed guides. See [Cross-guide link rewriting](./cross-guide-links.md).

**Per-assembly hook state**: mutable `hookState` on `CompileHookContext` (such as `inlineInserts` counters and first-anchor map) shared across shard invocations within one assembly. A guide in the [monolith](../../glossary/monolith.md) is assembled twice, once for its compiled guide and once for the monolith. So every hook it runs, a registered custom hook included, sees each shard twice, with fresh `hookState` each time. A hook with side effects beyond its return value repeats them.

### Link passes

Assembly rewrites links to files in the passes below. They run on each shard in table order, and the intra-guide pass runs once more on the stitched body. They aren't compile hooks, so `compile.hooks` doesn't turn them off.

| Pass             | When                                       | Matches                                                                         | Output                                         |
| ---------------- | ------------------------------------------ | ------------------------------------------------------------------------------- | ---------------------------------------------- |
| Cross-guide      | Per shard, after the hooks                 | `./` and `../` paths to a shard in the guide link index                         | `#slug`, or another output's path plus `#slug` |
| Intra-guide      | Per shard, then again on the stitched body | Bare and `./` paths to a shard the guide stitches, and `../` paths after stitch | `#slug`                                        |
| Publish-relative | Per shard, after intra-guide               | `../` paths to a file or directory that exists                                  | The path relative to the guide's link base     |

A link with a `#fragment` keeps it in place of the slug. [Cross-guide resolution](./cross-guide-links.md#cross-guide-resolution) says when a cross-guide link stays in the document and which output it names otherwise. [Publish-relative matching](./publish-relative-links.md#publish-relative-matching) says which `../` targets the publish-relative pass skips, and [`ignoreGuides` interaction](./publish-relative-links.md#ignoreguides-interaction) covers a cross-guide link that keeps its shard path. The publish-relative shard also defines the [link base](./publish-relative-links.md#when-it-runs).

The intra-guide pass also reads the links that the cross-guide pass wrote. The cross-guide pass writes a link to an output in the same directory as the output's file name alone, such as `glossary.md#term`. When the guide stitches a shard with that file name, wherever the shard sits, the intra-guide pass rewrites the link to `#term`. Compile marks it as a dead anchor, unless a heading of the document has that slug, which the link then points at. Guides without `compile.outputFile` all write to the output directory, so a link from one to another meets this when the linking guide stitches a shard named like the other's output.

### Path lookup order

A pass that follows a link to a file first drops any leading `./` and the `#fragment`. It then tries the directories below in order and uses the first one where the path exists. A path found in none of them stays as written. `codeEvidence` can still change the `#fragment` of such a link, as [codeEvidence path resolution](./code-evidence.md#codeevidence-path-resolution) says.

| Pass                      | Lookup order                                                                                                                                 |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `codeEvidence`            | Shard directory, working directory, parent of the working directory, `compile.scopeRoot`                                                     |
| `inlineInserts`           | Shard directory, working directory, parent of the working directory, `compile.scopeRoot`, each `hooksConfig.inlineInserts.searchRoots` entry |
| Cross-guide rewrite       | Shard directory, working directory, parent of the working directory, `compile.scopeRoot`, guide directory                                    |
| Intra-guide, per shard    | Shard directory, guide directory, then the first stitched shard with that file name                                                          |
| Intra-guide, after stitch | Guide directory, then the first stitched shard with that file name                                                                           |
| Publish-relative rewrite  | Shard directory, `compile.scopeRoot`, guide directory                                                                                        |

The shard directory contains the shard being compiled, and the guide directory contains the guide's manifest. `compile.scopeRoot` is resolved from the docs root and skipped when unset. The working directory is `process.cwd()`, where the command runs, and `searchRoots` entries are resolved from it, so the same shard can resolve differently from the repository root and from `docs/`. The intra-guide pass looks paths up among the shards the guide stitches rather than on disk. Its per-shard run skips paths that start with `../`, and the file-name match applies only to a link that is a file name alone, such as `name.md` or `./name.md`.

After lookup, `codeEvidence` and the publish-relative rewrite emit the path relative to the guide's [link base](./publish-relative-links.md#when-it-runs), and `inlineInserts` inlines the file. The cross-guide and intra-guide rewrites emit a heading target: `#slug`, after the other output's path when the target is in another file.

### guideDir misaligned with shard tree

Some guides set `path` to a compiled subdirectory while the shards are elsewhere in the same tree, often one level up from the guide directory:

```text
guide/
  compiled/shards.md   ← manifest (guideDir)
  section-a.md
  topic/section-b.md
  assets/diagram.md
```

The config uses `"path": "guide/compiled"` with `"compile": { "manifest": "shards.md", … }`. The manifest lists each shard with a path that starts with `../`, because a bare path can't step up out of a directory. A bare link between the shards, such as `[Section B](topic/section-b.md)` in section A, still resolves, because the per-shard intra-guide pass tries the shard directory before the guide directory.

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

Assembly also runs the [link passes](#link-passes), which aren't hooks.

`stripAnchors` is also controlled by `compile.stripAnchors` (default `true`) after assembly.
