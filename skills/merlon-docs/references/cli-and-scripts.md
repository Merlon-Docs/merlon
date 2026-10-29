# CLI commands

Merlon Docs relies on the `@merlon-docs/merlon-docs-cli` package to perform documentation operations.

## What compile / check / refs mean

| Command          | Means                                                                                                                                                                                                                                                                                   |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `merlon compile` | **Build the docs.** Merge Markdown shards into compiled guide outputs (for example under `docs/_build/`) using `merlon.config.json` and `compileOrder`. Shards are the source of truth; compiled files are generated so reviewers can read one guide file instead of many shards.       |
| `merlon check`   | **Validate the documentation tree.** Run structural checks (cross-links, orphans, compile, refs, and optional lint/prose gates). It does **not** verify that product claims are true — people and agents do that in review. Prefer this before trusting compiled output for navigation. |
| `merlon refs`    | **Cross-link registry tools** (`refs list`, `refs gen`, …). Inspect or regenerate the fragment/slug registry (for example `refs.json`) so `#` links match **compiled** headings, not hand-guessed shard titles.                                                                         |

## Why an installed CLI instead of self-contained skill engines

Compile, check, refs, and doc lint/prose are one **shared system** in `@merlon-docs/merlon-docs-core`, exposed by `@merlon-docs/merlon-docs-cli`. Putting that logic in skill bash would fork the pipeline and drift from CI validation. The skill teaches **workflow**; the packages are the **engine**.

The core packages are:

- `@merlon-docs/merlon-docs-cli` — CLI commands
- `@merlon-docs/merlon-docs-core` — compile / check / refs / lint / prose engine
- `@merlon-docs/merlon-docs-presets` — shared markdownlint / Prettier / Vale wiring

## Dependencies

- Node.js **22.13.0** or later (Node 22 LTS; see package `engines`)
- `npm install -g @merlon-docs/merlon-docs-cli` or `npm install -D @merlon-docs/merlon-docs-cli`
- Optional: Vale on `PATH` for prose (`merlon prose` / `merlon check --require-vale`)

## Commands

| CLI Command      | Invokes                                          |
| ---------------- | ------------------------------------------------ |
| `merlon compile` | Build compiled docs from shards                  |
| `merlon check`   | Validate the docs tree                           |
| `merlon fix`     | Format shards (Prettier / markdownlint auto-fix) |
| `merlon prose`   | Vale prose lint                                  |
| `merlon review`  | Report doc sprawl signals (`--json`, `--strict`) |
| `merlon refs`    | Cross-link registry: `refs list`, `refs gen`     |

Invoke these commands directly in your repository after installing the CLI:

```bash
merlon compile --config <config> --docs-root <docs-root>
merlon check --config <config> --docs-root <docs-root>
merlon refs list --config <config> --docs-root <docs-root>
merlon review --config <config> --docs-root <docs-root>
```
