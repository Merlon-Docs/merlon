# API — Config

| Export                                                                                 | Purpose                                                                     |
| -------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `loadConfig(path, configBase)`                                                         | Load and validate `mdcp.config.json` (`path` is resolved from `configBase`) |
| `resolveOutputPath`, `resolveRefsPath`, `resolveGuideDir`, `defaultGuideOutputFile`    | Path resolvers for docs root and `outputDir`                                |
| `getGuideConfig`, `guideScanDirs`, `shardLintPaths`                                    | In-scope guide fileset and shard lint helpers                               |
| `MdcpConfigSchema`, `MdcpConfig`, `MdcpConfigInput`, `GuideConfig`, `GuideConfigInput` | Zod schema and types                                                        |
| `DEFAULT_COMPILE_HOOKS`, `resolveCompileHooks`                                         | Default built-in hook pipeline and guide-level resolution                   |

## Path resolution: `configBase` vs docs root

| Concern                    | Base                          | Example                                                                       |
| -------------------------- | ----------------------------- | ----------------------------------------------------------------------------- |
| Finding `mdcp.config.json` | `configBase` (invocation dir) | `--config docs/mdcp.config.json` → `<repo>/docs/mdcp.config.json`             |
| Guide shards (default)     | Docs root (`--docs-root`)     | `resolveGuideDir('features', config, docsRoot)` → `<docsRoot>/features`       |
| `outputDir`                | Docs root                     | `_build` → `<docsRoot>/_build`                                                |
| All generated paths        | `outputDir`                   | `features.md` → `<docsRoot>/_build/features.md`; `.caches/refs.json` for refs |

All generated paths use `resolveUnderOutputDir(docsRoot, outputDir, file)` — relative to `outputDir` unless `file` is absolute. Details: [API — Refs](./api-refs-validation.md).

```typescript
import { loadConfig, resolveGuideDir } from '@bwilliamson/mdcp-core';

const config = loadConfig('docs/mdcp.config.json', process.cwd());
const featuresDir = resolveGuideDir('features', config, join(process.cwd(), 'docs'));
```

Pass `process.cwd()` as `configBase` for `loadConfig`. Pass the docs root as `docsRoot` to `resolveGuideDir`, `resolveOutputPath`, and `resolveRefsPath`.

`loadConfig` validates the file with `MdcpConfigSchema` and fills the top-level defaults, such as `outputDir`, `banner`, `sourceTags`, `scan`, `backup`, `refs` and `review`. A key inside an omitted optional object, such as `lint`, `lint.links`, `vale` or a guide's `compile`, is `undefined` after loading, and the code that reads it applies the documented default. Config essentials lists the output layout and its defaults under [Path layout](../client-cli/config-essentials.md#path-layout). The default banner text is in [Source tags and default banner](../features/source-tags-and-banner.md).

`compile.includeBanner` controls whether the global banner is prepended (defaults to `true` for all outputs). `compile.sourceTags` overrides the top-level `sourceTags` setting per guide (for example, set `false` on a Slidev deck whose leading frontmatter must stay at the top of the file).

### Publish outputs and link paths

Guides with `compile.outputFile` publish outside the shard tree (npm READMEs, `DEVELOPERS.md`, and similar).

After cross-guide rewrite, every guide rebases the remaining shard-authored `../` links automatically:

- Resolve each link from the **shard file** to an absolute path
- Emit a path **relative to the guide's [link base](./compile-hooks/publish-relative-links.md#when-it-runs)**

You don't need per-guide path-prefix config. The output location and shard path supply the geometry. See [Publish-relative link rewriting](./compile-hooks/publish-relative-links.md) for intent, pass ordering, and examples from MDCP's own docs.

Intra-guide `./section.md` links rewrite to `#anchor` (post-stitch pass).

## `compile.hooks`

Built-in hooks run by default when `compile.hooks` is omitted. See [Default compile hooks](../features/default-compile-hooks.md).

- **Omitted** — run `DEFAULT_COMPILE_HOOKS` in order: `stripAnchors`, `codeEvidence`, `inlineInserts`
- **`string[]`** — explicit override; replaces defaults entirely (backward compatible)
- **`Record<string, boolean>`** — opt out; keys with `false` remove that hook from defaults

Optional per-hook settings: `compile.hooksConfig` (`inlineInserts.searchRoots`). Post-stitch anchor stripping: `compile.stripAnchors` (default `true`), independent of the per-shard `stripAnchors` hook unless opted out.

## `compile.crossGuideLinks`

Assembly-time cross-guide link options on the **compiling** guide (not a compile hook):

- **`ignoreGuides`**: `string[]` of guide names. Links from the compiling guide to shards of a listed guide keep source `.md` paths instead of rewriting to `#slug` targets in the file that contains the target guide (the monolith when the target guide is part of it, otherwise its compiled guide)

See [Cross-guide link rewriting](./compile-hooks/cross-guide-links.md) and [ignoreGuides](../glossary/ignore-guides.md).
