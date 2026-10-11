# Config API

| Export                                                                                       | Purpose                                                                          |
| -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `loadConfig(path, configBase)`                                                               | Load and validate `merlon.config.json` (`path` is resolved from `configBase`)    |
| `resolveOutputPath`, `resolveRefsPath`, `resolveGuideDir`, `resolveUnderOutputDir`           | Path resolvers for docs root and `outputDir`                                     |
| `defaultGuideOutputFile`, `effectiveGuideOutputFile`                                         | A guide's default output file name, and its `compile.outputFile` or that default |
| `resolveDocsRoot(config, docsRoot)`                                                          | The docs root, which is `docsRoot` as given                                      |
| `resolveGuideLinkBase(config, docsRoot, name, compileOrderLength, compile)`                  | The output a publish output links to for a guide                                 |
| `getGuideConfig`, `guideScanDirs`, `shardLintPaths`                                          | In-scope guide fileset and shard lint helpers                                    |
| `MerlonConfigSchema`, `MerlonConfig`, `MerlonConfigInput`, `GuideConfig`, `GuideConfigInput` | Zod schema and types                                                             |
| `DEFAULT_COMPILE_HOOKS`, `resolveCompileHooks`                                               | Default built-in hook pipeline and guide-level resolution                        |

`resolveGuideLinkBase` returns the guide's `compile.outputFile` when the guide sets one. Without one, it returns the monolith when the config has one, and the guide's compiled guide otherwise. Despite its name, the result is the [link base](../features/compile-pipeline/publish-relative-links.md#when-it-runs) of only the assembly that writes that file. A guide in the monolith has one link base per document, and its own compiled guide rebases on its own path rather than on the monolith this returns.

## Path resolution: `configBase` vs docs root

| Concern                      | Base                          | Example                                                                          |
| ---------------------------- | ----------------------------- | -------------------------------------------------------------------------------- |
| Finding `merlon.config.json` | `configBase` (invocation dir) | `--config docs/merlon.config.json` → `<repo>/docs/merlon.config.json`            |
| Guide shards (default)       | Docs root (`--docs-root`)     | `resolveGuideDir('features', config, docsRoot)` → absolute `<docsRoot>/features` |

`resolveOutputPath` and `resolveRefsPath` resolve a generated path with `resolveUnderOutputDir(docsRoot, outputDir, file)`. [Resolution bases](../client-cli/config-essentials.md#resolution-bases) in Config essentials gives the base of `outputDir` and of each generated path.

```typescript
import { loadConfig, resolveGuideDir } from '@merlon-docs/merlon-docs-core';

const config = loadConfig('docs/merlon.config.json', process.cwd());
const featuresDir = resolveGuideDir('features', config, join(process.cwd(), 'docs'));
```

Pass `process.cwd()` as `configBase` for `loadConfig`. Pass the docs root as `docsRoot` to `resolveGuideDir`, `resolveOutputPath`, and `resolveRefsPath`.

`resolveGuideDir` and `guideScanDirs` return absolute paths. A relative `docsRoot` such as `docs` resolves against the process cwd. The CLI runs markdownlint-cli2 and Vale with the docs root as their cwd, where a relative `docs/features` would name `docs/docs/features`, a directory that doesn't exist.

`shardLintPaths(config, docsRoot)` returns paths for markdownlint-cli2 run with the docs root as its cwd, as `merlon lint` and `merlon check` run it. From another cwd, the relative paths match the wrong files or none. Without `lint.markdownlint.shardsGlobs`, it returns one glob per guide directory, as [In-scope guide fileset](../client-cli/optional-linters.md#in-scope-guide-fileset) describes, and `**/*.{md,markdown}` for a guide whose directory is the docs root. A relative glob that would start with `!`, `#` or `:` gets a leading `./`, so markdownlint-cli2 doesn't read it as a negation or a literal path. Use `guideScanDirs` for the directories themselves.

With `shardsGlobs`, it returns each entry as written, negated entries included, with two exceptions. A `.` entry becomes `**`. An entry that starts with `../` gets the escaped absolute directory those segments name in their place, then `/**` when the entry is a directory, and a negated one gets `**` in front.

`loadConfig` validates the file with `MerlonConfigSchema` and fills the top-level defaults, such as `outputDir`, `banner`, `sourceTags`, `scan`, `backup`, `refs` and `review`. A key inside an omitted optional object, such as `lint`, `lint.links`, `vale` or a guide's `compile`, is `undefined` after loading, and the code that reads it applies the documented default. Config essentials lists the output layout and its defaults under [Path layout](../client-cli/config-essentials.md#path-layout). [Source tags and default banner](../features/source-tags-and-banner.md) gives the default banner text and the per-guide `compile.includeBanner` and `compile.sourceTags` keys.

### Publish outputs and link paths

Guides with `compile.outputFile` publish outside the shard tree (npm READMEs, `DEVELOPERS.md`, and similar).

After the cross-guide and intra-guide rewrites, compile resolves the `../` links a shard still has and writes them relative to the guide's [link base](../features/compile-pipeline/publish-relative-links.md#when-it-runs). [Publish-relative exclusions](../features/compile-pipeline/publish-relative-links.md#publish-relative-exclusions) lists the links it leaves as written, such as a path that leads to no file. A guide doesn't need path-prefix config for this. [Link passes](../features/compile-pipeline/link-passes.md) lists the passes in order, and [Publish-relative link rewriting](../features/compile-pipeline/publish-relative-links.md) has examples from MDCP's own docs.

## `compile.hooks`

`resolveCompileHooks(compile)` returns the list of hooks a guide runs, which is `DEFAULT_COMPILE_HOOKS` when `compile.hooks` is omitted. [Configuration](./compile-hooks/index.md#configuration) in the hooks overview covers the config keys.

## `compile.crossGuideLinks`

Assembly-time cross-guide link options on the **compiling** guide (not a compile hook):

- **`ignoreGuides`**: `string[]` of guide names. Links from the compiling guide to shards of a listed guide keep source `.md` paths instead of rewriting to `#slug` targets, except where a link to a shard the compiling guide stitches takes its in-document anchor, as [ignoreGuides](../glossary/ignore-guides.md) says.

See [Cross-guide link rewriting](../features/compile-pipeline/cross-guide-links.md).
