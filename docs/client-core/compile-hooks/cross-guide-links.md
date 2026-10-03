# Cross-guide link rewriting

<!-- mdcp-paths: illustrative -->

Specification for assembly-time cross-shard and cross-guide link rewriting. Tests in `packages/mdcp-core/test/cross-guide-links.test.ts` map to the sections below (docs first, then TDD).

Multi-output consumer repos compile separate monoliths (for example `glossary.md`, `architecture-review.md`, `technical-guide.md`) from shards that span `review/`, `security/`, `features/`, and sibling guide directories. Source shards link with relative `.md` paths; compiled output must use stable in-document or cross-monolith `#slug` targets so link-fragment lint passes.

## Cross-guide purpose

At compile time, MDCP:

1. Builds a **guide link index** from every guide in `compileOrder` — each path in that guide's `linkedSectionFiles` (manifest plus transitive inline `.md` links) maps to its compiled `{guideName, outputBasename, slug}` (slug from the demoted first heading, same rules as intra-guide rewrite)
2. Rewrites **cross-guide** `.md` links per shard (using the shard path for relative resolution) before sections are stitched
3. Rewrites **publish-relative** `../` file links per shard when the guide has `compile.outputFile` — see [Publish-relative link rewriting](./publish-relative-links.md)
4. Rewrites **same-guide** section links per shard (intra-guide pass with `sourceFile`), then again on the assembled body (intra-guide pass scoped to `guideDir`)

Cross-guide handles indexed markdown between guides and co-compiled transitive targets. Publish-relative rebases remaining file paths for outputs outside the shard tree (no manual path config). Intra-guide handles same-guide section targets. These are **assembly-time passes**, not compile hooks.

## Cross-guide link matching

A link is rewritten when **all** of the following hold:

- Standard markdown link syntax: `[label](path)`
- Target path ends in `.md` (optional `#fragment`)
- Target is not `http://`, `https://`, or `#…`
- Target resolves to a shard registered in the guide link index
- Target shard's guide is **not** listed in `compile.crossGuideLinks.ignoreGuides` on the compiling guide

Cross-guide rewrite matches only links whose path starts with `./` or `../`. Same-guide section links — bare sibling paths (`topic/section.md`) and optional `./section.md` — are handled by the intra-guide pass, not cross-guide.

## Link rewrite passes (cross-guide vs intra-guide)

Assembly splits `.md` link rewriting by link shape and target scope:

| Pass            | When                     | Link shapes matched                   | Resolution base                                             |
| --------------- | ------------------------ | ------------------------------------- | ----------------------------------------------------------- |
| **Cross-guide** | Per shard, before stitch | `./` and `../` to indexed shards      | `dirname(sourceFile)`, then parent / scopeRoot / cwd        |
| **Intra-guide** | Per shard; post-assembly | Bare sibling or `./` same-guide paths | Per shard: `dirname(sourceFile)`; post-assembly: `guideDir` |

Cross-guide does **not** match bare sibling paths — those are intra-guide only. Publish-relative handles remaining `../` file links on publish outputs; see [Publish-relative link rewriting](./publish-relative-links.md).

### guideDir misaligned with shard tree

Some guides set `path` to a **compiled subdirectory** while section shards live elsewhere under the same guide tree (often one level up from `guideDir`). Example:

```text
guide/
  compiled/shards.md   ← manifest (guideDir)
  section-a.md
  topic/section-b.md
  assets/diagram.md
```

Config uses `"path": "guide/compiled"` with `"compile": { "manifest": "shards.md", … }`.

Bare sibling links authored from shards outside `guideDir` — for example `[Section B](topic/section-b.md)` in `guide/section-a.md` — resolve from **`dirname(sourceFile)`** during the per-shard intra-guide pass, not from `guideDir` alone. The post-assembly intra pass still runs against `guideDir` for any remaining same-guide links on the stitched body.

Links that must step **up and out** of the shard directory still require **`../`**. A manifest under `compiled/shards.md` links to sibling shards with paths like `../section-a.md`; bare paths cannot express parent traversal.

### Transitive section discovery

For each compiling guide, `linkedSectionFiles` is the manifest closure plus every shard reachable by walking **inline** markdown `.md` links from those files within `guideDir` and `compile.scopeRoot` (when set). The **guide link index** indexes **every** path in that set — including shards outside `guideDir` (not only paths under `guideDir` or `glossary/`).

