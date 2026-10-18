# Cross-guide link rewriting

Specification for assembly-time cross-shard and cross-guide link rewriting. The [Spec-to-test map](../../developer/packages-and-tests.md#spec-to-test-map) names the tests behind this spec.

A repo with several outputs compiles separate guides, such as `glossary.md` and `architecture-review.md`, from shards in sibling guide directories. Source shards link each other with relative `.md` paths. Compile turns each such link into a `#slug` target in the same document or in another output, and link lint checks that the target has the slug. A link to a `FIND-*` finding in another output fails that check unless its fragment is the heading's slug, as [Link index limits](#link-index-limits) says.

## Guide link index

Compile builds a **guide link index** from every guide in `compileOrder`. It has an entry for each shard in a guide's [`linkedSectionFiles`](../manifest-compile-order.md#linked-shards-and-the-file-name-fallback) that opens with a heading, including the shards outside the guide directory. A `FIND-*` finding takes its slug from its file name, so it has an entry without a heading too. Each entry maps its shard to the compiled `{guideName, outputBasename, outputFile, slug}`, where the slug is the one the shard's demoted first heading gets in the owner's compiled guide, numbered with every earlier heading (see [Section slugs](./section-slugs.md)). When the owner doesn't stitch the shard, the slug comes from the first guide in `compileOrder` that does. When the owner is stitched into the monolith, `outputFile` is the monolith, `monolithSlug` is the slug the heading gets there, and `guideFile` is the owner's compiled guide when the owner stitches the shard. When the owner doesn't stitch it, `monolithSlug` is the slug of the first copy in the monolith that does, and it is unset when no copy there stitches it. [Link index limits](#link-index-limits) says where an entry's slug points at no section.

The cross-guide rewrite then runs per shard, before sections are stitched, as the first of the [link passes](./link-passes.md).

## Cross-guide link matching

A link is rewritten when **all** of the following hold:

- Standard markdown link syntax: `[label](path)`
- Target path ends in `.md` (optional `#fragment`)
- Target is not `http://`, `https://`, or `#…`
- Target resolves to a shard registered in the guide link index
- Target shard's guide is **not** listed in `compile.crossGuideLinks.ignoreGuides` on the compiling guide, unless [same compiled output preference](#same-compiled-output-preference) keeps the link in the document
- The link is outside fenced code and code spans (see [Link passes](./link-passes.md))

Cross-guide rewrite matches only links whose path starts with `./` or `../`, including links to shards of the same guide. The intra-guide pass handles bare paths, such as `topic/section.md`. <!-- merlon-paths: illustrative -->

## Cross-guide section slugs

Compile numbers each section's `#slug` as [Section slugs](./section-slugs.md) describes.

The guide link index takes a shard's slug from its owner's numbering when the owner stitches the shard. [Index ownership](#index-ownership) defines the owner. When a link goes to the owner's output, it points at the heading as that output numbers it, even when the linking guide also stitches the shard. A guide that stitches a shard owned only through the transitive walk links to its own copy, with an in-document anchor that the guide numbers itself, as [Same compiled output preference](#same-compiled-output-preference) describes.

## Cross-guide resolution

The pass finds the target shard in the order [Path lookup order](./path-lookup-order.md) gives for the cross-guide rewrite.

### Index ownership

The index gives each shard one owner guide, the first of these that applies:

1. The guide whose manifest lists the shard, or the last such guide in `compileOrder` when several manifests list it
2. The first guide in `compileOrder` whose directory contains the shard
3. The first guide in `compileOrder` that compiles the shard by following a link to it

For the first rule, a manifest that links no shards lists the files that the [file-name fallback](../manifest-compile-order.md#linked-shards-and-the-file-name-fallback) compiles. Ownership by the first or second rule is canonical. [Same compiled output preference](#same-compiled-output-preference) says when a guide links its own copy of a shard whose owner is another guide.

### Same compiled output preference

When a `./` or `../` link resolves to a path present in the **assembling guide's** `slugByPath` map (the shard is co-compiled or transitively included in **this** output), cross-guide rewrite emits `#slug` or `#fragment` for that same document when:

- the index has no entry, or
- the index owner is the assembling guide, or
- the index owner is another guide but ownership is **non-canonical**, by the third [ownership rule](#index-ownership): no manifest lists the shard and no guide's directory contains it

Canonical ownership, by a manifest listing or a path in the owner's guide directory, still wins for cross-output targets. In the [compile example](#cross-guide-compile-example), the glossary's walk also stitches a copy of `review/outcomes/caching.md`, and the glossary still links it as `architecture-review.md#caching`. A shared shard outside every guide directory that several guides stitch takes an in-document `#anchor` in each of them. <!-- merlon-paths: illustrative -->

Same-output preference comes before `ignoreGuides`. A link to a shard that the assembling guide stitches takes the in-document anchor when the shard's owner is non-canonical, even when the assembling guide lists that owner in `ignoreGuides`. Such an owner is only the first guide in `compileOrder` whose walk reached the shard, so letting `ignoreGuides` win would make the link depend on that order. Merlon Docs’ own publish guides rely on it. Each lists `features` in `ignoreGuides`, and `features` is the owner of the glossary term shards only through its walk. A publish guide still links a term to the section it stitches. [`ignoreGuides` interaction](./publish-relative-links.md#ignoreguides-interaction) says how a link to a stitched shard whose canonical owner is listed compiles.

When the resolved absolute path is in the guide link index (and same-output preference does not already apply):

| Case                                                            | Rewritten target                                                                                                                 |
| --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Same compiled output as the assembling guide                    | `#slug` or `#fragment` when the link includes a fragment                                                                         |
| Different compiled output                                       | `{outputBasename}#slug` in the same directory (such as `architecture-review.md#caching`), otherwise a relative path plus `#slug` |
| Both guides in the monolith (neither sets `compile.outputFile`) | The target guide's compiled guide plus `#slug` in the linking guide's compiled guide, and `#slug` in the monolith                |
| Target guide in the monolith, linking guide a publish output    | The monolith plus `#slug`, such as `guides.md#setup-1`                                                                           |
| Target guide in `ignoreGuides`                                  | **unchanged**: keep source `.md` path (link to shard, not compiled output)                                                       |

Each `#slug` is the target heading's slug in the document the link points into. A link between two guides in the monolith compiles twice. In the linking guide's compiled guide, it targets the target guide's compiled guide, such as `b.md#topic`, with that guide's own slug, when that guide stitches the shard. Otherwise it targets the monolith, with the slug of the shard's first copy there. In the monolith, it targets the heading in the monolith, with the slug the monolith gives it. A publish output links a guide in the monolith through the monolith, with the monolith's slug.

An explicit `#fragment` is never renumbered. Compile writes it as the shard author wrote it, in every document, and [BROKEN LINK marker](../link-validation.md#broken-link-marker) says which fragments pass. So a fragment that points at a sub-heading of another guide in the monolith, such as `../a/setup.md#details`, stays a link in both documents. A fragment such as `./setup.md#setup` resolves in the target guide's compiled guide. In the monolith, that slug can belong to an earlier guide's heading with the same title. The link then points at that heading. No check catches that, because the slug exists in the monolith. A link without a fragment gets the right slug when the document it points into stitches its shard. [Link index limits](#link-index-limits) gives the slug it takes otherwise. <!-- merlon-paths: illustrative -->

### Link index limits

When the owner doesn't stitch a shard, a link into the owner's compiled guide is a dead anchor, since that file has no section for the shard. When another heading there has the same slug, such as a Setup heading for a shard titled Setup, the link points at that heading, and no check catches it. When no copy in the monolith stitches the shard, a link to it there takes the entry's `slug`, and the monolith has no section for it either. Compile marks such a link in the monolith unless another heading or section there has that slug, such as a declared `{#id}`. Link lint reports one from another output as a dead anchor unless a heading of the monolith has that slug.

Finding shards (`FIND-*.md`) use the finding id from the filename (such as `#find-004`), not the parent outcomes section slug. Broken-link marking and link lint accept the finding id as an in-document target in the output that stitches the finding, though the heading there takes its slug from its text, such as `find-004--example-finding`. On a link from another output, such as `architecture-review.md#find-004`, link lint reports the finding id as a dead anchor, because no heading in the target has it. A declared `{#id}` works the same way. To link a finding from another output, give the link the heading's slug as its fragment, such as `../review/outcomes/FIND-004.md#find-004--example-finding`. Compile keeps that fragment, and the target has a heading with that slug. <!-- merlon-paths: illustrative -->

## Cross-guide exclusions

The pass **does not** transform:

- External URLs
- Same-document `#fragment` links
- Link syntax in fenced code or in a code span
- Markdown links that do not resolve to an indexed shard
- Non-markdown paths (handled by `codeEvidence` or left unchanged)
- Links to shards in guides listed in `compile.crossGuideLinks.ignoreGuides`, other than a stitched shard that [same compiled output preference](#same-compiled-output-preference) keeps in the document (publish-relative may still rebase the unchanged shard path; see [`ignoreGuides` interaction](./publish-relative-links.md#ignoreguides-interaction))

## Cross-guide config

A minimal setup with several outputs. The index and the rewrite need only `compileOrder` and each guide's `compile.outputFile`:

```json
{
  "configVersion": "1.0.0",
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

Set on the **guide being compiled**. Links from that guide to shards of a listed guide keep source `.md` paths instead of rewriting to a `#slug` in the target guide's compiled guide or in the monolith ([ignoreGuides](../../glossary/ignore-guides.md)). [Same compiled output preference](#same-compiled-output-preference) says when a link to a shard that the guide stitches takes an in-document anchor instead. [`ignoreGuides` interaction](./publish-relative-links.md#ignoreguides-interaction) says how compile rebases a kept path, and when a `./` or bare link to a stitched shard takes `#slug`. Use when one compiled guide should link to live shard files for specific guides (such as technical reference docs that are not folded into a review bundle).

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

Glossary shard input (`glossary/terms.md`): <!-- merlon-paths: illustrative -->

```markdown
See [Caching](../review/outcomes/caching.md) in the architecture review.
```

Review shard (`review/outcomes/caching.md`), which `review/shards.md` lists: <!-- merlon-paths: illustrative -->

```markdown
# Caching

Body.
```

Compiled glossary output:

```markdown
See [Caching](architecture-review.md#caching) in the architecture review.
```

## Cross-guide multi-target (three guides)

When one guide links to shards in **two or more** other guides, each link rewrites to the output of its shard's [owner guide](#index-ownership), with the monolith cases that the table under [Same compiled output preference](#same-compiled-output-preference) gives.

Hub shard input (`glossary/terms.md`): <!-- merlon-paths: illustrative -->

```markdown
## Terms

See [Caching](../review/outcomes/caching.md) and [Deployment](../technical/deployment.md).
```

Compiled `glossary.md` (each target keeps its guide output):

```markdown
### Terms

See [Caching](architecture-review.md#caching) and [Deployment](technical-guide.md#deployment).
```

## Cross-guide ignore example (mixed compiled-output and shard links)

Same hub shard with `ignoreGuides: ["technical-guide"]` on the **glossary** guide. Compiled `glossary.md`:

```markdown
### Terms

See [Caching](architecture-review.md#caching) and [Deployment](../../technical/deployment.md).
```

Review targets use the compiled `architecture-review.md`. The ignored guide keeps its shard path, and publish-relative rewrite rebases that path relative to `_build/compiled/glossary.md`.
