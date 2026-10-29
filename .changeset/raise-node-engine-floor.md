---
'@merlon-docs/merlon-docs-cli': minor
'@merlon-docs/merlon-docs-core': minor
'@merlon-docs/merlon-docs-presets': minor
'@merlon-docs/skill-merlon-docs': patch
---

Require Node.js 22 or later. `engines.node` said `>=18.0.0`, but Node 18 never ran 1.x: `merlon compile`, `check` and `review` fail with `CustomEvent is not defined`, because cac 7 needs Node 20.19 or later. Run the latest release of your Node major version for its security fixes.
