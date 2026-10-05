# Compile hooks

Per-shard transforms run during `assembleGuide` **before** sections are stitched. Hooks receive each shard body after heading demotion and preamble stripping. Assembly then runs the [link passes](#link-passes) on the shard and strips anchors after stitching. Its last step re-aligns tables, as the diagram below shows.

Hooks assemble [authored GFM](../../glossary/authored-gfm.md). They don't do variable substitution or template logic. See [Preprocessor / templating (out of scope)](../../features/design-constraints/preprocessor-templating.md#preprocessor--templating-out-of-scope).

## Architecture

```text
assembleGuide (per guide, once for each document it is written to)
  │
  ├─ for each shard (manifest order, then linked shards)
  │    ├─ processSection (demote headings, strip about-this-guide)
  │    ├─ applyCompileHooks (named hooks from config, in order)
  │    ├─ cross-guide pass (automatic when link index present, marks what it writes)
  │    ├─ rewriteIntraGuideFileLinks (same-guide links, from the shard directory)
  │    └─ rewritePublishRelativeLinks (every guide, relative to its link base, marks what it writes)
  │
  ├─ stitch → stripAnchors (default) → intra-guide .md → unmark
  │
  └─ markBrokenLinks → realignTables (the last step)
```

**Guide link index**: built once per `compileGuideResults` from every guide in `compileOrder` (manifest sections plus [linked shards](../../features/manifest-compile-order.md#linked-shards-and-the-file-name-fallback)). Used by the automatic cross-guide pass. Optional `compile.crossGuideLinks.ignoreGuides` on the compiling guide skips the rewrite for links to listed guides. See [Cross-guide link rewriting](./cross-guide-links.md).

**Per-assembly hook state**: mutable `hookState` on `CompileHookContext` (such as `inlineInserts` counters and first-anchor map) shared across shard invocations within one assembly. A guide in the [monolith](../../glossary/monolith.md) is assembled twice, once for its compiled guide and once for the monolith. So every hook it runs, a registered custom hook included, sees each shard twice, with fresh `hookState` each time. A hook with side effects beyond its return value repeats them.

### Link passes

Assembly rewrites links to files in the passes below. They run on each shard in table order, and the intra-guide pass runs once more on the stitched body. They aren't compile hooks, so `compile.hooks` doesn't turn them off. Every later pass leaves alone a link that the cross-guide or publish-relative pass rewrote, and that includes the run on the stitched body. Assembly marks each target those two passes write, and it removes the marks after that run. So a cross-guide target such as `glossary.md#term` stays as the cross-guide pass wrote it, even when the guide stitches a shard named `glossary.md`.

| Pass             | When                                       | Matches                                                                                                     | Output                                         |
| ---------------- | ------------------------------------------ | ----------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| Cross-guide      | Per shard, after the hooks                 | `./` and `../` paths to a shard in the guide link index                                                     | `#slug`, or another output's path plus `#slug` |
| Intra-guide      | Per shard, then again on the stitched body | Bare and `./` paths to a shard the guide stitches, and after stitch the `../` paths no earlier pass rewrote | `#slug`                                        |
| Publish-relative | Per shard, after intra-guide               | `../` paths to a file or directory that exists                                                              | The path relative to the guide's link base     |

A link with a `#fragment` keeps it in place of the slug. [Cross-guide resolution](./cross-guide-links.md#cross-guide-resolution) says when a cross-guide link stays in the document and which output it names otherwise. [Publish-relative matching](./publish-relative-links.md#publish-relative-matching) says which `../` targets the publish-relative pass skips, and [`ignoreGuides` interaction](./publish-relative-links.md#ignoreguides-interaction) covers a cross-guide link that keeps its shard path. The publish-relative shard also defines the [link base](./publish-relative-links.md#when-it-runs).

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

## Tables after link rewriting

Link rewriting changes the length of a link target, and broken-link marking replaces a link with a longer marker. Either change moves the pipes of the table row with that link. A table that a shard aligns would then fail markdownlint's MD060 rule in the compiled guide. So the last step of each assembly, after broken-link marking, re-aligns that table. It prints the table as Prettier does when `proseWrap` is `preserve`, Prettier's default, or `always`: each column is as wide as its widest cell and three characters at least, and each cell pads to the alignment of its delimiter cell. When `proseWrap` is `never`, Prettier prints a table compact once it outgrows `printWidth`. Compile prints that table aligned, which MD060 accepts and Prettier's check rejects.

Compile measures a cell in display columns. A wide or fullwidth East Asian character takes two columns, and so does an emoji shown as an emoji. A nonspacing or enclosing mark, a control character or a format character takes none. Any other character takes one, a spacing mark included. These widths match Prettier and markdownlint wherever the two tools agree.

Where Prettier and markdownlint disagree, a layout that passes one tool fails the other. Prettier gives one column to each format character, such as a zero-width space or a soft hyphen. It also gives one to each nonspacing mark outside U+0300 to U+036F, such as a Hebrew point or a Thai vowel mark. Markdownlint gives these none. Prettier counts a text-style emoji like ☝ as two columns where markdownlint counts one. Compile follows markdownlint on these. Indic text differs again. Markdownlint counts a grapheme cluster, such as a conjunct with its vowel sign, as one column. Prettier counts each code point, and compile counts each code point except a nonspacing mark, so it matches neither tool.

If a cell without a link contains such text, markdownlint's MD060 rule already flags the table in the shard, and it flags the compiled table too. Where compile and Prettier measure that cell differently, as for a Hebrew point, compile leaves the table out of line where its links changed width. Where they agree, as for Hindi text without a nonspacing mark, compile re-aligns the table to Prettier's layout. If only a cell with a link contains such text, compile re-aligns the table by its own measure. For text other than Indic, the result passes MD060, and Prettier's check fails on it. Indic text fails MD060, and Prettier's check passes only when the text has no nonspacing mark.

Compile re-aligns a table when its cells without a link match the width of their column's delimiter cell and some cell with a link doesn't. The delimiter row has no link, so it keeps the width the shard gave each column. A table qualifies when some cell differs in width from the delimiter cell of its column, and each such cell contains a link or a broken-link marker. That rule also re-aligns a shard table whose link cells were out of line before compile. The table must also pad some cell with more than one space, which a compact table never does. A compact or tight table stays as written, and so does a table whose pipes still line up. When something else changes the width of a cell, the table stays as compile left it. Stripping an explicit `{#id}` anchor from a cell does that, and so does `codeEvidence` when it rewrites link syntax to a repository file inside a code span, rebasing its path or adding a line fragment. A custom compile hook can do it too.

The padding rule misses an aligned table where each column's cells all have the same width, since no cell then pads past one space. Compile reads that table as compact and doesn't re-align it after a link changes width. MD060 accepts the result as a compact table, but Prettier's check fails on it.

The table ends at a blank line or a fence, and at a line that leaves its blockquote. It also ends at a line indented as far as the rows or less that opens another block, such as a list item, a heading, a blockquote, an HTML block or a thematic break. So a table in a tight list ends at the next list item, or at a nested list right under it. A list item ends a table even where it couldn't interrupt a paragraph, such as an item numbered `10.`, so compile reads a fence in that item as fenced code. Every other line up to the end is a row. Each row must start and end with a pipe after the indentation and blockquote markers of the delimiter row. Compile leaves the whole table as written when any row breaks that rule or has more cells than the delimiter row. A tab anywhere in a row also leaves the table as written. When compile leaves a table, it leaves every row up to the table's end, even a row that looks like a delimiter row.

A table in a list item or a blockquote keeps its indentation and its markers. A table in more than ten nested blockquotes stays as written, since finding the fences of each quote around it takes time that grows with the square of the depth. When a table opens its list item, Prettier prints the header row on the marker's line, such as `- | Page | Purpose |`, and indents the other rows to the item's text. Compile re-aligns that table when the marker is as wide as that indentation, and keeps the marker on the header row. Compile leaves a table whose header row sits in fewer blockquotes than a non-blank line right above it, or in as many and indented less than that line's text, unless the header row opens a list item. That row may continue the paragraph above it, and GFM then doesn't read a table there. Compile doesn't re-align a table in fenced code, in a blockquote or out of one. A link in that table can still change and leave the table out of line. `codeEvidence` rewrites a link to a repository file in any fence. Link rewriting and broken-link marking skip a fence of backticks outside a blockquote, but they change links in a fence of tildes or in a quoted fence. Compile reads an indented code block or an HTML block as prose, as link rewriting does, so it re-aligns a table there too. When the line right after the last row closes a comment, such as `-->`, compile reads that line as one more row and leaves the table as written. A pipe escaped as `\|` stays in its cell, in a code span or out of one.

Code: `realignTables` in `packages/mdcp-core/src/compile/align-tables.ts`, which measures cells with `displayWidth` in `packages/mdcp-core/src/markdown/display-width.ts`. Tests in `packages/mdcp-core/test/align-tables.test.ts` and `packages/mdcp-core/test/display-width.test.ts` map to this section.

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

Assembly also runs the [link passes](#link-passes), which aren't hooks. Its last step, after broken-link marking, is [table re-alignment](#tables-after-link-rewriting), which prints an aligned table again once its links change width.

`stripAnchors` is also controlled by `compile.stripAnchors` (default `true`) after assembly.
