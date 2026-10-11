# Vision and roadmap

**Merlon Docs** is a documentation system for software projects. An [Agent Skill](../../glossary/agent-skills.md) drafts **system context** in Markdown shards and people review it, so a project's intent and terminology stay in the repository. Compile and check let the same docs serve people and agents. Teams record the durable information they need to develop and operate their software while they do the work, instead of after it.

## Problem

Large documentation dumps (single-file README, site-wide `llms.txt`, crawled corpora like Context7) overload agents' context windows. Teams also lack a shared, reviewable place for **what documentation means**, especially when legacy projects reuse the same terms for different concepts. Mind maps, arch docs, and specs scatter across tools and never compound in the repo.

Merlon Docs does not magically erase documentation debt. It helps head it off by putting durable context in the right place: **small shards** are the source of truth; agents and humans pull **one section at a time** (host search is enough to find it). That scale works for a team of one or a full product, engineering, and marketing org.

[Documentation and software reliability](./documentation-and-reliability.md) sets out what the sources say about documentation quality and the cost of unreliable software. The measurements and field reports behind Merlon Docs’ own claims are [research records](./research/about-research-records.md).

## Principles

| Principle                      | Implication                                                                                                             |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| High level over implementation | Shards hold plan, constraints, acceptance criteria; implementation and procedures live in code or source systems        |
| Glossary as first-class        | Domain terms and legacy disambiguation live in dedicated shards                                                         |
| Document before build/migrate  | Capture context in shards before greenfield work or migrations                                                          |
| Granular, safe context         | Read one shard at a time, found with host search, as [refs](../../glossary/refs.md) says                                |
| Direct value only              | Ship capabilities that close a unique gap                                                                               |
| Skill + open toolchain         | Delivered as an Agent Skill; CLI/`merlon-docs-core` implement compile and check without locking you into a host         |
| Extensions over core           | [`docs/extensions/`](./extensions-and-archetypes.md#extensions-directory) locally; shared packs in complementary skills |

Filter for new capabilities: [Direct value bar](../design-constraints/direct-value-bar.md).

## Phased delivery

| Phase  | Surface                                                                                                                 | Access model                                                                                                           |
| ------ | ----------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| **V1** | The Merlon Docs **Agent Skill** (`skills/merlon-docs` via `npx skills add`) + `merlon compile`/`check` + task workflows | **V1 transport:** [repo access](./01-scope-and-positioning.md#documentation-domain-vs-transport) (git clone, SSH, IDE) |
| **V2** | Merlon Docs MCP server (shard read, glossary search)                                                                    | Repo access                                                                                                            |
| **V3** | Hosted context API (OpenAPI spec, API keys, polyglot clients)                                                           | Opt-in publish                                                                                                         |

```text
  V1 authoring     shards → compile → check → Agent Skill (/merlon-docs)
        ↓
  V2 delivery      MCP adapter (optional)
        ↓
  V3 delivery      HTTPS API + API keys (optional)
```

**V1 phase ≠ semver 1.0.** Roadmap phase names describe delivery surfaces. Package and skill versions follow the [pre-1.0 policy](../../developer/versioning-and-releases.md#pre-10-policy-0xy).

Later phases (MCP, hosted API) are alternate **delivery** surfaces; they do not redefine the documentation domain.

The V1 authoring profile includes the [Skill workflows](./skill-workflows.md).

[Scope and positioning](./01-scope-and-positioning.md) explains how Merlon Docs relates to MCP and to OpenAPI. [Alternatives and adoption](./02-alternatives-and-adoption.md) compares Merlon Docs with other doc stacks and says how they coexist.

## Governance

Merlon Docs is an open-source product of Williamson Computing Services, MIT licensed. The plan is to keep growing adoption and, if that goes well, to move the project to an **open source foundation** that gives its specification and extension catalogs a neutral home. The Merlon Docs repository hosts the reference toolchain.
