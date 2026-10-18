# Packages and tests

## merlon-docs-core

Library source: [`packages/merlon-docs-core/src/`](../../packages/merlon-docs-core/src/).

| Area                                       | Path                          | CLI command                           |
| ------------------------------------------ | ----------------------------- | ------------------------------------- |
| Config schema, loading and path resolution | `src/config/`                 | all except `fix`                      |
| Compile                                    | `src/compile/`                | `compile`                             |
| Section list, assembly and write           | `src/compile/assemble.ts`     | `compile`                             |
| Per-shard compile hooks                    | `src/compile/hooks/`          | config-driven                         |
| Markdown helpers                           | `src/markdown/`               | shared                                |
| Locale packs                               | `src/locale/`                 | shared                                |
| Refs and slugs                             | `src/refs/`                   | `refs-gen`, `refs-check`, `refs-list` |
| Validation                                 | `src/validate/`, `src/links/` | `check`                               |
| Orphan validation                          | `src/validate/orphans.ts`     | `check`                               |
| Sprawl review                              | `src/validate/review.ts`      | `review`                              |
| Shard split orchestration                  | `src/shard/orchestrator.ts`   | `shard`                               |
| Peer linter binary resolution              | `src/peers/resolve.ts`        | `lint`, `prose`, `links`, `fix`       |

`merlon check` runs every area in the table except shard split and sprawl review. The `lint`, `links`, `refs-gen` and `refs-check` commands also compile before they run, so they use the compile rows too. Start with `assemble.ts` and `cli.ts` if you are tracing a compile from config to disk. The `compile` command in `cli.ts` calls the CLI's `compile-workspace.ts`, which calls `assemble.ts`.

