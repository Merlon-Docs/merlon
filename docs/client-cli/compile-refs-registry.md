# Compile and the refs registry

## End-user value

When you organize compiled outputs in subdirectories (`compile.outputFile: "compiled/guide-a.md"`), `mdcp compile` still keeps the refs registry at the documented cache path under `outputDir`. You can run `mdcp refs-list` right after compile when writing cross-links, without moving the file or running `mdcp refs-gen` first.

## Registry location

`refs.registryFile` is always relative to `outputDir`, not to each guide's `compile.outputFile`. See [Config essentials — path layout](./config-essentials.md#path-layout).

Example:

```json
{
  "outputDir": "_build",
  "refs": { "registryFile": ".caches/refs.json" },
  "guides": [{ "name": "guide-a", "compile": { "outputFile": "compiled/guide-a.md" } }]
}
```

| Artifact       | Path                              |
| -------------- | --------------------------------- |
| Compiled guide | `docs/_build/compiled/guide-a.md` |
| Refs registry  | `docs/_build/.caches/refs.json`   |

## Workflow

```bash
mdcp compile --config docs/mdcp.config.json --docs-root docs
mdcp check --config docs/mdcp.config.json --docs-root docs
mdcp refs-list --config docs/mdcp.config.json --docs-root docs
```

`mdcp check` validates cross-link fragments against compiled slugs. `mdcp refs-list` reads the registry file that `compile` just wrote.
