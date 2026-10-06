# CLI commands

MDCP relies on the `@bwilliamson/mdcp-cli` package to perform documentation operations.

## What compile / check / refs mean

| Command        | Means                                                                                                                                                                                                               |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `mdcp compile` | **Build the docs.** Merge Markdown shards into compiled guide outputs (for example under `docs/_build/`) using `mdcp.config.json` and `compileOrder`. Shards are the source of truth; compiled files are generated. |
| `mdcp check`   | **Validate the documentation tree.** Run structural checks (cross-links, orphans, and optional lint/prose gates) so shards and compiled output stay trustworthy. Prefer this before trusting compiled docs.         |
| `mdcp refs`    | **Cross-link registry tools** (`refs list`, `refs gen`, …). Inspect or regenerate the fragment/slug registry (for example `refs.json`) so `#` links match **compiled** headings, not hand-guessed shard titles.     |

## Why an installed CLI instead of self-contained skill engines

Compile, check, refs, and doc lint/prose are one **shared system** in `@bwilliamson/mdcp-core`, exposed by `@bwilliamson/mdcp-cli`. Putting that logic in skill bash would fork the pipeline and drift from CI validation. The skill teaches **workflow**; the packages are the **engine**.

The core packages are:

- `@bwilliamson/mdcp-cli` — CLI commands
- `@bwilliamson/mdcp-core` — compile / check / refs / lint / prose engine
- `@bwilliamson/mdcp-presets` — shared markdownlint / Prettier / Vale wiring

## Dependencies

- Node.js **18+**
- `npm install -g @bwilliamson/mdcp-cli` or `npm install -D @bwilliamson/mdcp-cli`
- Optional: Vale on `PATH` for prose (`mdcp prose` / `mdcp check --require-vale`)

## Commands

| CLI Command    | Invokes                                          |
| -------------- | ------------------------------------------------ |
| `mdcp compile` | Build compiled docs from shards                  |
| `mdcp check`   | Validate the docs tree                           |
| `mdcp fix`     | Format shards (Prettier / markdownlint auto-fix) |
| `mdcp prose`   | Vale prose lint                                  |
| `mdcp review`  | Report doc sprawl signals (`--json`, `--strict`) |

Invoke these commands directly in your repository after installing the CLI.