The shared heading and link helpers in `src/markdown/` and `src/refs/` are **language-agnostic**. They include `parseHeading`, which reads ATX headings as [GFM scope](../features/design-constraints/gfm-scope.md#headings) defines them, and a GitHub-style **slugify** on plain heading text. Compile-time wording is in `src/locale/locales/`, one BCP 47 JSON file per locale. Peer Vale checks prose cues and Pandoc IDs, as [Locale and language boundary](../features/design-constraints/locale-and-language.md) describes.

```bash
pnpm --filter @merlon-docs/merlon-docs-core test
pnpm --filter @merlon-docs/merlon-docs-core run typecheck
```

Tests live under `packages/merlon-docs-core/test/`. Integration tests invoke the built CLI against `examples/sample-guides/`.

`merlon.config.schema.json` is the editor schema for `merlon.config.json`. It is generated: `pnpm build` runs `scripts/generate-config-schema.mjs` after tsup, which writes the file from the zod schema in `src/config/schema.ts`, descriptions included. Don't edit the JSON file. Change a key, its default or its description in `src/config/schema.ts`, run `pnpm build` and commit both files. CI, the land gate and the pre-push hook run `git diff --exit-code` after the build, so a stale copy fails them.

## merlon-docs-cli

Thin [CAC](https://github.com/cacjs/cac) wrapper around `merlon-docs-core`. Source: [`packages/merlon-docs-cli/src/cli.ts`](../../packages/merlon-docs-cli/src/cli.ts).

```bash
pnpm --filter @merlon-docs/merlon-docs-cli run build
node packages/merlon-docs-cli/dist/cli.js --help
```

## Spec-to-test map

Each spec shard below is written first, and the tests in its row follow the shard's sections. When a change alters what one of these specs requires, it edits the tests in the same row.

| Spec shard                                                                                | Tests                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [codeEvidence](../client-core/compile-hooks/code-evidence.md)                             | `packages/merlon-docs-core/test/code-evidence.test.ts`; the fenced code tests in `packages/merlon-docs-core/test/links.test.ts` also cover [codeEvidence link matching](../client-core/compile-hooks/code-evidence.md#codeevidence-link-matching)                                                                                                                                                                                                                                                             |
| [inlineInserts](../client-core/compile-hooks/inline-inserts.md)                           | `packages/merlon-docs-core/test/inline-inserts.test.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| [stripAnchors](../client-core/compile-hooks/strip-anchors.md)                             | `packages/merlon-docs-core/test/anchors.test.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| [Cross-guide link rewriting](../features/compile-pipeline/cross-guide-links.md)           | `packages/merlon-docs-core/test/cross-guide-links.test.ts`; the fenced code tests in `packages/merlon-docs-core/test/links.test.ts` also cover [cross-guide link matching](../features/compile-pipeline/cross-guide-links.md#cross-guide-link-matching) and [cross-guide exclusions](../features/compile-pipeline/cross-guide-links.md#cross-guide-exclusions)                                                                                                                                                |
| [Publish-relative link rewriting](../features/compile-pipeline/publish-relative-links.md) | `packages/merlon-docs-core/test/publish-links.test.ts`, `packages/merlon-docs-core/test/links.test.ts` and `packages/merlon-docs-core/test/guide-output-path.test.ts`; `packages/merlon-docs-core/test/cross-guide-links.test.ts` for the exclusion of cross-guide links and the [`ignoreGuides` interaction](../features/compile-pipeline/publish-relative-links.md#ignoreguides-interaction); `packages/merlon-docs-core/test/code-evidence.test.ts` for the exclusion of links that `codeEvidence` rebased |
| [Check gate](../features/check-gate.md)                                                   | `packages/merlon-docs-cli/test/cli.smoke.test.ts` and `packages/merlon-docs-cli/test/coverage.smoke.test.ts`                                                                                                                                                                                                                                                                                                                                                                                                  |
| [Monolith link lint](../features/monolith-link-lint.md)                                   | `packages/merlon-docs-core/test/links.test.ts` and `packages/merlon-docs-cli/test/cli.smoke.test.ts`                                                                                                                                                                                                                                                                                                                                                                                                          |
| [Compile output backup](../features/compile-output-backup.md)                             | `packages/merlon-docs-core/test/compile-backup.test.ts` and `packages/merlon-docs-cli/test/cli.smoke.test.ts`                                                                                                                                                                                                                                                                                                                                                                                                 |
| [Path resolution in prose](../features/path-resolution.md)                                | `packages/merlon-docs-core/test/path-probe.test.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| [Built-in link validation](../features/link-validation.md)                                | `packages/merlon-docs-core/test/links.test.ts`, `packages/merlon-docs-core/test/cross-guide-links.test.ts`, `packages/merlon-docs-core/test/guide-output-path.test.ts`, `packages/merlon-docs-core/test/source-path-links.test.ts` and `packages/merlon-docs-cli/test/cli.smoke.test.ts`                                                                                                                                                                                                                      |

## What a test checks

A test runs our code on input the test controls and checks what our code does with it: a return value, a written file, an exit code, or a line in one of our own documented output formats. Before writing a test, name the behavior of Merlon Docs it protects. When the only answer is that some text is still that text, don't write it.

Don't write tests that check these things, because none of them is our code's behavior:

- **The text of a committed file.** For example, a workflow, git hook, `.vale.ini`, preset, README, docs page, JSON schema file or locale file contains some string or value. Reviewers and `merlon check` cover files.
- **A value that changes by design.** For example, our own package versions, the current date, or a host path such as a temp directory, which macOS reaches through the `/var` → `/private/var` symlink. Derive an expected value from the test's own input instead.
- **Another tool's output.** For example, the wording, banners, limits or version-specific behavior of Vale, markdownlint-cli2, npm, git or a library such as zod. Check our own lines about the tool's result instead, such as our hint or our `peer exited non-zero` line.
- **That a script runs.** Running a script or command only to see that it exits 0 or prints a line doesn't test its logic. Move the logic into a function, the way `scripts/lib/` does, and test the function on fixed inputs.
- **How long a run takes.** A wall-clock limit such as 50 ms passes or fails with the machine's speed. Check the growth rate in a [benchmark](#growth-benchmarks) instead.
- **The shape of the code.** For example, that a module does or doesn't export a name, that a constant equals a literal, or how many times an internal function was called.

When a test like this fails, delete it, or rewrite it to check behavior. Don't widen it to accept the new value.

## Growth benchmarks

`packages/merlon-docs-core/bench/` holds growth benchmarks: checks that a reader's running time grows in proportion to its input, so a crafted line can't make it take the square of the line's length. CodeQL's `js/polynomial-redos` alerts describe that kind of input, and [Safe Markdown parsing](./safe-markdown-parsing.md) explains the readers they guard.

Each benchmark calls `expectLinearGrowth` from `bench/helpers/growth.ts` with a function that builds the input for a size `n` and returns the call to time. The helper times the call at `n / 4` and at `n`, taking the fastest of five runs at each size, and fails when the time grows 10× or more. A linear reader grows about 4×, and a quadratic one about 16×. Times under 1 ms count as 1 ms, so noise can't fail a fast reader. Pick `n` so that a quadratic reader takes over a second at `n`. The ratio decides the result, not the machine's speed.

The benchmarks are slower than the unit tests, so `pnpm test`, the git hooks and the land gate leave them out. CI's Benchmarks job runs them on every ready pull request. To run them locally:

```bash
pnpm bench
```

`pnpm bench:dogfood` and `pnpm bench:context-size` are a different kind of benchmark: measurements of this repository's own docs that a developer runs by hand, as [Benchmarks](./benchmarks.md) describes.

## Test code coverage

Vitest coverage for `@merlon-docs/merlon-docs-core` and `@merlon-docs/merlon-docs-cli` (not root `scripts/` tests). This is **test** coverage of TypeScript sources — distinct from the [documentation coverage scan](../features/coverage-scan.md). Note that CLI package totals are understated because smoke tests drive the built binary out-of-process (V8 coverage does not follow that subprocess).

```bash
pnpm test:coverage
```

Local runs print a text summary and write HTML/lcov under each package’s `coverage/` directory (gitignored). In CI a separate **coverage** job runs the same command. It adds package totals to the Actions job summary and uploads those `coverage/` trees as artifacts. The job is informational: it has no percentage threshold, so lower coverage doesn't fail it. Default `pnpm test` / `pnpm check` don't collect coverage at all, so a threshold can't apply to them either.

## merlon-docs-presets

JSONC markdownlint configs plus the shippable `MerlonDocs` Vale style (`vale/MerlonDocs/`). Dogfood-only styles live under [`docs/vale-local/`](../vale-local/README.md). Edit preset files directly — no TypeScript build.

## Repository script tests

Most `*.test.mjs` files under `scripts/` test the script beside them, and `pnpm test` runs them all after the package tests, as [Daily commands](./local-setup.md#daily-commands) lists. The site's script tests run with the package tests, and [Build and preview](./docs-site.md#build-and-preview) gives the command that runs them alone.

A test that runs git in a throwaway repository removes every `GIT_*` variable from `process.env` first, as `scripts/lib/consumed-changesets.test.mjs` does. A git hook exports `GIT_INDEX_FILE`, and other git-driven runs can export more `GIT_*` variables; while one is set, git in the throwaway repository reads the checkout that runs the tests.

## Before you push

1. `pnpm run build && pnpm test`
2. `pnpm run lint && pnpm run format:check`
3. Run the docs commands of [Edit workflow](./docs-dogfooding.md#edit-workflow) step 3 if you touched `docs/` shards or a file that `standaloneGuides` registers, such as `AGENTS.md` or `skills/**/*.md`
4. `pnpm changeset` when [a changeset is needed](./versioning-and-releases.md#when-to-add-a-changeset)

CI and the land gate run more checks than these steps. [CI and the land gate](./local-setup.md#ci-and-the-land-gate) lists them.
