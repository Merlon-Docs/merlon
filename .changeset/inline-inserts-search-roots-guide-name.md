---
'@bwilliamson/mdcp-core': patch
---

`inlineInserts` now reads `hooksConfig.inlineInserts.searchRoots` for a guide whose `path` ends in a directory with a different name from its `name`, such as a guide named `architecture-review` with `path: review`. Assembly gave hooks the directory's name as the guide name, so the hook didn't find the guide's config and skipped its search roots. An insert link that only a search root could resolve stayed a plain link. Hooks now get the guide's configured name.
