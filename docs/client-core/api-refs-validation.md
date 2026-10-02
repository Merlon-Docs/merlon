# API — Refs and validation

## Refs (cross-links)

| Export                                                         | Purpose                                 |
| -------------------------------------------------------------- | --------------------------------------- |
| `headingTextToPlain`, `githubSlugify`, `buildSlugRegistry`     | GitHub heading slugs via github-slugger |
| `genRefsFromCompiled`, `readRefsRegistry`, `checkRefsRegistry` | `refs.json` lifecycle                   |
| `resolveRefsPath`, `writeRefsRegistry`                         | Path and I/O helpers                    |

### `resolveRefsPath(docsRoot, outputDir, registryFile)`

Resolves the on-disk path for the refs registry. Implemented via the same `outputDir`-relative helper as `resolveOutputPath`. Pass the docs root (the CLI `--docs-root` value).

- `outputDir` is relative to `docsRoot`.
- `registryFile` is relative to `outputDir` (default `.caches/refs.json`).

```typescript
resolveRefsPath('/docs', '_build', '.caches/refs.json');
// → /docs/_build/.caches/refs.json

resolveRefsPath('/docs', '.', 'refs.json');
// → /docs/refs.json
```

Prefer outputDir-relative values in config (for example `".caches/refs.json"` when `outputDir` is `"_build"`). See [Config essentials — path layout](../client-cli/config-essentials.md#path-layout).

### Heading slugs (github-slugger)

`githubSlugify`, `headingTextToPlain`, and `buildSlugRegistry` derive `#fragment` targets from compiled headings using [`github-slugger`](https://www.npmjs.com/package/github-slugger), which matches GitHub's [html-pipeline `TableOfContentsFilter`](https://github.com/gjtorikian/html-pipeline/blob/main/lib/html/pipeline/toc_filter.rb). GFM does not define auto-generated heading IDs; treat github-slugger parity as the contract.

| Export               | Purpose                                              |
| -------------------- | ---------------------------------------------------- |
| `headingTextToPlain` | Strip ids and inline markup before slugging          |
| `githubSlugify`      | Single-heading slug via github-slugger               |
| `buildSlugRegistry`  | Document-wide slugs; duplicates get numeric suffixes |

```typescript
import { githubSlugify, headingTextToPlain } from '@bwilliamson/mdcp-core';

headingTextToPlain('**Authored GFM** `{#gfm}`');
// → 'Authored GFM'

githubSlugify('Preprocessor / templating (out of scope)');
// → 'preprocessor--templating-out-of-scope'

githubSlugify('`--config` vs `--docs-root`');
// → '--config-vs---docs-root'
```

CLI authoring rules: [Cross-links and refs — heading slugs](../client-cli/cross-links-and-refs.md#heading-slugs-github-rules).

## Manifest

| Export                          | Purpose                                        |
| ------------------------------- | ---------------------------------------------- |
| `sectionFiles`, `assembleGuide` | Resolve compile order from manifest link order |

## Validation

| Export                  | Purpose                                                                            |
| ----------------------- | ---------------------------------------------------------------------------------- |
| `checkOrphansForGuides` | Detect unlinked or missing shard files                                             |
| `lintLinks`             | Internal markdown link validation                                                  |
| `reviewDocs`            | Sprawl signals behind `mdcp review` (`formatReviewReport` renders the text report) |
