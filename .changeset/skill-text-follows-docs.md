---
'@bwilliamson/skill-mdcp': patch
---

The skill's text follows the docs it repeats. The doc-only, design-architecture, feature-level and ux workflows no longer branch from `main`. They update the integration branch that the delivery conventions at `WORK_ITEM_LOOKUP` name, or the default branch when they name none, and branch from it.

The shard single responsibility principle in `SKILL.md` says a shard serves one audience, the word `references/shard-responsibility.md` uses, where it said one audience tier.

The routing diagram in `SKILL.md` sends design-architecture work to `docs/features/` and `docs/features/adr/`, the directories that workflow writes to, where it said `docs/features/` including protocol and ADRs.

The What belongs where table in `SKILL.md` uses the wording of the specification's default guide layout. The features row keeps out code walkthroughs, the client row holds consumer value and usage including install and configuration, and the developer row adds workflow, tracker integration and releases. The weekly review routine is recommended when docs changed in most weeks of the last month, and most weeks means commits in at least three different weeks of the docs directory's git log for the last four weeks. The old text counted code changes too and gave the git log count as an example.