**Ownership** when the same absolute path appears for more than one guide (first match wins):

1. Manifest owner — the guide that lists the shard in its manifest
2. Path under `guideDir` — the guide whose directory contains the shard
3. Compiling guide — the guide whose transitive walk included the shard

### What the walk follows

| Authoring form                                                | Transitive inclusion                         |
| ------------------------------------------------------------- | -------------------------------------------- |
| Inline link `[label](path.md)` or `[label](path.md#fragment)` | **Yes** — followed into `linkedSectionFiles` |
| Reference-style `[label][ref]` with `[ref]: path.md`          | **No** — not followed for inclusion          |
| Backtick path `` `path.md` ``                                 | **No** — inline code is not scanned          |

Authors who need a readable path **without** pulling the target into the compile graph can use a reference-style link or a backtick path. Reference-style and backticks skip transitive inclusion; backticks also skip link rewrite.

### Default `_build` outputs and transitive targets

With the default `outputDir` (`_build`), `./` and `../` links to transitively included shards outside `guideDir` rewrite through the guide link index and [same-output preference](#same-compiled-output-preference). Compiled `_build` output does **not** leave those co-compiled targets as raw `../file.md`.

## Cross-guide resolution

Path lookup order (relative to the **current shard** directory):

1. Relative to the shard directory (`dirname(sourceFile)`)
2. Relative to the shard parent directory
3. `compile.scopeRoot` when set on the compiling guide
4. `process.cwd()` and its parent

### Same compiled output preference

When a `./` or `../` link resolves to a path present in the **assembling guide's** `slugByPath` map (the shard is co-compiled or transitively included in **this** output), cross-guide rewrite emits `#slug` or `#fragment` for that same document when:

- the index has no entry, or
- the index owner is the assembling guide, or
- the index owner is another guide but ownership is **non-canonical** (transitive `scopeRoot` inclusion only — not a manifest listing and not under that owner's `guideDir`)

Canonical ownership (manifest or path under `guideDir`) still wins for cross-output targets. Example: a glossary hub that transitively reaches a finding under `review/` keeps `architecture-review.md#find-004` even if the finding body was also pulled into the glossary compile graph. Multi-guide repos that only co-include a shared shard outside every `guideDir` keep in-document `#anchor` targets in each assembling output.

When the resolved absolute path is in the guide link index (and same-output preference does not already apply):

| Case                                             | Rewritten target                                                        |
| ------------------------------------------------ | ----------------------------------------------------------------------- |
| Same compiled output as the assembling guide     | `#slug` or `#fragment` when the link includes a fragment                |
| Different compiled output (`compile.outputFile`) | `{outputBasename}#slug` (for example `architecture-review.md#find-004`) |
| Monolith output (no per-guide `outputFile`)      | `#slug`                                                                 |
| Target guide in `ignoreGuides`                   | **unchanged** — keep source `.md` path (link to shard, not monolith)    |

Finding shards (`FIND-*.md`) use the finding id from the filename (for example `#find-004`), not the parent outcomes section slug.

## Cross-guide exclusions

The pass **does not** transform:

- External URLs
- Same-document `#fragment` links
- Markdown links that do not resolve to an indexed shard
- Non-markdown paths (handled by `codeEvidence` or left unchanged)
- Links to shards in guides listed in `compile.crossGuideLinks.ignoreGuides` (publish-relative may still rebase the unchanged shard path for publish outputs — see [Publish-relative link rewriting](./publish-relative-links.md))

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

Set on the **guide being compiled**. Guide names in this list keep source `.md` paths for cross-guide links instead of rewriting to that guide's monolith `#slug` target ([ignoreGuides](../../glossary/ignore-guides.md)). Use when one compiled guide should link to live shard files for specific guides (for example technical reference docs that are not folded into a review bundle).

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

## Cross-guide ignore example (mixed monolith and shard links)

Same hub shard with `ignoreGuides: ["technical-guide"]` on the **glossary** guide:

```markdown
## Terms

See [FIND-004](architecture-review.md#find-004) and [Deployment](../technical/deployment.md).
```

Review targets use the compiled monolith; ignored guides keep shard paths. Tests in `packages/mdcp-core/test/cross-guide-links.test.ts` cover index entries, per-link routing, `ignoreGuides`, and end-to-end compile.
