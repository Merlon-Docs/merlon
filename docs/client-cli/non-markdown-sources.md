# Non-Markdown sources

Merlon Docs compiles GFM shards only, because Markdown has no include mechanism that assembles a guide. A project whose docs Sphinx, MkDocs, Antora or another tool already builds keeps that tool, and runs `merlon check --no-compile` and `merlon review --no-compile` on its sources. [ADR 0008](../features/adr/0008-one-document-model.md) records the decision.

## Formats

The `sources` config key says which files are docs and which format reads each. The first entry whose glob matches a file wins. Globs are relative to the docs root. Without `sources`, Merlon Docs reads `**/*.md` as `gfm`, as it always has.

| Format | Reads                                     | Reports                                                                                                                                     |
| ------ | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `gfm`  | Markdown shards                           | Everything `merlon check` checks in a compiled tree, and the review signals                                                                 |
| `rst`  | reStructuredText, as Sphinx builds it     | `toctree` entries, `include` and `literalinclude`, `:doc:` and `:ref:` targets, labels and `:name:` options, `:orphan:`; the review signals |
| `text` | `README`s, `.txt` and extensionless prose | The review signals. A file that starts with `#!` is a script and reads as empty                                                             |
| `man`  | troff man pages                           | The review signals, and page references such as `open(2)` that resolve nowhere                                                              |
| `html` | Hand-written HTML pages                   | Links between pages and their `#fragment`s, `id` and `<a name>` anchors, orphans; the review signals                                        |

Plain text and man pages have no table of contents, so they are never orphans. An HTML page's links to other `.html` or `.htm` pages are its table of contents, grouped by the `<h2>` or deeper heading above each link, and `index.html` or `index.htm` is an index. The `html` reader takes the first `<h1>` as the title, or `<title>` when there is none, and leaves `<pre>`, `<script>`, `<style>` and comments out of the prose.

## A config for a Sphinx tree

The config can live outside the project, so a project can be checked without adding files to it. `--docs-root` names the tree; `manifestHook` and `sphinx.inventory` resolve against the config file's directory.

```json
{
  "configVersion": "1.1.0",
  "sources": [
    { "glob": "**/*.rst", "format": "rst" },
    { "glob": "**/*.txt", "format": "text" },
    { "glob": "**/README", "format": "text" }
  ],
  "roots": ["index.rst"],
  "sphinx": {
    "autosectionlabel": { "prefixDocument": true },
    "ignoreLabels": ["^abi_.*"]
  },
  "review": { "guides": { "ABI": { "maxShardWords": 20000 } } },
  "scan": { "ignore": ["output/**", "translations/**"] }
}
```

```bash
merlon check --no-compile --config ~/reviews/kernel.json --docs-root Documentation
merlon review --no-compile --config ~/reviews/kernel.json --docs-root Documentation
```

A config without `compileOrder` can run only these two commands. `merlon compile`, a full `merlon check` and the other commands that read compiled guides fail with a message that points at `--no-compile`.

## Check without compiling

`merlon check --no-compile` reads every source and reports, with file and line:

- `orphan`: a document no root reaches. Reachability starts at `roots` (relative to the docs root; by default each guide's manifest) and follows table-of-contents entries (relative, `/absolute` and `:glob:`), includes, `:doc:` links and the manifest hook. A document that says `:orphan:` is never reported.
- `broken-link`: a table-of-contents entry, include, `:doc:` link, or Markdown or HTML file link that names a missing file.
- `broken-anchor`: a Markdown link whose `#fragment` names no heading in its target, or an HTML link whose `#fragment` names no `id` or `<a name>` there.
- `undefined-ref`: a `:ref:` label that no document defines.
- `unresolved-manpage` (a warning): a man page reference that names no page in the tree and matches no `man.quiet` entry. See [Man page references](#man-page-references).

It exits 1 when there is any issue other than a warning, and skips compile, `refs.json`, markdownlint and Vale. `scan.ignore` globs are relative to the docs root here, and `.git` and `node_modules` are always skipped. A symlinked document, such as `Changes -> process/changes.rst`, is read once under its target.

### Sphinx references

A `:ref:` target resolves when any of these defines it: a `.. _label:` target (indented, in a list item or backquoted), a directive's `:name:` option, a Sphinx built-in label (`genindex`, `modindex`, `search`), or a label in a built `objects.inv` named by `sphinx.inventory`. With `sphinx.autosectionlabel`, every section title is a label too, as `docname:Section Title` when `prefixDocument` is set, down to `maxDepth` levels when it isn't `0`. Labels the build generates go in `sphinx.ignoreLabels` as regular expressions. Labels compare after folding case and whitespace, so a `:ref:` whose text wraps across lines still resolves.

### Man page references

A man page reference, such as `cpupower(1)` in a man page or `` :manpage:`open(2)` `` in RST, resolves when the tree has that page, as a file named `cpupower.1` read as `man`. A reference that resolves nowhere is a warning, which is printed but doesn't fail the check. Most references name pages from other projects, so `man.quiet` lists the ones that shouldn't warn. Each entry is one of:

- a section, such as `"4"`, which also covers suffixed sections such as `4p`;
- a page or a `name(section)` pattern where `*` matches anything, such as `"msr(4)"`;
- `"defaults"`, which stands for sections 1, 2, 3 and 8: user commands, system calls, library functions and administration commands.

By default nothing is quiet. A reference to a name the tree has, in a section it doesn't have, such as `cpupower(8)` when the tree has `cpupower.1`, warns whatever `man.quiet` says.

```json
{ "man": { "quiet": ["defaults", "msr(4)"] } }
```

### Manifest hook

Some projects generate toctrees at build time, for example from a `MAINTAINERS` file. A `manifestHook` module's default export receives `{ docsRoot, docs }`, where `docs` lists every document read as a docs-root-relative path, and returns the paths it makes reachable. It may be async.

```js
// review/maintainers-hook.mjs
export default ({ docs }) => docs.filter((path) => path.startsWith('process/maintainer-'));
```

## Review without compiling

`merlon review --no-compile` reports the four [sprawl signals](./commands-reference.md#sprawl-review) over the sources in every format. A guide is a top-level directory of the docs root (`.` for files at the root): `similar-titles` compares titles within one, `--guide` keeps findings that involve one, and `review.guides` sets thresholds per guide. An RST index group is one `toctree`, named by its `:caption:`.

Each finding gains a `locations` list of `{ file, line }`, in the JSON output and in the text report. In a Markdown tree reviewed without `--no-compile`, findings keep their earlier shape.
