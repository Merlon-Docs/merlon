---
'@merlon-docs/merlon-docs-core': minor
'@merlon-docs/merlon-docs-cli': minor
---

Add a format-neutral document model for review and check (ADR 0008). A format's reader turns source text into a `SourceDoc` (title, headings, prose paragraphs, links, anchors, manifest entries), and `reviewDocs` now reads only that model. The GFM reader is built in and exported as `gfmFormat`; `registerFormat`, `getFormat` and `listFormats` manage the registry. Review output for Markdown guides is unchanged. `checkSourceDocs` runs format-neutral checks over read documents: reachability from root documents (orphans), file and document links that resolve, fragments that name an anchor, and labels that are defined. A format can supply a `TargetLocator` for how it names files and a `RefResolver` for its labels.

Config gains `sources` (which files are docs and which format reads them, default `**/*.md` as `gfm`), `roots`, `manifestHook`, `sphinx`, and `review.guides` for per-guide thresholds. `compileOrder` may now be left out for a tree another tool builds; `merlon compile` and the commands that read compiled guides then fail with a message that points at `--no-compile`. An explicitly empty `compileOrder` is still rejected.
