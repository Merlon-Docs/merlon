# Peer linters

markdownlint-cli2, Vale, Prettier, markdown-link-check are **not bundled**.

Detection order: `node_modules/.bin` → PATH → skip with info. `mdcp check` skips a missing markdown-link-check without the info line.

Use `--require-lint` / `--require-vale` in CI.

**Separation of concerns:** markdownlint covers **GFM / Markdown structure** (presets provide those configs). Vale styles cover **prose / language** static analysis. The en-US rules for unlinked heading mentions and dated claims are in `@bwilliamson/mdcp-presets` (`vale/MDCP`), and a host can add other styles such as Microsoft. Core stays on protocol validation, the [Check gate](../check-gate.md) stages that don't run a peer. See [Locale and language boundary](./locale-and-language.md).
