# Design constraints

Intentional limits on what mdcp compiles, validates, and transforms.

- [Direct value bar](./direct-value-bar.md): a capability belongs in mdcp only when it adds value that hosts and ordinary tooling can't already give.
- [Enforceable rules](./enforceable-rules.md): a check can fail on every rule mdcp states, unless the rule says it is advisory.
- [md-tree integration](./md-tree-integration.md): md-tree only splits documents; mdcp's own compile assembles them, and upstream `assemble` is not used.
- [Fork criteria](./fork-criteria.md): the conditions under which mdcp would vendor its own md-tree fork.
- [Heading references](./heading-references.md): heading slugs are computed GitHub-style from compiled headings, and authors don't write Pandoc IDs.
- [Peer linters](./peer-linters.md): markdownlint, Vale and the other peer linters are opt-in tools the host repo installs. CI can require markdownlint and Vale with `--require-lint` and `--require-vale`.
- [GFM scope](./gfm-scope.md): authored docs are GFM without Pandoc or wikilink syntax, and heading recognition covers an ATX subset.
- [Locale and language boundary](./locale-and-language.md): core models GFM headings and links, while prose rules belong in Vale styles and generated wording in a compile-time locale pack.
- [Preprocessor / templating (out of scope)](./preprocessor-templating.md): mdcp has no variable substitution or template engine, so run those in a separate step before or after it.
