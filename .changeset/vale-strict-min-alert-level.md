---
'@merlon-docs/merlon-docs-cli': patch
---

Honor `vale.strictMinAlertLevel` in `merlon check` and stop hiding warnings in `merlon prose`

`merlon check` always ran Vale with `--minAlertLevel=error` and ignored `vale.strictMinAlertLevel`. It now passes that setting, which still defaults to `error`, and so does `merlon prose --strict`. A plain `merlon prose` passed `vale.strictMinAlertLevel` (default `error`) whenever the config had a `vale` block, so by default it hid every warning and suggestion. It now passes no level, and the `MinAlertLevel` in `.vale.ini` decides what it shows. The setting now applies only to strict runs. If you set it below `error` to see more in a plain `merlon prose`, set `MinAlertLevel` in `.vale.ini` instead.

Exit codes are unchanged. Of Vale's alerts, only error-level ones make it exit non-zero. A lower level adds alerts to the output and doesn't fail either command.

The README's Vale section also names the new `MerlonDocs.DatedClaim` rule of the `MerlonDocs` style.
