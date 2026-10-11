# Why mdcp for coding agents

Common docs failures when agents edit the repo, and what helps:

| Pain                       | What goes wrong                        | What helps                                                |
| -------------------------- | -------------------------------------- | --------------------------------------------------------- |
| **Single-file docs**       | Merge conflicts, stale TOC             | `mdcp compile`; `mdcp check` catches orphans              |
| **Broken cross-links**     | Agents guess `#anchor` slugs           | `mdcp check` (optional `mdcp refs-list` for slugs)        |
| **Context overload**       | Whole compiled output pasted each turn | Host search, then read one shard                          |
| **Docs drift**             | Committed outputs lag their shards     | `mdcp compile` in CI, then fail on `git diff --exit-code` |
| **Custom compile scripts** | Bash/Python glue nobody owns           | `compile`, `check`, `@bwilliamson/mdcp-presets`           |

Typical loop: edit shards → `mdcp compile` → `mdcp check` → optional `mdcp refs-list` → read one shard when the next turn needs doc context.

[Install and quick start](./install-and-quick-start.md) covers install and flags, and the [Agent Skill](./about.md#not-the-agent-skill) contains the docs workflows an agent follows.
