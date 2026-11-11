---
'@merlon-docs/merlon-docs-core': minor
---

Add a format-neutral document model for review and check (ADR 0008). A format's reader turns source text into a `SourceDoc` (title, headings, prose paragraphs, links, anchors, manifest entries), and `reviewDocs` now reads only that model. The GFM reader is built in and exported as `gfmFormat`; `registerFormat`, `getFormat` and `listFormats` manage the registry. Review output for Markdown guides is unchanged.
