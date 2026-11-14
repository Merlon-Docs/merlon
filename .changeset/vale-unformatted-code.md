---
'@merlon-docs/merlon-docs-presets': minor
'@merlon-docs/skill-merlon-docs': patch
---

The `MerlonDocs` Vale style adds `MerlonDocs.UnformattedCode`, a warning-level rule that flags a code-shaped name outside backticks: a call such as `set_field_fore()`, a `snake_case` name such as `field_init`, or an `UPPER_SNAKE` constant such as `O_AUTOSKIP`. It skips names inside email addresses and emoji shortcodes. A warning doesn't fail `merlon check`, so set `MerlonDocs.UnformattedCode = error` in `.vale.ini` to enforce it. The skill's workflow references put intake names such as `WORK_ITEM` in backticks.
