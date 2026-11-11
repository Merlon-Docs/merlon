# ADR 0008: One document model behind every source format

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

So a project whose docs are reStructuredText, plain text, man pages or AsciiDoc gets nothing from `merlon review` or `merlon check`: discovery sees zero files. A trial on the Linux kernel's `Documentation/` tree (3,489 `.rst` files plus `.txt`, `README`, extensionless prose and troff man pages, no `.md`, built by Sphinx) confirmed it. A standard-library Python prototype of `merlon review` for that tree found real sprawl, and seven of its first findings were false positives that a line-level reader has to get right. They are the test fixtures below.

The fix is not a second code path per format. Links, anchors, headings, manifests, paragraphs and includes mean the same thing in every format; only their spelling differs. So core should check, review and compile one format-neutral model, and each format should only translate to and from it.

## Decision

Split core into three layers and keep every format detail in the outer two:

```text
source text ──Reader──▶ SourceDoc ──core passes──▶ findings / edits ──Writer──▶ output text
             (per format)  (neutral)  (format-free)                (per format)
```

- A **Reader** parses one format into a `SourceDoc`. It knows the syntax and nothing about checks.
- **Core passes** (review signals, link and anchor validation, orphans, heading checks, coverage, compile planning) read only `SourceDoc` values and the small interfaces below. None of them imports `markdown/`.
- A **Writer** turns the edits compile plans (demote a heading, rewrite a link target, insert a title, wrap in source tags) back into text of one format. Edits are spans on the original source, so untouched text passes through byte for byte.

A format is a registered bundle of a Reader, a Writer and an anchor scheme. GFM is the first bundle, extracted from today's code with no behaviour change. RST, plain text and man pages follow.

### SOLID, applied

- **Single responsibility.** Parsing, checking and emitting live in separate modules. A review signal never parses, and a reader never decides what is a finding.
- **Open/closed.** Formats come from a registry (`registerFormat`). Adding AsciiDoc adds a bundle and its fixtures; review, check and compile don't change.
- **Liskov substitution.** One shared contract test suite runs against every registered format: the same fixture document written in each format must produce the same `SourceDoc` shape (title, heading tree, paragraph count, link kinds, anchors, manifest entries).
- **Interface segregation.** No fat adapter. The interfaces are small and a format implements only what it supports: a plain-text bundle has a Reader but no anchor scheme, and a format that can't be compiled has no Writer.
- **Dependency inversion.** Passes depend on `SourceDoc` and the interfaces; the registry injects the concrete format chosen by config.

### The model and interfaces

```ts
interface SourceDoc {
  path: string; // docs-root-relative POSIX path, symlinks resolved
  format: string; // 'gfm' | 'rst' | 'text' | 'man'
  title: Heading | null;
  headings: Heading[]; // { text, level, line, span }
  blocks: Block[]; // paragraph | code | list-item | table | directive, each with line + span
  links: DocLink[]; // { kind: 'file' | 'doc' | 'anchor' | 'label' | 'term' | 'manpage' | 'external', target, fragment?, line, span }
  anchors: Anchor[]; // { id, line, origin: 'heading' | 'label' | 'name' | 'generated' }
  manifest: ManifestEntry[]; // { target, line, group, kind: 'toc' | 'include', glob? }
  orphanOk: boolean; // RST `:orphan:`
}

interface SourceReader {
  read(text: string, path: string): SourceDoc;
}
interface AnchorScheme {
  anchorsFor(doc: SourceDoc): Anchor[];
} // GitHub slugs, Sphinx labels + autosectionlabel
interface RefResolver {
  resolve(link: DocLink, from: SourceDoc): Resolution;
}
interface SourceWriter {
  apply(text: string, edits: Edit[]): string;
  render(node: Synthesized): string;
} // titles, banners, source tags
```

Prose for words and paragraphs comes from `blocks` with code, literal, directive and table blocks excluded, so `long-shard` and `duplicate-paragraph` count the same thing in every format.

### Formats in this change

| Format | Reader covers                                                                                                                                                                                                                                                                                                                                         | Anchors and refs                                                                                                             | Writer                            |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| `gfm`  | Today's behaviour, moved behind the interfaces                                                                                                                                                                                                                                                                                                        | GitHub heading slugs, `refs.json`                                                                                            | Today's compile output, unchanged |
| `rst`  | Over/underline titles; `toctree` (relative, `/absolute`, `:glob:`, `:caption:` as the index group); `include` and `literalinclude`; `:ref:`, `:doc:`, `:term:` with wrapped targets; `.. _label:` (indented, in list items, backquoted) and `:name:`; `:orphan:`; literal and directive bodies masked; `../x` in a toctree is an entry, not a comment | Sphinx resolver: labels, `:name:`, `autosectionlabel` (`prefixDocument`, `maxDepth`), `ignoreLabels`, optional `objects.inv` | See the open decision below       |
| `text` | Blank-line paragraphs; an underlined first line as title; files starting with `#!` skipped; `README` and extensionless files via `sources` globs                                                                                                                                                                                                      | none                                                                                                                         | none                              |
| `man`  | troff `.TH` title, `.SH`/`.SS` headings, `.PP`/`.P` paragraphs, `.nf`…`.fi` and `.EX`…`.EE` masked; `.BR name (N)` and `name(N)` as `manpage` links                                                                                                                                                                                                   | `manpage` links resolve to `name.N` files under the configured roots                                                         | none                              |

