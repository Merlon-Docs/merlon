---
'@bwilliamson/mdcp-cli': patch
'@bwilliamson/mdcp-core': patch
---

The CLI README's Cross-links and refs says a standalone guide's headings are in the refs registry only when a guide stitches the file through its manifest or a `compile.scopeRoot` walk, and links Standalone guide behavior as the owner, where it said compile never writes those headings. Config essentials states the `--config` vs `--docs-root` rule once, and Global options in Commands reference and the Quick start link it instead of restating it. Each package README's Stability section opens with one sentence that says what can change before 1.0.0 and links the pre-1.0 policy. The CLI README's section also keeps the advice to read the changelog and release notes before upgrading, and the core README links it.
