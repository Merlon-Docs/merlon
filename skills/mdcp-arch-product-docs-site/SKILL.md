---
name: mdcp-arch-product-docs-site
description: >-
  Documentation system archetype for product docs sites (MkDocs, Docusaurus,
  VitePress): keep human-facing docs maintainable as features keep shipping —
  MDCP shards stay the authoring source of truth, site generators publish
  downstream. Use when building docs-as-code pipelines, documentation systems
  for product sites, or when users mention MkDocs, Docusaurus, VitePress, or
  publishing documentation to the web.
license: MIT
compatibility: >-
  Requires Node.js 18+ for @bwilliamson/mdcp-cli (docs compile,
  validate, and cross-link registry commands). Skill scripts are thin
  wrappers; they do not replace the CLI. Install the mdcp parent skill first.
metadata:
  author: betsalel-williamson
  internal: true
  version: '0.7.2'
  openclaw:
    category: 'documentation'
---

# MDCP Archetype: Product Docs Site

For products that publish human-facing docs via **MkDocs, Docusaurus, VitePress**, or similar while a sharded MDCP documentation system remains the authoring source of truth — so site navigation can grow without turning the authoring tree into a monolith.

## Layout

```text
docs/
  extensions/
    publish-pipeline.md         # how compiled GFM feeds the site generator
  features/
  client/                         # end-user guide (also site nav source)
  developer/
site/                             # downstream publish (not MDCP source of truth)
```

## Two outputs, one shard tree

| Output       | Consumer                 | Generated                                      |
| ------------ | ------------------------ | ---------------------------------------------- |
| MDCP compile | Agents, CI, `mdcp check` | `guides.md`, package READMEs                   |
| Site build   | Human readers on the web | MkDocs/Docusaurus (downstream of compiled GFM) |

Shards stay GFM. A `format-*` extension documents heading rules, admonition mapping, and link policies for your chosen site generator.

## Formatting extensions

See `format-*` skills for the formatting extension slot and naming (e.g., `mdcp-format-docusaurus`, `mdcp-format-mkdocs`). Product teams add a `docusaurus-mapping.md` shard (or similar) under `docs/extensions/` locally when proprietary theme rules apply.

## Agent workflow

1. Read the parent `mdcp` skill.
2. Load task prompt with `WORK_ITEM` via `mdcp` subagent intake questions.
3. Edit `client/` and `features/` shards.
4. Run `mdcp check` before PR; site CI runs after compile.
