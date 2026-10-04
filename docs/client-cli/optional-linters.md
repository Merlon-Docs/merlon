# Optional linters

These commands use tools installed in **your** repo (not bundled with mdcp):

| Command      | Peer tool                       | Purpose                                                                   |
| ------------ | ------------------------------- | ------------------------------------------------------------------------- |
| `mdcp lint`  | `markdownlint-cli2`             | Lint shards and compiled output (GFM / Markdown structure)                |
| `mdcp prose` | `vale` (install separately)     | Prose style lint (Vale style packages; Microsoft = US English)            |
| `mdcp links` | `markdown-link-check`           | Optional HTTP URL checks (peer; not built-in internal link validation)    |
| `mdcp fix`   | `prettier`, `markdownlint-cli2` | Run `prettier --write .` then `markdownlint-cli2 --fix` (no config paths) |

`mdcp fix` does not bundle formatters. Install **Prettier** and **markdownlint-cli2** in your repo first (`node_modules/.bin` or PATH). Each step is skipped with an info message if the peer is missing.

```bash
mdcp lint --require-lint          # fail if markdownlint-cli2 is missing
mdcp prose --require-vale         # fail if Vale is missing
mdcp check --require-lint --require-vale   # CI gate with markdownlint + Vale
mdcp check --skip-vale            # structural checks only
```

`mdcp check` runs **built-in** internal link validation by default (`lint.links.enabled`). Peer `markdown-link-check` runs only when **`lint.links.config`** is set and the peer is installed. `mdcp links` always skips quietly if the peer is missing.

Install npm peers with:

```bash
npm install -D prettier markdownlint-cli2 @bwilliamson/mdcp-presets
```

Install **Vale** separately so `vale` is on your `PATH` — see [Vale installation](https://vale.sh/docs/vale-cli/installation/) (Homebrew, Chocolatey, Snap, or GitHub release). After adding a `.vale.ini`, run `vale sync` in that directory.

Wire preset paths in `mdcp.config.json` under `lint.markdownlint`. See `@bwilliamson/mdcp-presets` on npm.

A [locale pack](../glossary/locale-pack.md) is MDCP compile-time wording, not a Vale style. The **`MDCP` Vale style** in `@bwilliamson/mdcp-presets` (`vale/MDCP/`) holds the en-US prose cues. Its rules flag a numbered heading mention with no link, and `MDCP.DatedClaim` flags `as of` or `until` before an ISO date. See [Locale and language boundary](../features/design-constraints/locale-and-language.md).

## In-scope guide fileset

MDCP knows the **full fileset** it manages: registered guides in `compileOrder`, resolved via `guides[].path` or `{docsRoot}/{name}/`. Shard markdownlint and Vale prose **only touch documents in that scope** — never legacy flat `.md` files, unregistered sibling folders, or other markdown under `--docs-root` that mdcp does not compile.

| Command                                        | Default scope                                     | Out of scope (skipped)                                  |
| ---------------------------------------------- | ------------------------------------------------- | ------------------------------------------------------- |
| Shard markdownlint (`mdcp lint`, `mdcp check`) | `compileOrder` guide directories                  | Legacy flat docs, unrelated subdirs under `--docs-root` |
| Vale prose (`mdcp prose`, `mdcp check`)        | Same guide directories                            | Same                                                    |
| Compiled markdownlint                          | Compiled outputs listed in `compiledConfig` globs | Shard trees (covered by the shard pass)                 |

Optional overrides **narrow** scope further; they never widen it beyond what you explicitly list:

| Config field                    | Purpose                                                                               |
| ------------------------------- | ------------------------------------------------------------------------------------- |
| `lint.markdownlint.shardsGlobs` | Shard markdownlint paths relative to `--docs-root` (default: compileOrder guide dirs) |
| `vale.scanGlobs`                | Vale prose paths relative to `--docs-root` (default: same guide dirs)                 |

The `@bwilliamson/mdcp-presets` shard config supplies **rules and exclusions** (`!**/index.md`, `!guides.md`). **Scope always comes from the CLI** — not from preset globs.

`mdcp fix` is out of band: it runs unscoped `prettier --write .` and `markdownlint-cli2 --fix` across the repo and is not part of mdcp's guide fileset gate.
