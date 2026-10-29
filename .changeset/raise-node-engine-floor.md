---
'@merlon-docs/merlon-docs-cli': minor
'@merlon-docs/merlon-docs-core': minor
'@merlon-docs/merlon-docs-presets': minor
'@merlon-docs/skill-merlon-docs': patch
---

Require Node.js 22.23.4 or later, the Node 22 LTS release with the October 2026 security fixes. `engines.node` said `>=18.0.0`, but Node 18 never ran 1.x: `merlon compile`, `check` and `review` fail with `CustomEvent is not defined`, because cac 7 needs Node 20.19 or later.
