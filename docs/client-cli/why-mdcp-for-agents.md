# Why mdcp for coding agents

Which **CLI commands** address common docs failures when agents edit the repo:

| Pain                       | What goes wrong                        | Command                                            |
| -------------------------- | -------------------------------------- | -------------------------------------------------- |
| **Single-file docs**       | Merge conflicts, stale TOC             | `mdcp compile`; `mdcp check` catches orphans       |
| **Broken cross-links**     | Agents guess `#anchor` slugs           | `mdcp check` (optional `mdcp refs-list` for slugs) |
| **Context overload**       | Whole compiled output pasted each turn | Host search, then read one shard                   |
| **Docs drift**             | Shards and output diverge              | `mdcp check` before merge                          |
| **Custom compile scripts** | Bash/Python glue nobody owns           | `compile`, `check`, `@bwilliamson/mdcp-presets`    |

Typical loop: edit shards → `mdcp compile` → `mdcp check` → optional `mdcp refs-list` → read one shard when the next turn needs doc context.

[Install and quick start](./install-and-quick-start.md) covers install and flags, and the [Agent Skill](./about.md#not-the-agent-skill) contains the docs workflows an agent follows.
