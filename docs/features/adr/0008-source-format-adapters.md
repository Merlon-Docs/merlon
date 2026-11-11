# ADR 0008: Read non-Markdown sources through format adapters

- **Status:** Proposed
- **Date:** 2026-11-11
- **Related:** [ADR 0007](./0007-doc-review-workflow.md); [GFM scope](../design-constraints/gfm-scope.md); [`merlon review`](../../client-cli/commands-reference.md#sprawl-review)

## Context

The Merlon Docs workflow doesn't depend on the source format. Shard responsibility, the reviewer lenses, the sprawl signals and "one rule in one place" apply as well to a Sphinx tree as to a Markdown one. The core package does depend on it. Every layer assumes [GFM](../../glossary/gfm.md):

| Layer        | Where (core 1.1.0, `packages/merlon-docs-core/src`)                                                                                               | Assumption                            |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| Discovery    | `validate/coverage.ts` and `validate/path-probe.ts` glob `**/*.md`; `sectionFiles` and `checkOrphansForGuides` fall back to `n.endsWith('.md')`   | shards are `.md`                      |
| Manifest     | `isIndexFile` in `validate/review.ts` (`index.md`, `shards.md`); `resolveManifestPaths` and `linkedSectionFiles` in `compile/section-manifest.ts` | a guide index is a Markdown link list |
| Headings     | `parseHeading` and `parseAtxHeading` in `markdown/`; `firstH1` in review; `demoteHeadings` and `extractFirstHeading` in compile                   | ATX `#` headings                      |
| Links        | `extractLinks`, `mdLinkPaths`, `slugLinkTargets`, `scanMarkdownLinks`; `isShardLinkTarget` in review keeps `.md` targets only                     | `[text](target#frag)`                 |
| Slugs / refs | `githubSlugify`, `buildSlugRegistry`, `refs.json`                                                                                                 | anchors are GitHub heading slugs      |
| Paragraphs   | `maskNonProse`, `paragraphUnits`, `shardProseWords`, `createCodeFenceScanner`                                                                     | GFM block rules                       |
| Output       | `defaultGuideOutputFile` gives `${guide}.md`                                                                                                      | compiled output is Markdown           |
| Config       | `compileOrder` is required (`.min(1)`)                                                                                                            | every project compiles guides         |

So a project whose docs are reStructuredText, plain text or AsciiDoc gets nothing from `merlon review` or `merlon check`: discovery sees zero files. A trial on the Linux kernel's `Documentation/` tree (3,489 `.rst` files plus `.txt`, `README` and extensionless prose, no `.md`, built by Sphinx) confirmed it. A standard-library Python prototype of `merlon review` for that tree found real sprawl, and seven of its first findings were false positives that a line-level reader has to get right. They are the test fixtures below.

## Decision

Add a **source-format adapter** layer to core. GFM becomes the default adapter, not the only one. Ship RST and plain-text adapters, a Sphinx reference resolver, and a review-only mode for trees another tool already builds. `merlon compile` stays GFM-only. A config without `sources` behaves exactly as it does today.

### The adapter interface

```ts
interface SourceFormat {
  id: string; // 'gfm' | 'rst' | 'text'
  extensions: string[]; // for messages and defaults; matching uses `sources` globs
  isIndex(path: string): boolean;
  manifestEntries(text: string, path: string): ManifestEntry[]; // { target, line, group, kind: 'toctree' | 'include' | 'link', glob? }
  title(text: string): { text: string; line: number } | null;
  headings(text: string): { title: string; level: number; line: number }[];
  paragraphs(text: string): { text: string; line: number }[]; // prose only
  links(text: string, path: string): SourceLink[]; // { kind: 'file' | 'anchor' | 'label' | 'external', target, line, role? }
  labels(text: string, path: string): { name: string; line: number }[];
  wordCount(text: string): number;
  isOrphanOk?(text: string): boolean; // RST `:orphan:`
}
```

`group` on a manifest entry is what `index-size` counts per group: the enclosing `##` heading in GFM, the toctree's `:caption:` (or "uncaptioned toctree at line N") in RST.

### GFM adapter: extraction only

The GFM adapter wraps the functions review and check already call (`maskNonProse`, `paragraphUnits`, `shardProseWords`, `parseHeading`, `extractLinks`, the manifest walk), and review routes through it. Compile keeps calling the `markdown/` helpers directly: it is GFM-only by decision, so pushing it through the interface adds risk and no capability. Every existing test and snapshot passes unchanged after this step.

### Config

| Key                       | Default                                    | Meaning                                                                                                                                                                              |
| ------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `sources`                 | `[{ "glob": "**/*.md", "format": "gfm" }]` | Which files are docs, and how to read each. The first matching entry wins. Globs are relative to the docs root.                                                                      |
| `compileOrder`            | required today                             | Becomes optional. `merlon compile`, and `merlon check` without `--no-compile`, fail with a clear message when it is missing.                                                         |
| `review.roots`            | `["index.rst"]` for RST, else the guides   | Entry documents that reachability starts from in review-only mode.                                                                                                                   |
| `review.guides`           | none                                       | Per-guide threshold overrides, for example `{ "ABI": { "maxShardWords": 20000 } }`. A guide is a `compileOrder` name, or in review-only mode a top-level directory of the docs root. |
| `review.manifestHook`     | none                                       | Module path (relative to the config file) whose default export returns extra reachable docs-root-relative paths.                                                                     |
| `sphinx.autosectionlabel` | off                                        | `{ "prefixDocument": true, "maxDepth": 0 }`, mirroring `autosectionlabel_prefix_document` and `autosectionlabel_maxdepth`.                                                           |
| `sphinx.ignoreLabels`     | `[]`                                       | Regexes for labels generated at build time (`genindex`, `modindex`, `search`, `abi_.*`).                                                                                             |
| `sphinx.inventory`        | none                                       | Path to a built `objects.inv`. Its `std:label` and `std:doc` entries count as defined.                                                                                               |

Every new key gets `.describe()` text and lands in `merlon.config.schema.json`.

### RST adapter

Line-level heuristics, no docutils:

- **Title:** the first text line with an adornment line under it (and optionally over it) of at least its length minus one.
- **Manifest entries:** each `.. toctree::` body, relative, absolute (`/path`, from the docs root) and `:glob:` entries, with `Title <target>` forms unwrapped. `:caption:` names the index group. A `../RCU/index` entry is an entry, not a comment: only `..` followed by a space or end of line starts a comment, and only at the directive's own indent.
- **Includes:** `.. include::` and `.. literalinclude::` count as reachability edges (and as `file` links that must resolve).
- **Labels:** `.. _label:`, indented, inside a list item (`* .. _label:`) and backquoted (``.. _`last row`:``); the `:name:` option of any directive.
- **Links:** `:ref:`, `:doc:` and `:term:` roles, with `Text <target>` forms, and targets that wrap across lines joined with whitespace collapsed.
- **Prose:** literal blocks (`::` paragraphs and their indented body), directive bodies of `code-block`, `code`, `literalinclude`, `toctree`, comments and tables are masked before paragraphs and words are counted.
- **`:orphan:`** in the field list at the top marks a file as intentionally unreachable.

### Plain-text adapter

Paragraphs are runs of non-blank lines. The title is a first line underlined with `=`, `-` or `~`. A file that starts with `#!` is skipped. It has no links or labels, so it only feeds the four sprawl signals.

### Sphinx reference resolver

`:ref:` targets resolve against explicit labels, `:name:` options, `autosectionlabel` targets (`docname:Section Title` with `prefixDocument`, limited by `maxDepth`), `ignoreLabels`, and the optional `objects.inv`. `:doc:` targets resolve against files, relative to the referring document or absolute from the docs root. An unresolved target is an `undefined-ref` issue in `merlon check --no-compile`. The inventory reader is about 40 lines on `node:zlib`, so it ships in the same commit group.

### Review-only mode

`merlon review --no-compile` and `merlon check --no-compile` read `sources` directly instead of the compile guides.

- **review** runs the same four signals through the adapters, and each finding carries file and line.
- **check** reports orphans (files no root reaches through manifest entries, includes, `:doc:` links, the manifest hook, or `:orphan:`), unresolved file links, and undefined refs. It skips compile, refs.json, markdownlint and Vale.
- **Symlinks** are resolved to their target and counted once, so `Changes -> process/changes.rst` is not a duplicate of its target.

Without `--no-compile`, both commands behave as they do today, and the existing text report doesn't change. JSON findings gain an additive `locations` array (`{ file, line }`) in both modes.

### Out-of-tree config

`--config` may point anywhere and `--docs-root` elsewhere, so a project can be reviewed without committing files to it. Paths inside the config that name modules or inventories (`review.manifestHook`, `sphinx.inventory`) resolve against the config file's directory; `sources` globs and `review.roots` resolve against the docs root.

### Skill

The getting-started workflow gains a "brownfield, non-Markdown" branch: write a project-local extension skill and an out-of-tree config, run `merlon review --no-compile`, and do not scaffold `docs/`.

## Alternatives considered

- **Convert RST to Markdown.** It rewrites the project's sources and fights the tool that builds them. A non-goal.
- **Compile non-Markdown shards.** Sphinx, MkDocs and Antora already build these trees, with features (autodoc, cross-project inventories) Merlon Docs would only imitate.
- **Require docutils.** It parses exactly but adds a Python dependency to a Node CLI. The prototype showed line-level reading is enough for review signals; docutils stays optional for anyone who wants a stricter external check.
- **Push compile through the adapter too.** No user gains anything from it while compile is GFM-only, and it would put the no-behaviour-change promise at risk across the largest module.

## Consequences

- `SourceFormat`, the three adapters, the resolver, `sources`, `review.guides`, `review.roots`, `review.manifestHook` and `sphinx.*` are new public surface in core and the config schema. This is a minor release.
- `compileOrder` becomes optional in the schema. A Markdown config that omits it fails at compile instead of at load, with a message that names the key.
- [GFM scope](../design-constraints/gfm-scope.md) narrows to "compile and refs are GFM"; review and check gain other formats.
- AsciiDoc gets no adapter yet. The interface is shaped so one can be added without touching review.

## Test fixtures

Each was a false positive in the prototype:

- `../RCU/index` inside a toctree is an entry, not a comment.
- `* .. _label:` in a list item, and ``.. _`last row`:``.
- A `:ref:` whose text wraps across two lines.
- `:ref:` to `process/coding-style:13) Printing kernel messages` (autosectionlabel).
- `:ref:` to a target defined only by a `:name:` option.
- A symlinked doc is not a duplicate of its target.
- A per-guide `maxShardWords` override for long reference pages.

## Re-evaluate when

- A second non-Markdown project asks for compile, which would reopen the compile non-goal.
- Line-level reading produces false positives the fixtures can't capture, which would make docutils worth requiring.
