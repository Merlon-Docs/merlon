---
'@merlon-docs/merlon-docs-core': minor
'@merlon-docs/merlon-docs-cli': minor
---

Add a format-neutral document model for review and check (ADR 0008). A format's reader turns source text into a `SourceDoc` (title, headings, prose paragraphs, links, anchors, manifest entries), and `reviewDocs` now reads only that model. The GFM reader is built in and exported as `gfmFormat`; `registerFormat`, `getFormat` and `listFormats` manage the registry. Review output for Markdown guides is unchanged. `checkSourceDocs` runs format-neutral checks over read documents: reachability from root documents (orphans), file and document links that resolve, fragments that name an anchor, and labels that are defined. A format can supply a `TargetLocator` for how it names files and a `RefResolver` for its labels.

Config gains `sources` (which files are docs and which format reads them, default `**/*.md` as `gfm`), `roots`, `manifestHook`, `sphinx`, and `review.guides` for per-guide thresholds. `compileOrder` may now be left out for a tree another tool builds; `merlon compile` and the commands that read compiled guides then fail with a message that points at `--no-compile`. An explicitly empty `compileOrder` is still rejected.

Add the `rst` reader (`rstFormat`): over- and underlined section titles, `toctree` entries (relative, `/absolute`, `:glob:`, `:caption:` as the index group), `include` and `literalinclude`, `.. _label:` targets (indented, in list items, backquoted) and `:name:` options, `:ref:` and `:doc:` roles whose text wraps lines, and `:orphan:`. Literal blocks, code and other non-prose directive bodies, comments and tables are left out of the prose.

Add the `text` reader for `README`s, `.txt` and extensionless prose (blank-line paragraphs, an underlined first line as the title, literal blocks indented past the document's own indent, files starting with `#!` read as empty), and the `man` reader for troff man pages (`.TH` title, `.SH`/`.SS` sections, no-fill and example blocks left out, page references such as `open(2)` as `manpage` links).

RST `:ref:` targets resolve the way a Sphinx build does (`sphinxRefs`, `rstFormatWithSphinx`): explicit labels, `:name:` options, Sphinx's built-in labels, `autosectionlabel` targets (with `prefixDocument` and `maxDepth`), `ignoreLabels` patterns for labels the build generates, and labels read from a built `objects.inv` (`readSphinxInventory`).

`merlon check --no-compile` and `merlon review --no-compile` run on the config's `sources` in any format, for a tree another tool builds. Check reports orphans (from `roots`, through table-of-contents entries, includes, `doc` links, a `manifestHook` module, and `:orphan:`), links and entries that name missing files, missing fragments and undefined labels; review reports the four sprawl signals with a `locations` list of file and line on each finding. A symlinked document is read once, under its target. `--config` can live outside the docs root: `manifestHook` and `sphinx.inventory` resolve against the config file's directory.
