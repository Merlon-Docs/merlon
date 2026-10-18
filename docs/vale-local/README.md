# Local Vale dogfood styles

This directory holds committed Vale style source for rules that are local to the Merlon Docs repository. Root `pnpm vale:sync` links these styles into `docs/styles/` and `examples/sample-guides/styles/` next to the shipped `MerlonDocs` preset style.

Keep reusable rule logic in `@merlon-docs/merlon-docs-presets`. Local styles should stay small and dogfood-only.

`MerlonDocs-PandocId` reports a Pandoc ID (`{#…}`) after a heading at error level, which fails the Vale stage of `merlon check`. The `MerlonDocs` preset style covers unlinked numbered heading mentions and dated claims in prose. See [Locale and language boundary](../features/design-constraints/locale-and-language.md).
