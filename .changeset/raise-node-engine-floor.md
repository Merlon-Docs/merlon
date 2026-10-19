---
'@merlon-docs/merlon-docs-cli': minor
'@merlon-docs/merlon-docs-core': minor
'@merlon-docs/merlon-docs-presets': minor
---

Raise the documented Node.js engine floor to `>=22.13.0`. Node 18 was not a working runtime for 1.x (`merlon compile` fails with `CustomEvent is not defined` on Node 18.20.8 because cac 7 requires the Node 20.19+ `CustomEvent` global).
