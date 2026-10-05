# Markdown formatting

## Base Requirement

When contributing documentation, rely on **simple GFM (GitHub Flavored Markdown)** as the standard.

## Open Structure

We use an unopinionated, flexible document structure. The goal is to keep the authoring experience simple and accessible. You do not need to adhere to complex metadata schemas or strict structural hierarchies when writing documentation shards.

## Strict Link Validity

While we are unopinionated about document structure, we are **strict about links**.

- All [cross-links](../glossary/cross-link.md) must be valid and point to existing files or headings.
- Prefer GitHub-style heading slugs from heading text. Do not author Pandoc IDs (`{#…}` after a heading).
- If a link is invalid, the CI and documentation checks will fail.
- Do not create links to files that do not exist yet. If you need to indicate a placeholder, comment it out or write `(TBD)`.

For more details on the link validation rules, please consult the [Format specification](../features/protocol/format-specification.md).

## Tables

A table's cells can contain links, in a list item or a blockquote too. Prettier aligns each GFM table in a shard, and compile can rewrite a link to a target of another length. Compile then re-aligns the table as Prettier prints it with this repo's `proseWrap` setting, `preserve`. The compiled table passes markdownlint's MD060 rule. [Tables after link rewriting](../client-core/compile-hooks/index.md#tables-after-link-rewriting) says which tables compile re-aligns.

Compile leaves a table out of line, or MD060 flags it, in these cases:

- Each cell of the table fills its column in the shard. Compile treats a table as compact unless some cell pads its text with more than one space, and it leaves a compact table as written when a link in it changes width. Shorten the text of one cell so Prettier pads it. `pnpm format:check` runs Prettier on the compiled outputs that the repo commits, such as `README.md`, and fails on such a table there. It skips `docs/_build/`, which `.gitignore` lists.
- A cell contains an explicit `{#id}` anchor. Compile strips the anchor and doesn't re-align the table. Keep these anchors out of table cells.
- A cell contains link syntax to a repository file inside a code span. `codeEvidence` rewrites that link's path for the output and can add a line fragment, and compile doesn't re-align the table after that change. Keep such links out of table cells.
- A cell without a link contains text that Prettier and markdownlint measure differently, such as Hindi or pointed Hebrew. MD060 flags the table in the shard, and it flags the compiled table too, whether or not compile re-aligns it.

Give the first link to an [insert](../client-core/compile-hooks/inline-inserts.md) in a guide a paragraph of its own, ahead of any table cell that links to the insert. Compile replaces that link with the insert's heading and body, which breaks a sentence or a table around it. See [inlineInserts first inline](../client-core/compile-hooks/inline-inserts.md#inlineinserts-first-inline).

## Formatting and Linting

To help avoid formatting errors and enforce consistent style, we recommend using `@bwilliamson/mdcp-presets`. These presets configure tools like Prettier and `markdownlint-cli2` to handle whitespace, indentation, and common styling issues automatically. For configuration details, see [Optional Linters](../client-cli/optional-linters.md).

---

_Note: GitHub and GitHub Flavored Markdown are trademarks of GitHub, Inc. This project is not affiliated with, sponsored by, or endorsed by GitHub, Inc._
