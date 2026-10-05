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

## Registry contents

The registry lists every file compile writes, each slugged on its own. Its `outputs` array has an entry for each compiled guide in `compileOrder`, publish outputs included, then one for the monolith when compile writes it. Each entry has these fields:

| Field       | Holds                                                                 |
| ----------- | --------------------------------------------------------------------- |
| `file`      | The output's path relative to the docs root, with `/` separators      |
| `guideName` | The guide whose compiled guide this is; the monolith's entry has none |
| `headings`  | The output's headings, each with its slug and its line in that file   |
| `slugs`     | The semantic key of each slug                                         |

Each output numbers its headings without the others. So when two guides in the monolith both have a Setup heading, each compiled guide lists `setup`, and the monolith lists `setup` and `setup-1`. A heading's `line` counts the banner, so it is a line of the file as compile writes it.

The top-level `headings` and `slugs` hold the headings of one text. That text is the monolith when the config sets top-level `outputFile`, and otherwise every compiled guide joined in `compileOrder`, without banners. So a publish output's headings reach the top level only in a config without a monolith. Read `outputs` to find the slugs of one file.

`mdcp refs-list` prints the headings of every entry in `outputs`, each with its `file`. With `--format table`, it prints one tab-separated line for each heading, which starts with the file and ends with the heading's slug and title. A registry without `outputs`, such as one that `genRefsFromCompiled` writes from one text, has no files to give. `mdcp refs-list` then prints the top-level headings, and on stderr it gives the registry's path and says to run `mdcp refs-gen`.

## Workflow

```bash
mdcp compile --config docs/mdcp.config.json --docs-root docs
mdcp check --config docs/mdcp.config.json --docs-root docs
mdcp refs-list --config docs/mdcp.config.json --docs-root docs
```

`mdcp check` validates cross-link fragments against compiled slugs. `mdcp refs-list` reads the registry file that `compile` just wrote. When `mdcp check` reports a dead anchor on a link into a compiled output, look up that file's slugs in `mdcp refs-list --format table`. [Cross-links and refs](./cross-links-and-refs.md) lists the other targets a `#fragment` may name.
