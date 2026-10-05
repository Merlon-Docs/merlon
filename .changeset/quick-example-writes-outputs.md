---
'@bwilliamson/mdcp-core': patch
---

The core README's quick example opens with what it does and writes the compiled outputs with `writeCompiledGuidesFromResults`. It loads the config with `process.cwd()` as `configBase`, as the Config API says. It shows `checkRefsRegistry` as the CI alternative to regenerating the registry, and links the Compile and Config API pages.
