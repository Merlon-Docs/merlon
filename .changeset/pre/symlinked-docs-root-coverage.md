---
'@merlon-docs/merlon-docs-cli': patch
---

Spell the coverage scan root like `--docs-root` when both name the same directory, so `merlon check` no longer reports compiled outputs and shards as uncaptured, or prints standalone-guide paths under a different prefix, when the docs root sits behind a symlink such as macOS's `/var` → `/private/var`.
