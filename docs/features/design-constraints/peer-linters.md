# Peer linters

markdownlint-cli2, Vale, Prettier, markdown-link-check are **not bundled**.

Detection order: `node_modules/.bin` → PATH → skip with info. `mdcp check` skips a missing markdown-link-check without the info line.

Use `--require-lint` / `--require-vale` in CI.

**Separation of concerns:** markdownlint covers Markdown structure, and Vale styles cover prose. Core stays on protocol validation, the [Check gate](../check-gate.md) stages that don't run a peer. [Preferred homes](./locale-and-language.md#preferred-homes) says which tool checks each rule. `@bwilliamson/mdcp-presets` holds the starter markdownlint configs and the `MDCP` Vale style, and a host can add other styles such as Microsoft.
