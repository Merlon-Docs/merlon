# Design constraints

Intentional limits on what Merlon Docs compiles, validates, and transforms.

- [Direct value bar](./direct-value-bar.md): a capability belongs in Merlon Docs only when it adds value that hosts and ordinary tooling can't already give.
- [Enforceable rules](./enforceable-rules.md): a check can fail on every rule Merlon Docs states, unless the rule says it is advisory.
- [md-tree integration](./md-tree-integration.md): md-tree only splits documents, and Merlon Docs' own compile assembles them. The page also says when Merlon Docs would vendor its own md-tree fork.
- [Peer linters](./peer-linters.md): markdownlint, Vale and the other peer linters are opt-in tools the host repo installs. CI can require markdownlint and Vale with `--require-lint` and `--require-vale`.
- [GFM scope](./gfm-scope.md): authored docs are GFM without Pandoc or wikilink syntax, and heading recognition covers an ATX subset. Heading slugs are computed GitHub-style from compiled headings, so authors don't write Pandoc IDs.
- [Locale and language boundary](./locale-and-language.md): core models GFM headings and links, while prose rules belong in Vale styles and generated wording in a compile-time locale pack.
- [Preprocessor / templating (out of scope)](./preprocessor-templating.md): Merlon Docs has no variable substitution or template engine, so run those in a separate step before or after it.
