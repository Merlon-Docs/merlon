# What this tool is

[![skills.sh](https://skills.sh/b/Merlon-Docs/merlon)](https://skills.sh/Merlon-Docs/merlon)

**Merlon Docs** is a **documentation system** delivered as an [Agent Skill](https://agentskills.io) plus a small compile/check toolchain. It is for people whose docs grow as product ideas keep arriving and who want each topic in a small file that a check validates. If you are evaluating it for a team, [Vision and roadmap](../features/system/00-vision-and-roadmap.md) explains the problem it solves and the principles behind it.

Merlon Docs, formerly MDCP (MarkDown Context Protocol), is an open standard and an open-source project, MIT licensed.

Instead of putting every architecture note and spec into one file, Merlon Docs stores that intent as small, validated Markdown **shards** such as `docs/features/my-feature.md`, `docs/procedures/line-changeover.md`, `docs/equipment/press-manual.md` or `docs/training/onboarding-module.md`. The Agent Skill tells agents to read **one shard at a time** and to update the shards before they change what the shards describe. In CI, `merlon check` fails when a shard is orphaned or an internal link is broken. Discover and install via [skills.sh](https://skills.sh/Merlon-Docs/merlon). <!-- merlon-paths: illustrative -->