### Config

| Key             | Default                                    | Meaning                                                                                                                                                                   |
| --------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sources`       | `[{ "glob": "**/*.md", "format": "gfm" }]` | Which files are docs and which format reads each. First match wins. Globs are relative to the docs root.                                                                  |
| `compileOrder`  | required today                             | Optional. A command that compiles fails with a message naming the key when it is missing.                                                                                 |
| `review.guides` | none                                       | Per-guide threshold overrides, such as `{ "ABI": { "maxShardWords": 20000 } }`. A guide is a `compileOrder` name or, without one, a top-level directory of the docs root. |
| `roots`         | the guide manifests                        | Entry documents for reachability when there is no `compileOrder`, such as `["index.rst"]`.                                                                                |
| `manifestHook`  | none                                       | Module, relative to the config file, whose default export returns extra reachable paths (for example, toctrees generated from `MAINTAINERS`).                             |
| `sphinx`        | none                                       | `{ autosectionlabel: { prefixDocument, maxDepth }, ignoreLabels: [regex], inventory: "path/objects.inv" }`.                                                               |

Every key gets `.describe()` text and lands in `merlon.config.schema.json`. A config without `sources` reads exactly what it reads today.

### Commands

- `merlon check` and `merlon review` run on every format in `sources`. Orphans follow manifest entries, includes, `doc` links, the manifest hook and `orphanOk`. Symlinks are resolved and counted once. Every finding carries file and line; JSON findings gain an additive `locations` array, and the text report is unchanged for a Markdown-only config.
- `--no-compile` skips the compile step (and markdownlint, Vale and `refs.json`) for trees another tool builds.
- `--config` may live outside the docs root; module and inventory paths in it resolve against the config file.

### Skill

The getting-started workflow gains a "brownfield, non-Markdown" branch: a project-local extension skill and an out-of-tree config, then `merlon review --no-compile`, with no `docs/` scaffold.

## Open decision: compile scope

Compile moves onto the model for GFM in this change, with byte-identical output. What compile does for a non-GFM guide is still open:

1. **Model now, non-GFM writers later (recommended).** The compile planner is format-neutral; only the GFM Writer ships. A guide in another format is rejected by `compile` with a clear message, and RST and man Writers are separate changes with their own fixtures.
2. **Same-format compile now.** An RST guide compiles to one RST file (adornments re-levelled, `:doc:` links to stitched documents rewritten to `:ref:`). Larger change; Sphinx already builds the kernel tree.
3. **Convert to GFM.** Any source compiles to Markdown. Lossy for directives and roles; was a non-goal of the original task.

## Alternatives considered

- **One fat adapter per format** (the first draft of this ADR). Every format would implement every method, including compile operations it can't support, and core would keep format branches. It fails interface segregation and leaves compile on a second path.
- **Convert sources to Markdown first.** It throws away labels, roles and directives that the checks need, and it fights the tool that builds the project.
- **Require docutils or a full troff parser.** Exact, but adds a Python or C dependency to a Node CLI. Line-level readers were enough in the prototype; a stricter reader can replace one later behind the same interface.

## Consequences

- `SourceDoc`, the interfaces, the registry and four formats are new public surface in core: a minor release, with `markdown/` helpers still exported for compatibility.
- Core passes lose their direct imports of `markdown/`. That is the largest diff, and it is guarded by the existing tests and snapshots, which must pass unchanged after the GFM extraction.
- [GFM scope](../design-constraints/gfm-scope.md) becomes the GFM format's page, and a new page describes the model and how to add a format.
- AsciiDoc has no bundle yet; the contract suite is what a contributor would implement against.

## Test fixtures

Each was a false positive in the prototype:

- `../RCU/index` inside a toctree is an entry, not a comment.
- `* .. _label:` in a list item, and ``.. _`last row`:``.
- A `:ref:` whose text wraps across two lines.
- `:ref:` to `process/coding-style:13) Printing kernel messages` (autosectionlabel).
- `:ref:` to a target defined only by a `:name:` option.
- A symlinked doc (`Changes -> process/changes.rst`) is not a duplicate of its target.
- A per-guide `maxShardWords` override for long reference pages.

Plus a contract fixture: one small document written in GFM, RST, text and man, which must read to the same model.

## Re-evaluate when

- A reader's line-level heuristics produce false positives the fixtures can't capture, which would justify a stricter parser behind the same interface.
- Someone asks to compile a format whose Writer doesn't exist yet.
