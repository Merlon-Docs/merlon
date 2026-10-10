# Local Vale dogfood styles

This directory holds committed Vale style source for rules that are local to the mdcp repository. Root `pnpm vale:sync` links these styles into `docs/styles/` and `examples/sample-guides/styles/` next to the shipped `MDCP` preset style.

Keep reusable rule logic in `@bwilliamson/mdcp-presets`. Local styles should stay small and dogfood-only.

`MDCP-PandocId` reports a Pandoc ID (`{#…}`) after a heading at error level, which fails the Vale stage of `mdcp check`. The `MDCP` preset style covers unlinked numbered heading mentions and dated claims in prose. See [Locale and language boundary](../features/design-constraints/locale-and-language.md).
