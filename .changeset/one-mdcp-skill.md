---
'@bwilliamson/skill-mdcp': minor
---

The `mdcp` skill is now the only skill to install. The helper skills (`mdcp-getting-started`, `mdcp-doc-only`, `mdcp-design-architecture`, `mdcp-feature-level`, `mdcp-ux`) are folded into it as workflow files under `references/workflows/`, and the skill picks the workflow for each task from a routing table. Invoke it as `/mdcp` with the task in plain words, such as `/mdcp help me get started`.

A new doc-review workflow reviews the docs as a set, using `mdcp review` for the mechanical pass, and the skill offers it on its own when a sprawl trigger matches (several new shards, a crowded guide index, a rule found in two places). For projects whose docs change every week, it also recommends a weekly routine that reviews each guide on its own; for one-off projects it says the routine is not needed.

If you installed a helper skill, remove it and install `mdcp` alone: `npx skills add betsalel-williamson/mdcp --skill mdcp`. The helper skills are no longer published.
