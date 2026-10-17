# Compile and the refs registry

`merlon compile` writes the [refs registry](../glossary/refs-registry.md) to `refs.registryFile`, which resolves by the rule in [Path layout](./config-essentials.md#path-layout). A guide's `compile.outputFile` doesn't move the registry. `merlon refs-list` reads it right after compile, with no `merlon refs-gen` run first. [Refs registry path](../features/refs-registry-path.md#path-resolution) is the spec and has an example. [Cross-links and refs](./cross-links-and-refs.md) shows when to run each command while you write cross-links.

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

`merlon refs-list` prints the headings of every entry in `outputs`, each with its `file`. With `--format table`, it prints one tab-separated line for each heading, which starts with the file and ends with the heading's slug and title. A registry without `outputs`, such as one that `genRefsFromCompiled` writes from one text, has no files to give. `merlon refs-list` then prints the top-level headings, and on stderr it gives the registry's path and says to run `merlon refs-gen`.
