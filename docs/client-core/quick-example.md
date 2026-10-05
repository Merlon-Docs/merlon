# Quick example

This script compiles every guide and writes the outputs, then regenerates the refs registry from them. Run it from the directory that holds `docs/mdcp.config.json`.

```typescript
import { join } from 'node:path';
import {
  loadConfig,
  resolveDocsRoot,
  resolveOutputPath,
  compileGuideResults,
  compileGuidesFromResults,
  writeCompiledGuidesFromResults,
  refsOutputTexts,
  resolveRefsPath,
  genRefsFromCompiled,
} from '@bwilliamson/mdcp-core';

const config = loadConfig('docs/mdcp.config.json', process.cwd());
const docsRoot = join(process.cwd(), 'docs');

const options = {
  guidesRoot: resolveDocsRoot(config, docsRoot),
  compileOrder: config.compileOrder,
  banner: config.banner,
  guides: config.guides,
  docsRoot,
  config,
};
const results = compileGuideResults(options);
writeCompiledGuidesFromResults(results, options, resolveOutputPath(config, docsRoot));

const compiled = compileGuidesFromResults(results, options);
const outputs = refsOutputTexts(results, options);
const refsPath = resolveRefsPath(docsRoot, config.outputDir, config.refs.registryFile);
genRefsFromCompiled(compiled, refsPath, outputs);
```

In CI, call `checkRefsRegistry(compiled, refsPath, outputs)` in place of `genRefsFromCompiled`. It returns `ok: false` when the registry on disk is missing or stale. The [Compile API](./api-compile.md) lists the fields of each result and says when compile writes the monolith, the one file that top-level `outputFile` names. The [Config API](./api-config.md) says which base each path resolves from.
