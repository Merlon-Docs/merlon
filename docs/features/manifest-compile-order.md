# Manifest compile order

Each guide's **compile order** comes from markdown links in its manifest file: `index.md` by default, or `shards.md` when configured under `guides[].compile.manifest`. mdcp collects every link to a `.md` file in **document order** and stitches those shards in that sequence. A same-document `#slug` link also adds `slug.md` when that file exists in the guide directory. Those shards compile after the shards the manifest links by path.

Guide directories are **human source only** (`index.md`, shard files). Generated outputs (per-guide `{name}.md`, optional monolith, `.caches/refs.json`, explicit `compile.outputFile`) live under `outputDir`.

## Default behavior

A minimal manifest is a table of contents — only section links, no stray `.md` links in preamble prose:

```markdown
# Admin guide

- [Getting started](./chapter-1-getting-started.md)
```

Compile order: `chapter-1-getting-started.md` first (and only). No extra config needed.

## When manifests mix policy prose and section lists

Some guides use `index.md` as both **policy prose** (how authors should work) and **section manifest** (ordered shard list). A common pattern:

```markdown
# Compound glossary

## Acronyms and new terms

When you introduce an acronym… spell out the term and link it — e.g.
Content-Security-Policy ([CSP](04-security-sync.md#glossary-csp)).

## Sections

- [Product surfaces](01-product-surfaces.md)
- [Tenancy](02-tenancy.md)
- [Data model](03-data-model.md)
- [Security and sync](04-security-sync.md)
- [Review vocabulary](05-review-vocabulary.md)
```

### Without `sectionsHeading`

mdcp collects **all** `.md` links in file order:

| Order | Link                     | Author intent                                  |
| ----- | ------------------------ | ---------------------------------------------- |
| 1     | `04-security-sync.md`    | Example in policy prose — "link CSP like this" |
| 2     | `01-product-surfaces.md` | Section shard                                  |
| 3     | `02-tenancy.md`          | Section shard                                  |
| …     | …                        | …                                              |

Compile stitches `04-security-sync.md` **first**, then `01`, `02`, … — wrong order. The CSP link is documentation, not a directive to lead with that shard.

### With `sectionsHeading`

Set `guides[].compile.sectionsHeading` to the `##` heading that starts the real section list (without the `#` marks):

```json
{
  "name": "glossary",
  "path": "glossary",
  "compile": {
    "title": "Compound glossary",
    "sectionsHeading": "Sections",
    "outputFile": "glossary.md"
  }
}
```

mdcp only considers links **at or after** `## Sections`. Preamble example links are ignored for compile order. Order becomes `01` → `02` → `03` → `04` → `05`.

`04-security-sync.md` still compiles because it appears under `## Sections`, not because it is mentioned in the policy paragraph.

## When you need `sectionsHeading`

| Situation                                                                                                                        | `sectionsHeading`            |
| -------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| Manifest is a TOC — every `.md` link is a section                                                                                | Omit                         |
| `shards.md` lists cross-tree shards only (compiled review guides)                                                                | Usually omit                 |
| Preamble has inline `.md` links that are examples or cross-references, plus a separate ordered section list under a `##` heading | **Set** to that heading text |

The heading match is exact: `sectionsHeading` `"Sections"` matches a line that starts with `##` followed by `Sections`, not `## Section list`.

## Linked shards and the file-name fallback

Compile also follows inline `.md` links inside the shards it stitches. A guide compiles its manifest's shards plus every shard it finds by following links from shard to shard, a set the code calls `linkedSectionFiles`. Each link resolves from the directory that contains its shard, and the walk keeps a target that exists in the guide directory or under `compile.scopeRoot`. Those shards compile after the manifest's shards, in the order the walk finds them. [Cross-guide purpose](../client-core/compile-hooks/cross-guide-links.md#cross-guide-purpose) says which shards in the set get an entry in the guide link index.

| Authoring form                                                | Walk follows it |
| ------------------------------------------------------------- | --------------- |
| Inline link `[label](path.md)` or `[label](path.md#fragment)` | Yes             |
| Reference-style link `[label][ref]` with `[ref]: path.md`     | No              |
| File path in backticks, such as `` `path.md` ``               | No              |

The walk reads each shard's raw text. It also follows an inline link written in a code span or a fenced code block. The walk skips a reference-style link and a path in backticks, so either one can refer to a shard that the guide doesn't compile. No link pass rewrites either form, and the path stays as written in the compiled output.

That walk serves shards in guide subdirectories and under `compile.scopeRoot`. The manifest must link every top-level shard in the guide directory directly, because the [orphan check](./feature-catalog.md#orphan-check) reads only the manifest. A top-level shard that only another shard links still compiles, and `mdcp check` reports it as an orphan.

When the manifest links no shards, compile takes the other top-level `.md` files in the guide directory in file-name order, leaving out any `shards.md`, and the orphan check reports nothing for that guide.

## Workflow

1. Edit shard files and `index.md` link order as needed.
2. Run `mdcp compile` — there is no separate manifest sync step.
3. Run `mdcp check` — orphan validation uses the same manifest rules as compile.

Code: `manifestTextForSections` and `sectionFiles` in `packages/mdcp-core/src/compile/section-manifest.ts`.
