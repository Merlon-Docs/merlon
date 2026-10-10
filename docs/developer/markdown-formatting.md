# Markdown formatting

Shards in this repository follow these Markdown conventions. Where a feature shard defines the rule behind a convention, the convention links to it.

## Headings and links

Shards are GFM, and their headings use the ATX form. [GFM scope](../features/design-constraints/gfm-scope.md#headings) sets that authoring contract and the heading subset compile recognizes. Link a heading by the slug of its text, as that section says. Don't write a Pandoc ID (`{#…}`) after a heading: the local Vale rule `MDCP-PandocId` fails `pnpm docs:check` on one.

Write each [cross-link](../glossary/cross-link.md) in the form that [No placeholder links](../features/link-validation.md#no-placeholder-links) gives, and link a new file in the change that adds it. Link it from its directory's `index.md` or from the guide's manifest, and list a new glossary entry in `glossary/index.md`. Until something stitched links the file, `pnpm docs:check` doesn't read its links, as [Check gate stages](../features/check-gate.md#check-gate-stages) says, and the [site sync](./docs-site.md#content-comes-from-shards) in `pnpm site:build` fails on its dead links.

## Tables

Prettier aligns each GFM table in a shard with the root `.prettierrc.json`, which sets `proseWrap` to `preserve`. Compile re-aligns a table the same way after it rewrites a link in the table, and [Tables after link rewriting](../client-core/compile-hooks/tables-after-link-rewriting.md) says which tables it leaves out of line. In a shard's tables:

- When a link changes width in a table whose cells all fill their columns, compile leaves the table as written, and `pnpm format:check` fails on it in a committed output such as `README.md`. Shorten the text of one cell so Prettier pads it. `pnpm format:check` skips `docs/_build/`, which `.gitignore` lists.
- Keep explicit `{#id}` anchors out of table cells, and keep link syntax to a repository file out of code spans in table cells.

Give the first link to an insert in a guide a paragraph of its own, ahead of any table cell that links to the insert, as [inlineInserts first inline](../client-core/compile-hooks/inline-inserts.md#inlineinserts-first-inline) says.

## Formatting and linting

`pnpm format` runs Prettier on the repository with the settings in the root `.prettierrc.json`, and `pnpm format:check` fails on a file that Prettier would change. `pnpm docs:check` runs markdownlint and Vale on the docs, and [Linting docs](./docs-dogfooding.md#linting-docs) says which configs and styles it uses. The starter markdownlint configs and the `MDCP` Vale style come from `@bwilliamson/mdcp-presets`, which has no Prettier config.

---

_Note: GitHub and GitHub Flavored Markdown are trademarks of GitHub, Inc. This project is not affiliated with, sponsored by, or endorsed by GitHub, Inc._
