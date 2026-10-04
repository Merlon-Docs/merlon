# Packages and tests

## mdcp-core

Library source: [`packages/mdcp-core/src/`](../../packages/mdcp-core/src/).

| Area               | Path                          |
| ------------------ | ----------------------------- |
| Config schema      | `src/config/`                 |
| Compile / assemble | `src/compile/`                |
| Markdown helpers   | `src/markdown/`               |
| Locale packs       | `src/locale/`                 |
| Refs / slugs       | `src/refs/`                   |
| Validation         | `src/validate/`, `src/links/` |
| Shard (split)      | `src/shard/`                  |
| Peer linters       | `src/peers/`                  |

Shared heading/link helpers live under `src/markdown/` and `src/refs/` (`parseHeading` with ATX kind today, plain-text cleanup, GitHub-style **slugify**). They stay **language-agnostic**. Heading recognition is an ATX subset of GFM — see [GFM scope](../features/design-constraints/gfm-scope.md#headings). Compile-time wording lives under `src/locale/` (one BCP 47 JSON file per locale). Peer Vale owns prose cues and Pandoc ID authoring opinion — see [Locale and language boundary](../features/design-constraints/locale-and-language.md).

```bash
pnpm --filter @bwilliamson/mdcp-core test
pnpm --filter @bwilliamson/mdcp-core run typecheck
```

Tests live under `packages/mdcp-core/test/`. Integration tests invoke the built CLI against `examples/sample-guides/`.

`mdcp.config.schema.json` is the editor schema for `mdcp.config.json`, maintained by hand. `test/config-json-schema.test.ts` compares it with the zod schema in `src/config/schema.ts` and fails when they disagree on any key, required key, type, enum or bound, or on a default the JSON declares. A commit that changes a config key has to update both files to pass it.

## mdcp-cli

Thin [CAC](https://github.com/cacjs/cac) wrapper around `mdcp-core`. Source: [`packages/mdcp-cli/src/cli.ts`](../../packages/mdcp-cli/src/cli.ts).

```bash
pnpm --filter @bwilliamson/mdcp-cli run build
node packages/mdcp-cli/dist/cli.js --help
```

## Test code coverage

Vitest coverage for `@bwilliamson/mdcp-core` and `@bwilliamson/mdcp-cli` (not root `scripts/` tests). This is **test** coverage of TypeScript sources — distinct from the [documentation coverage scan](../features/coverage-scan.md). Note that CLI package totals are understated because smoke tests drive the built binary out-of-process (V8 coverage does not follow that subprocess).

```bash
pnpm test:coverage
```

Local runs print a text summary and write HTML/lcov under each package’s `coverage/` directory (gitignored). In CI a separate **coverage** job runs the same command. It adds package totals to the Actions job summary and uploads those `coverage/` trees as artifacts. The job is informational: it has no percentage threshold, so lower coverage doesn't fail it. Default `pnpm test` / `pnpm check` don't collect coverage at all, so a threshold can't apply to them either.

## mdcp-presets

JSONC markdownlint configs plus the shippable `MDCP` Vale style (`vale/MDCP/`). Dogfood-only styles live under [`docs/vale-local/`](../vale-local/README.md). Edit preset files directly — no TypeScript build.

## Before you push

1. `pnpm run build && pnpm test`
2. `pnpm run lint && pnpm run format:check`
3. `pnpm docs:compile:repo && pnpm docs:check` if you touched `docs/` shards
4. `pnpm changeset` when [a changeset is needed](./versioning-and-releases.md#when-to-add-a-changeset)

CI and the land gate run more checks than these steps. [CI and the land gate](./local-setup.md#ci-and-the-land-gate) lists them.
