# Quick example

```typescript
import {
  loadConfig,
  compileGuideResults,
  compileGuidesFromResults,
  resolveDocsRoot,
  refsOutputTexts,
  genRefsFromCompiled,
  resolveRefsPath,
  checkRefsRegistry,
} from '@bwilliamson/mdcp-core';

const docsRoot = '/path/to/docs';
const config = loadConfig('mdcp.config.json', docsRoot);

const options = {
  guidesRoot: resolveDocsRoot(config, docsRoot),
  compileOrder: config.compileOrder,
  banner: config.banner,
  guides: config.guides,
  docsRoot,
  config,
};
const results = compileGuideResults(options);
const compiled = compileGuidesFromResults(results, options);
const outputs = refsOutputTexts(results, options);

const refsPath = resolveRefsPath(docsRoot, config.outputDir, config.refs.registryFile);
genRefsFromCompiled(compiled, refsPath, outputs);
checkRefsRegistry(compiled, refsPath, outputs);
```

Use `writeCompiledGuidesFromResults(results, options, monolithPath)` to write each compiled guide to disk. It also writes the monolith when you pass its path and at least one guide has no `compile.outputFile`. `resolveOutputPath(config, docsRoot)` gives that path.
