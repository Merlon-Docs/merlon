# API — Config

| Export                                                                                 | Purpose                                                                     |
| -------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `loadConfig(path, configBase)`                                                         | Load and validate `mdcp.config.json` (`path` is resolved from `configBase`) |
| `resolveOutputPath`, `resolveRefsPath`, `resolveGuideDir`, `defaultGuideOutputFile`    | Path resolvers for docs root and `outputDir`                                |
| `getGuideConfig`, `guideScanDirs`, `shardLintPaths`                                    | In-scope guide fileset and shard lint helpers                               |
| `MdcpConfigSchema`, `MdcpConfig`, `MdcpConfigInput`, `GuideConfig`, `GuideConfigInput` | Zod schema and types                                                        |
| `DEFAULT_COMPILE_HOOKS`, `resolveCompileHooks`                                         | Default built-in hook pipeline and guide-level resolution                   |

## Path resolution: `configBase` vs docs root

| Concern                    | Base                          | Example                                                                          |
| -------------------------- | ----------------------------- | -------------------------------------------------------------------------------- |
| Finding `mdcp.config.json` | `configBase` (invocation dir) | `--config docs/mdcp.config.json` → `<repo>/docs/mdcp.config.json`                |
| Guide shards (default)     | Docs root (`--docs-root`)     | `resolveGuideDir('features', config, docsRoot)` → absolute `<docsRoot>/features` |
| `outputDir`                | Docs root                     | `_build` → `<docsRoot>/_build`                                                   |
| All generated paths        | `outputDir`                   | `features.md` → `<docsRoot>/_build/features.md`; `.caches/refs.json` for refs    |

All generated paths use `resolveUnderOutputDir(docsRoot, outputDir, file)` — relative to `outputDir` unless `file` is absolute. Details: [API — Refs](./api-refs-validation.md).

```typescript
import { loadConfig, resolveGuideDir } from '@bwilliamson/mdcp-core';

const config = loadConfig('docs/mdcp.config.json', process.cwd());
const featuresDir = resolveGuideDir('features', config, join(process.cwd(), 'docs'));
```

Pass `process.cwd()` as `configBase` for `loadConfig`. Pass the docs root as `docsRoot` to `resolveGuideDir`, `resolveOutputPath`, and `resolveRefsPath`.

`resolveGuideDir` and `guideScanDirs` return absolute paths. A relative `docsRoot` such as `docs` resolves against the process cwd. The CLI runs markdownlint-cli2 and Vale with the docs root as their cwd, where a relative `docs/features` would name `docs/docs/features`, a directory that doesn't exist.

`shardLintPaths` returns paths for markdownlint-cli2 running with the docs root as its cwd, as the CLI runs it. Run markdownlint-cli2 from the docs root with them. From any other cwd, markdownlint-cli2 resolves the relative paths against that directory, so it misses the guide shards and lints the wrong files or none. It returns most `lint.markdownlint.shardsGlobs` entries as written, so a negated entry still excludes files. A `.` entry comes back as `**`, so markdownlint-cli2 lints every file under the docs root. Given `.` as its only path, it would lint the Markdown files at the top of the docs root and nothing below them.

Without `shardsGlobs`, `shardLintPaths` returns a glob for the Markdown files in each guide directory, such as `features/**/*.{md,markdown}`. markdownlint-cli2 expands a bare directory to every file in it, images included. A guide under the docs root gets a glob relative to it, which keeps glob characters in the checkout path, such as the parentheses in `repo (copy)`, out of the pattern. A guide outside the docs root gets an absolute glob. As a `../` glob next to an in-root glob, it would lose the shard preset's `!**/index.md`, because globby rebases a `**/` negation onto `../` only when every pattern starts with the same `../`. Under a symlinked docs root, markdownlint-cli2 runs in the link target, where `../` names another directory. Glob characters and quotes in the path are escaped. Use `guideScanDirs` for the directories themselves.

A `shardsGlobs` entry that starts with `../` gets the escaped absolute path of the directory those segments name in their place, followed by `/**` when the entry is a directory. A negated entry gets `**` in front of the absolute path, because globby reads most absolute negations as relative to its cwd.

`loadConfig` validates the file with `MdcpConfigSchema` and fills the top-level defaults, such as `outputDir`, `banner`, `sourceTags`, `scan`, `backup`, `refs` and `review`. A key inside an omitted optional object, such as `lint`, `lint.links`, `vale` or a guide's `compile`, is `undefined` after loading, and the code that reads it applies the documented default. Config essentials lists the output layout and its defaults under [Path layout](../client-cli/config-essentials.md#path-layout). The default banner text is in [Source tags and default banner](../features/source-tags-and-banner.md).

`compile.includeBanner` controls whether the global banner is prepended (defaults to `true` for all outputs). `compile.sourceTags` overrides the top-level `sourceTags` setting per guide (for example, set `false` on a Slidev deck whose leading frontmatter must stay at the top of the file).

### Publish outputs and link paths

Guides with `compile.outputFile` publish outside the shard tree (npm READMEs, `DEVELOPERS.md`, and similar).

After the cross-guide and intra-guide rewrites, compile resolves the `../` links a shard still has and writes them relative to the guide's [link base](./compile-hooks/publish-relative-links.md#when-it-runs). [Publish-relative exclusions](./compile-hooks/publish-relative-links.md#publish-relative-exclusions) lists the links it leaves as written, such as a link to an output named in the guide link index. A guide doesn't need path-prefix config for this. [Link passes](./compile-hooks/index.md#link-passes) lists the passes in order, and [Publish-relative link rewriting](./compile-hooks/publish-relative-links.md) has examples from MDCP's own docs.

## `compile.hooks`

Built-in hooks run by default when `compile.hooks` is omitted. See [Default compile hooks](../features/default-compile-hooks.md).

- **Omitted** — run `DEFAULT_COMPILE_HOOKS` in order: `stripAnchors`, `codeEvidence`, `inlineInserts`
- **`string[]`** — explicit override; replaces defaults entirely (backward compatible)
- **`Record<string, boolean>`** — opt out; keys with `false` remove that hook from defaults

Optional per-hook settings: `compile.hooksConfig` (`inlineInserts.searchRoots`). Post-stitch anchor stripping: `compile.stripAnchors` (default `true`), independent of the per-shard `stripAnchors` hook unless opted out.

## `compile.crossGuideLinks`

Assembly-time cross-guide link options on the **compiling** guide (not a compile hook):

- **`ignoreGuides`**: `string[]` of guide names. Links from the compiling guide to shards of a listed guide keep source `.md` paths instead of rewriting to `#slug` targets in the target guide's compiled guide or in the monolith

See [Cross-guide link rewriting](./compile-hooks/cross-guide-links.md) and [ignoreGuides](../glossary/ignore-guides.md).
