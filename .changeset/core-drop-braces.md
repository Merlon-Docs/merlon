---
'@merlon-docs/merlon-docs-core': patch
---

Match globs with `tinyglobby` instead of `fast-glob`, so installing the core library no longer pulls in `braces`, which has an unpatched stack-overflow advisory (GHSA-vfj7-8cjw-p6xm).
