---
'@bwilliamson/mdcp-presets': minor
---

Add the `MDCP.DatedClaim` Vale rule

The `MDCP` style now flags a claim pinned to a date: `as of` or `until` followed by an ISO date such as `2026-07-27`, in body text, headings, tables and lists. An ISO date-time such as `2026-07-27T12:00:00Z` counts too. A durable shard should say what is true now, and the dated reason belongs in a dated record such as an ADR or CHANGELOG entry. Code and inline link labels are skipped.

The rule is error level, so `mdcp check --require-vale` fails on a dated claim. It flags every dated claim whatever its age, because a Vale rule can't compare a date with today. To report dated claims without failing the check, set the level in `.vale.ini`:

```ini
MDCP.DatedClaim = warning
```

A plain `mdcp prose` shows the warning. To see it in `mdcp check` too, set `vale.strictMinAlertLevel` to `warning` in `mdcp.config.json`.

Set it to `NO` in a path section to exempt files that are dated by design, such as research records. mdcp passes Vale absolute paths, so start the section with `**/`, as in `[**/research/*.md]`. To exempt one passage, wrap it in `<!-- vale MDCP.DatedClaim = NO -->` and `<!-- vale MDCP.DatedClaim = YES -->`.

The `TokenIgnores` pattern in the package config now ends each match at the link's closing parenthesis, and it reads a backslash-escaped bracket in a label as text. The old pattern could start at a task-list checkbox and stop at the next link later in the file, which hid the text between them from every `MDCP` rule. If your `.vale.ini` repeats the old pattern, copy the new one from `vale/package/.vale.ini`.
