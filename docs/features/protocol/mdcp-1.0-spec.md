# MDCP 1.0 specification (draft)

Normative specification for the MarkDown Context Protocol.

> **Status:** Draft — reference implementation leads; prose reconciled against `mdcp-core` before calling the specification final. Protocol versioning is independent of package semver. Agent entrypoint is the parent **Agent Skill** (`/mdcp`).

## 1. Introduction

MDCP defines **offline document context preparation**: shard layout, compile semantics, validation pipeline, and Agent Skill development. It does **not** define wire transport (see [Scope and positioning](./01-scope-and-positioning.md)).

Conformance keywords: **MUST**, **SHOULD**, **MAY** (RFC 2119 sense).

## 2. Default Guide Layout (Code Repository Archetype)

Conforming repositories **SHOULD** organize shards into guides listed in `compileOrder`. This default structure—often referred to as the **Code Repository Archetype**—is the "batteries-included" layout for software engineering projects:

| Guide tier | Typical path | Holds                                                                                                  | Keep out                                                     |
| ---------- | ------------ | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------ |
| Features   | `features/`  | Product capabilities, design/ADRs, contracts, acceptance criteria                                      | Maintainer runbooks, CI/eval loops, contributor setup        |
| Client     | `client/`    | Consumer value and usage of the product, including install and configuration                           | Internal contributor process, skill authoring and live evals |
| Developer  | `developer/` | Repo setup, layout, validation, workflow, tracker integration, releases, skill development, live evals | Product capability specs or end-user tutorials               |
| Glossary   | `glossary/`  | Shared terms and disambiguation                                                                        | General code snippets                                        |

The tiers keep a growing docs set coherent. Contributor workflow stays out of consumer usage, and product specs stay apart from code-level detail. Place each shard by audience and job, not by topic, because one subject can span tiers. A skill's product contract and install steps serve consumers, so they go in `features/` and `client/`. Its maintainer evals go in `developer/`.

**Placement test:** if consumers of the product need the shard, it belongs in `features/` or `client/`. If only contributors to the repository need it, it belongs in `developer/`. Split a shard that mixes consumer material with contributor-only material ([idea mitosis](./shard-srp-and-mitosis.md#split-when)).

Each guide **MUST** have a manifest (`index.md` or `shards.md`) defining compile order.

Glossary terms **SHOULD** be one shard per entry. When guides stitch glossary terms through `compile.scopeRoot`, large glossaries **MAY** group term links into sub-index files that `index.md` links. Compile follows links from those files and includes the terms in compile output. See [Shared glossary](../../client-cli/config-essentials.md#shared-glossary).

The MDCP engine itself is agnostic. Other documentation systems (e.g., Legal Operations, HR Policies) **MAY** introduce their own "battery types" (archetypes) with completely different guide tiers using the same underlying `mdcp compile` and `mdcp check` mechanics.

## 3. Skill workflows

Skill workflows are part of the MDCP 1.0 authoring profile. The `mdcp` skill selects one per task (e.g. the feature-level workflow for a code change). See [Skill workflows](./skill-workflows.md).

Work-item workflows **MUST** resolve `WORK_ITEM` and `WORK_ITEM_LOOKUP` before editing, as [Required intake](./skill-workflows.md#required-intake) defines. Feature work **SHOULD** use the [feature-level workflow](./workflows/feature-level.md).

## 4. Skills and immutability

The Agent Skills pack in a consumer docs root **MUST NOT** be hand-edited by agents for repo-specific content. Project overlays belong in `docs/extensions/` or normative shards. Extension packs and archetypes: [Extensions and archetypes](./extensions-and-archetypes.md).

## 5. Agent context delivery

Agent context comes from the parent **Agent Skill** and one-shard reads. There is no token-strip export profile — see [ADR 0001](../adr/0001-remove-export-profiles.md).

## Appendix A (informative)

MDCP vs MCP and delivery adapters: [01-scope-and-positioning.md](./01-scope-and-positioning.md)
