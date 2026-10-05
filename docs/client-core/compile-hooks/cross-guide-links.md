# Cross-guide link rewriting

<!-- mdcp-paths: illustrative -->

Specification for assembly-time cross-shard and cross-guide link rewriting. Tests in `packages/mdcp-core/test/cross-guide-links.test.ts` map to the sections below (docs first, then TDD).

Multi-output consumer repos produce separate compiled guides (such as `glossary.md`, `architecture-review.md`, `technical-guide.md`) from shards that span `review/`, `security/`, `features/`, and sibling guide directories. Source shards link with relative `.md` paths. Compiled output must use stable in-document or cross-output `#slug` targets so link-fragment lint passes.

## Cross-guide purpose

Compile builds a **guide link index** from every guide in `compileOrder`. It has an entry for each shard in a guide's [`linkedSectionFiles`](../../features/manifest-compile-order.md#linked-shards-and-the-file-name-fallback) that opens with a heading, including the shards outside the guide directory. A `FIND-*` finding takes its slug from its file name, so it has an entry without a heading too. Each entry maps its shard to the compiled `{guideName, outputBasename, outputFile, slug}`, where the slug is the one the shard's demoted first heading gets in the owner's compiled guide, numbered with every earlier heading (see [Cross-guide section slugs](#cross-guide-section-slugs)). When the owner doesn't stitch the shard, the slug comes from the first guide in `compileOrder` that does. A link into the owner's compiled guide is then a dead anchor, since that file has no section for the shard. When another heading there has the same slug, such as a Setup heading for a shard titled Setup, the link points at that heading, and no check catches it. When the owner is stitched into the monolith, `outputFile` is the monolith, `monolithSlug` is the slug the heading gets there, and `guideFile` is the owner's compiled guide when the owner stitches the shard. When the owner doesn't stitch it, `monolithSlug` is the slug of the first copy in the monolith that does. When no copy there stitches it, `monolithSlug` is unset, and a link to the shard takes the entry's `slug`. The monolith has no section for it either. Compile marks such a link in the monolith unless another heading or section there has that slug, such as a declared `{#id}`. Link lint reports one from another output as a dead anchor unless a heading of the monolith has that slug.

