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

Local runs print a text summary and write HTML/lcov under each package’s `coverage/` directory (gitignored). CI runs the same command in a separate **coverage** job, appends package totals to the Actions job summary, and uploads those `coverage/` trees as artifacts. Default `pnpm test` / `pnpm check` do not collect coverage and do not enforce percentage thresholds.

## mdcp-presets

JSONC markdownlint configs plus the shippable `MDCP` Vale style (`vale/MDCP/`). Dogfood-only styles live under [`docs/vale-local/`](../vale-local/README.md). Edit preset files directly — no TypeScript build.

## Before you push

1. `pnpm run build && pnpm test`
2. `pnpm run lint && pnpm run format:check`
3. `pnpm docs:compile:repo && pnpm docs:check` if you touched `docs/` shards
4. `pnpm changeset` when [a changeset is needed](./versioning-and-releases.md#when-to-add-a-changeset)

The land gate and CI run the same core gates as `pnpm run check` (typecheck, lint, format, build, test, `docs:check`), plus:

- `pnpm run verify:peers` — confirm markdownlint-cli2 and Vale are on PATH
- `pnpm audit --audit-level=high` — dependency vulnerability scan
- `pnpm run prepare:docs` — `verify:peers` + `vale:sync` before `docs:check`
- `pnpm formal:check`: the [formal models](./formal-models.md) under `formal/alloy/`, in CI's Formal models job
- a separate **coverage** job runs `pnpm test:coverage`, appends package totals to the Actions job summary, and uploads `coverage/` artifacts (informational; no threshold enforcement)

Both also run the changeset checks (`changeset:reject-major`, `changeset:status`).
