# Preprocessor / templating (out of scope)

Merlon Docs does not run **preprocessor** or **templating** steps on shard source — no variable substitution, conditional blocks, parameterized partial includes, or other macro-style transforms before or after compile.

Those concerns belong in a separate tool or pipeline stage in the consumer repo:

```text
preprocess (optional) → merlon compile / check → postprocess (optional)
```

Run preprocessing **before** shards are authored or committed (or regenerate shards from templates in CI). Run postprocessing **after** Merlon Docs produces compiled output when you need transforms on the assembled artifact.

**Out of scope examples:**

- `{{variable}}` / `{{ env.VAR }}` substitution in shard bodies
- Template engines (Handlebars, Nunjucks, Jinja-style `{% if %}` blocks)
- Parameterized partial includes beyond Merlon Docs’ captioned insert inlining ([`inlineInserts`](../../client-core/compile-hooks/inline-inserts.md))
- Build-time code generation that mutates shard markdown prior to `merlon compile`

**Not compile hooks:** [`guides[].compile.hooks`](../../client-core/compile-hooks/index.md) assemble [authored GFM](../../glossary/authored-gfm.md) — link rewrites, insert inlining, and similar — not a template engine.

**Non-goals:** no built-in variable engine, template parser, or preprocessor hook API in Merlon Docs core.

Part of [Design constraints](./index.md).