The cross-guide rewrite then runs per shard, before sections are stitched, as the first of the [link passes](./index.md#link-passes).

## Cross-guide link matching

A link is rewritten when **all** of the following hold:

- Standard markdown link syntax: `[label](path)`
- Target path ends in `.md` (optional `#fragment`)
- Target is not `http://`, `https://`, or `#…`
- Target resolves to a shard registered in the guide link index
- Target shard's guide is **not** listed in `compile.crossGuideLinks.ignoreGuides` on the compiling guide

Cross-guide rewrite matches only links whose path starts with `./` or `../`, including links to shards of the same guide. The intra-guide pass handles bare paths, such as `topic/section.md`.

## Cross-guide section slugs

A link to a shard points at the heading that opens the shard's section, so its `#slug` is the anchor that heading gets in the compiled guide. One slugger numbers the heading lines in stitch order, as the refs registry does. A heading line is an ATX heading at column 0, as [stripAnchors heading lines](./strip-anchors.md#stripanchors-heading-lines) defines it. The slugger starts with the heading assembly writes first, `compile.title` or else the manifest's H1, and then reads each section's heading lines, sub-headings included. A heading whose slug an earlier heading already took gets a numeric suffix, starting at `-1`. So a section that follows a sub-heading with the same title gets `#title-1`, and so does a section that repeats the guide's H1.

A line inside a fenced code block isn't a heading, so a `# comment` in a shell example doesn't take a number. The fence scan follows list items but doesn't read blockquotes or HTML, as [stripAnchors limits](./strip-anchors.md#stripanchors-limits) describes.

A `FIND-*.md` shard keeps its finding id, and a first heading with a `{#id}` marker keeps that id. Both headings still take their number, so later headings count them. Assembly drops the first section's heading when it repeats `compile.title`. Links to that section then point at the title, unless the section declares an id. A link keeps a `{#id}` from the dropped heading, though no heading in the output has that anchor.

The slugger reads each title without its markers, since compile strips them from heading lines by default. When `compile.stripAnchors` is `false` and the `stripAnchors` hook doesn't run, the compiled headings keep their markers, and the slugger numbers each heading line by the title it renders, marker included. So `Setup {#custom}` takes `setup-custom`, and a later `Setup` section keeps `#setup`. The refs registry still reads titles without markers. Its slugs for those headings can differ from the rendered anchors.

The [monolith](../../glossary/monolith.md) runs one slugger through every guide it stitches, in `compileOrder`. Each guide starts with its lead heading and continues the numbering of the guides before it. So a section can take `#setup-1` in the monolith and `#setup` in its guide's compiled guide, when an earlier guide in the monolith also has a Setup heading. Compile assembles a guide in the monolith twice, once for each document, and each copy links its sections with that document's slugs.

The guide link index takes a shard's slug from its owner's numbering when the owner stitches the shard. [Index ownership](#index-ownership) defines the owner. When a link goes to the owner's output, it points at the heading as that output numbers it, even when the linking guide also stitches the shard. A guide that stitches a shard owned only through the transitive walk links to its own copy, with an in-document anchor that the guide numbers itself, as [Same compiled output preference](#same-compiled-output-preference) describes.

Headings that a compile hook adds after numbering, such as [inlineInserts](./inline-inserts.md) captions, take no number. A caption whose slug matches a later section heading's slug moves that heading to `-1`, and links to the section miss it. A renderer that adds heading anchors also gives one to setext headings and to ATX headings indented one to three spaces or nested in a list item or blockquote, which mdcp doesn't read as headings. Such a heading earlier in the guide with a section's title has the same effect.

## Cross-guide resolution

The pass finds the target shard in the order [Path lookup order](./index.md#path-lookup-order) gives for the cross-guide rewrite.

### Index ownership

The index gives each shard one owner guide, the first of these that applies:

1. The guide whose manifest lists the shard, or the last such guide in `compileOrder` when several manifests list it
2. The first guide in `compileOrder` whose directory contains the shard
3. The first guide in `compileOrder` that compiles the shard by following a link to it

For the first rule, a manifest that links no shards lists the files that the [file-name fallback](../../features/manifest-compile-order.md#linked-shards-and-the-file-name-fallback) compiles. Ownership by the first or second rule is canonical. [Same compiled output preference](#same-compiled-output-preference) says when a guide links its own copy of a shard whose owner is another guide.

### Same compiled output preference

When a `./` or `../` link resolves to a path present in the **assembling guide's** `slugByPath` map (the shard is co-compiled or transitively included in **this** output), cross-guide rewrite emits `#slug` or `#fragment` for that same document when:

- the index has no entry, or
- the index owner is the assembling guide, or
- the index owner is another guide but ownership is **non-canonical** (transitive `scopeRoot` inclusion only — not a manifest listing and not under that owner's `guideDir`)

Canonical ownership (manifest or path under `guideDir`) still wins for cross-output targets. Example: a glossary hub that transitively reaches a finding under `review/` keeps `architecture-review.md#find-004` even if the finding body was also pulled into the glossary compile graph. Multi-guide repos that only co-include a shared shard outside every `guideDir` keep in-document `#anchor` targets in each assembling output.

When the resolved absolute path is in the guide link index (and same-output preference does not already apply):

| Case                                                            | Rewritten target                                                                                                                  |
| --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Same compiled output as the assembling guide                    | `#slug` or `#fragment` when the link includes a fragment                                                                          |
| Different compiled output                                       | `{outputBasename}#slug` in the same directory (such as `architecture-review.md#find-004`), otherwise a relative path plus `#slug` |
| Both guides in the monolith (neither sets `compile.outputFile`) | The target guide's compiled guide plus `#slug` in the linking guide's compiled guide, and `#slug` in the monolith                 |
| Target guide in the monolith, linking guide a publish output    | The monolith plus `#slug`, such as `guides.md#setup-1`                                                                            |
| Target guide in `ignoreGuides`                                  | **unchanged**: keep source `.md` path (link to shard, not compiled output)                                                        |

Each `#slug` is the target heading's slug in the document the link points into. A link between two guides in the monolith compiles twice. In the linking guide's compiled guide, it targets the target guide's compiled guide, such as `b.md#topic`, with that guide's own slug, when that guide stitches the shard. Otherwise it targets the monolith, with the slug of the shard's first copy there. In the monolith, it targets the heading in the monolith, with the slug the monolith gives it. A publish output links a guide in the monolith through the monolith, with the monolith's slug.

An explicit `#fragment` is never renumbered. Compile writes it as the shard author wrote it, in every document. Broken-link marking checks an in-document fragment, such as `#details`, against every heading of the document that contains the link and the section slugs its assembly gave. In the monolith, that set is the headings of every guide there and the section slugs of every copy. Link lint checks an in-document fragment against the same set, and a fragment on another file, such as `a.md#details`, against that file's headings. So a fragment that points at a sub-heading of another guide in the monolith, such as `../a/setup.md#details`, stays a link in both documents. A fragment such as `./setup.md#setup` resolves in the target guide's compiled guide. In the monolith, that slug can belong to an earlier guide's heading with the same title. The link then points at that heading. No check catches that, because the slug exists in the monolith. A link without a fragment gets the right slug when the document it points into stitches its shard. [Cross-guide purpose](#cross-guide-purpose) gives the slug it takes otherwise.

Finding shards (`FIND-*.md`) use the finding id from the filename (such as `#find-004`), not the parent outcomes section slug. Broken-link marking and link lint accept the finding id as an in-document target in the output that stitches the finding, though the heading there takes its slug from its text, such as `find-004--example-finding`. On a link from another output, such as `architecture-review.md#find-004`, link lint reports the finding id as a dead anchor, because no heading in the target has it. A declared `{#id}` works the same way.

### Default `_build` outputs and transitive targets

In `_build`, as in any other output directory, a `./` or `../` link to a shard outside `guideDir` that the walk adds follows the rules above. [Same compiled output preference](#same-compiled-output-preference) says when it becomes an in-document anchor, and [`ignoreGuides` interaction](./publish-relative-links.md#ignoreguides-interaction) covers a link that keeps its shard path.

## Cross-guide exclusions

The pass **does not** transform:

- External URLs
- Same-document `#fragment` links
- Markdown links that do not resolve to an indexed shard
- Non-markdown paths (handled by `codeEvidence` or left unchanged)
- Links to shards in guides listed in `compile.crossGuideLinks.ignoreGuides` (publish-relative may still rebase the unchanged shard path; see [`ignoreGuides` interaction](./publish-relative-links.md#ignoreguides-interaction))

## Cross-guide config

Minimal multi-output setup — index and rewrite run automatically from `compileOrder` and per-guide `compile.outputFile`:

```json
{
  "outputDir": "_build/compiled",
  "compileOrder": ["glossary", "architecture-review", "technical-guide"],
  "guides": [
    {
      "name": "glossary",
      "path": "glossary",
      "compile": {
        "scopeRoot": ".",
        "outputFile": "glossary.md"
      }
    },
    {
      "name": "architecture-review",
      "path": "review",
      "compile": {
        "scopeRoot": ".",
        "manifest": "shards.md",
        "outputFile": "architecture-review.md"
      }
    },
    {
      "name": "technical-guide",
      "path": "technical",
      "compile": {
        "scopeRoot": ".",
        "outputFile": "technical-guide.md"
      }
    }
  ]
}
```

### `compile.crossGuideLinks.ignoreGuides`

Set on the **guide being compiled**. Links from that guide to shards of a listed guide keep source `.md` paths instead of rewriting to a `#slug` in the target guide's compiled guide or in the monolith ([ignoreGuides](../../glossary/ignore-guides.md)). Use when one compiled guide should link to live shard files for specific guides (such as technical reference docs that are not folded into a review bundle).

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

## Cross-guide compile example

Glossary shard input (`glossary/terms.md`):

```markdown
See [FIND-004](../review/outcomes/FIND-004.md) in the architecture review.
```

Review shard (`review/outcomes/FIND-004.md`):

```markdown
# FIND-004 — Example finding

Body.
```

Compiled glossary output:

```markdown
See [FIND-004](architecture-review.md#find-004) in the architecture review.
```

## Cross-guide multi-target (three guides)

When one guide links to shards in **two or more** other guides, each link rewrites to that shard's own `compile.outputFile` independently.

Hub shard input (`glossary/terms.md`):

```markdown
## Terms

See [FIND-004](../review/outcomes/FIND-004.md) and [Deployment](../technical/deployment.md).
```

Compiled `glossary.md` (each target keeps its guide output):

```markdown
## Terms

See [FIND-004](architecture-review.md#find-004) and [Deployment](technical-guide.md#deployment).
```

## Cross-guide ignore example (mixed compiled-output and shard links)

Same hub shard with `ignoreGuides: ["technical-guide"]` on the **glossary** guide. Compiled `glossary.md`:

```markdown
## Terms

See [FIND-004](architecture-review.md#find-004) and [Deployment](../../technical/deployment.md).
```

Review targets use the compiled `architecture-review.md`. The ignored guide keeps its shard path, and publish-relative rewrite rebases that path relative to `_build/compiled/glossary.md`. Tests in `packages/mdcp-core/test/cross-guide-links.test.ts` cover index entries, per-link routing, `ignoreGuides`, and end-to-end compile.
