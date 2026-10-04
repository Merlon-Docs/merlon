# Vision and roadmap

MDCP (**MarkDown Context Protocol**) is an [Agent Skill](../../glossary/agent-skills.md) and practice for **system context**: intent, design, and terminology in Markdown shards, with compile and check so the same docs serve people and agents.

## Problem

Large documentation dumps (single-file README, site-wide `llms.txt`, crawled corpora like Context7) overload agents' context windows. Teams also lack a shared, reviewable place for **what documentation means**, especially when legacy projects reuse the same terms for different concepts. Mind maps, arch docs, and specs scatter across tools and never compound in the repo.

MDCP does not magically erase documentation debt. It helps head it off by putting durable context in the right place: **small shards** are the source of truth; agents and humans pull **one section at a time** (host search is enough to find it). That scale works for a team of one or a full product, engineering, and marketing org.

## Principles

| Principle                      | Implication                                                                                                      |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| High level over implementation | Shards hold plan, constraints, acceptance criteria; implementation and procedures live in code or source systems |
| Glossary as first-class        | Domain terms and legacy disambiguation live in dedicated shards                                                  |
| Document before build/migrate  | Capture context in shards before greenfield work or migrations                                                   |
| Granular, safe context         | Read one shard; compiled output only when a broader read is intentional                                          |
| Direct value only              | Ship capabilities that close a unique gap                                                                        |
| Skill + open toolchain         | Delivered as an Agent Skill; CLI/`mdcp-core` implement compile and check without locking you into a host         |
| Extensions over core           | `docs/extensions/` locally; shared packs in complementary skills                                                 |

Filter for new capabilities: [Direct value bar](../design-constraints/direct-value-bar.md).

## Phased delivery

| Phase  | Surface                                                                                              | Access model                                                                                              |
| ------ | ---------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| **V1** | **Agent Skills** pack (`skills/mdcp` via `npx skills add`) + `mdcp compile`/`check` + task workflows | **V1 transport:** repo access (git clone, SSH, IDE) — delivery surface for shards, not the content domain |
| **V2** | MDCP MCP server (shard read, glossary search)                                                        | Repo access                                                                                               |
| **V3** | Hosted context API (OpenAPI spec, API keys, polyglot clients)                                        | Opt-in publish                                                                                            |

```text
  V1 authoring     shards → compile → check → Agent Skill (/mdcp)
        ↓
  V2 delivery      MCP adapter (optional)
        ↓
  V3 delivery      HTTPS API + API keys (optional)
```

**V1 phase ≠ semver 1.0.** Roadmap phase names describe delivery surfaces. Each package or skill’s stability promise begins at that item’s **1.0.0** — packages and skills version independently and currently publish as `0.x`.

Later phases (MCP, hosted API) are alternate **delivery** surfaces; they do not redefine the documentation domain.

The V1 authoring profile includes the [Skill workflows](./skill-workflows.md).

[Scope and positioning](./01-scope-and-positioning.md) explains how MDCP relates to MCP and to OpenAPI. [Alternatives and adoption](./02-alternatives-and-adoption.md) compares MDCP with other doc stacks and says how they coexist.
