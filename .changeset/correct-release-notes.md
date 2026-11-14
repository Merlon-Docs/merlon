---
'@merlon-docs/merlon-docs-cli': patch
'@merlon-docs/merlon-docs-core': patch
'@merlon-docs/merlon-docs-presets': patch
'@merlon-docs/skill-merlon-docs': patch
---

Correct two earlier release notes. The 1.0.0 entry says the `1.0.0-draft.N` prereleases stay on the npm `draft` tag and that the Agent Skills publish under npm `latest`. The `draft` tag no longer exists, and the skill ships through GitHub Releases, not npm. The Node.js 22 entry in core 1.1.0, presets 1.1.0 and the skill's 1.0.2 gives the CLI's reason: the `CustomEvent is not defined` failure is the CLI's. Core, the presets and the skill move to Node.js 22 to keep the family on one floor.
