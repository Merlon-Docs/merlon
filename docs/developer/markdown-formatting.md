# Markdown formatting

Shards in this repository follow these Markdown conventions. Where a feature shard defines the rule behind a convention, the convention links to it.

## Headings and links

Shards are GFM, and their headings use the ATX form. [GFM scope](../features/design-constraints/gfm-scope.md#headings) sets that authoring contract and the heading subset compile recognizes. Link a heading by the slug of its text, as that section says. Don't write a Pandoc ID (`{#…}`) after a heading: the local Vale rule `MDCP-PandocId` fails `pnpm docs:check` on one.

Write each [cross-link](../glossary/cross-link.md) in the form that [No placeholder links](../features/link-validation.md#no-placeholder-links) gives, and link a new file in the change that adds it. Link it from its directory's `index.md` or from the guide's manifest, and list a new glossary entry in `glossary/index.md`. Until something stitched links the file, `pnpm docs:check` doesn't read its links, as [Check gate stages](../features/check-gate.md#check-gate-stages) says, and the [site sync](./docs-site.md#content-comes-from-shards) in `pnpm site:build` fails on its dead links.

## Tables

A table's cells can contain links, in a list item or a blockquote too. Prettier aligns each GFM table in a shard, and compile can rewrite a link to a target of another length. Compile then re-aligns the table as Prettier prints it with this repo's `proseWrap` setting, `preserve`. The compiled table passes markdownlint's MD060 rule. [Tables after link rewriting](../client-core/compile-hooks/tables-after-link-rewriting.md) says which tables compile re-aligns.

Compile leaves a table out of line, or MD060 flags it, in these cases:

- Each cell of the table fills its column in the shard. Compile treats a table as compact unless some cell pads its text with more than one space, and it leaves a compact table as written when a link in it changes width. Shorten the text of one cell so Prettier pads it. `pnpm format:check` runs Prettier on the compiled outputs that the repo commits, such as `README.md`, and fails on such a table there. It skips `docs/_build/`, which `.gitignore` lists.
- A cell contains an explicit `{#id}` anchor. Compile strips the anchor and doesn't re-align the table. Keep these anchors out of table cells.
- A cell shows the link syntax of an [insert](../client-core/compile-hooks/inline-inserts.md) in a code span. `inlineInserts` rewrites that link as it does outside code, and compile doesn't re-align the table after that change. Keep such examples out of table cells.
- A cell without a link contains text that Prettier and markdownlint measure differently, such as Hindi or pointed Hebrew. MD060 flags the table in the shard, and it flags the compiled table too, whether or not compile re-aligns it.

Give the first link to an [insert](../client-core/compile-hooks/inline-inserts.md) in a guide a paragraph of its own, ahead of any table cell that links to the insert. Compile replaces that link with the insert's heading and body, which breaks a sentence or a table around it. See [inlineInserts first inline](../client-core/compile-hooks/inline-inserts.md#inlineinserts-first-inline).

## Formatting and linting

`pnpm format` runs Prettier on the repository with the settings in the root `.prettierrc.json`, and `pnpm format:check` fails on a file that Prettier would change. `pnpm docs:check` runs markdownlint and Vale on the docs, and [Linting docs](./docs-dogfooding.md#linting-docs) says which configs and styles it uses. The starter markdownlint configs and the `MDCP` Vale style come from `@bwilliamson/mdcp-presets`, which has no Prettier config.

---

_Note: GitHub and GitHub Flavored Markdown are trademarks of GitHub, Inc. This project is not affiliated with, sponsored by, or endorsed by GitHub, Inc._
