---
'@merlon-docs/merlon-docs-core': minor
---

Add a format-neutral document model for review and check (ADR 0008). A format's reader turns source text into a `SourceDoc` (title, headings, prose paragraphs, links, anchors, manifest entries), and `reviewDocs` now reads only that model. The GFM reader is built in and exported as `gfmFormat`; `registerFormat`, `getFormat` and `listFormats` manage the registry. Review output for Markdown guides is unchanged. `checkSourceDocs` runs format-neutral checks over read documents: reachability from root documents (orphans), file and document links that resolve, fragments that name an anchor, and labels that are defined. A format can supply a `TargetLocator` for how it names files and a `RefResolver` for its labels.
