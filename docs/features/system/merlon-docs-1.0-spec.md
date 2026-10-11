# Merlon Docs 1.0 specification (draft)

Normative specification for [Merlon Docs](../../glossary/merlon-docs.md), the open standard for a documentation system.

> The reference implementation leads and this text follows it. The specification version, `standardVersion` in the config schema, is independent of package semver. Configs written before the rename name it `protocolVersion`, which the toolchain reads until the next major release. Agent entrypoint is the parent **Agent Skill** (`/merlon-docs`).

## 1. Introduction

Merlon Docs defines **offline document context preparation**, from shard layout and compile semantics to the validation pipeline and the skill workflows. It does **not** define wire transport (see [Scope and positioning](./01-scope-and-positioning.md)).

Conformance keywords: **MUST**, **SHOULD**, **MAY** (RFC 2119 sense).

## 2. Default Guide Layout (Code Repository Archetype)

Conforming repositories **SHOULD** organize shards into guides listed in `compileOrder`. This default structure—often referred to as the **Code Repository Archetype**—is the "batteries-included" layout for software engineering projects:

| Guide tier | Typical path | Holds                                                                                                  | Keep out                                                                    |
| ---------- | ------------ | ------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------- |
| Features   | `features/`  | Product capabilities, design/ADRs, contracts, acceptance criteria                                      | Maintainer runbooks, live eval suites, contributor setup, code walkthroughs |
| Client     | `client/`    | Consumer value and usage of the product, including install and configuration                           | Internal contributor process, skill authoring and live evals                |
| Developer  | `developer/` | Repo setup, layout, validation, workflow, tracker integration, releases, skill development, live evals | Product capability specs or end-user tutorials                              |
| Glossary   | `glossary/`  | Shared terms and disambiguation                                                                        | General code snippets                                                       |

The tiers keep a growing docs set coherent. Contributor workflow stays out of consumer usage, and product specs stay apart from code-level detail. Place each shard by audience and job, not by topic, because one subject can span tiers. A skill's product contract and install steps serve consumers, so they go in `features/` and `client/`. Its maintainer evals go in `developer/`.

**Placement test:** if consumers of the product need the shard, it belongs in `features/` or `client/`. If only contributors to the repository need it, it belongs in `developer/`. Split a shard that mixes consumer material with contributor-only material ([idea mitosis](./shard-srp-and-mitosis.md#split-when)).

Each guide **MUST** have a manifest (`index.md` or `shards.md`) defining compile order. The Orphans stage of `merlon check` fails a guide without a readable manifest, as the [Check gate](../check-gate.md#check-gate-stages) specifies.

Glossary terms **SHOULD** be one shard per entry. [Shared glossary](../../client-cli/shared-glossary.md) says how guides stitch the terms through `compile.scopeRoot` and when a large glossary groups them into sub-index files.

Other documentation systems **MAY** introduce their own [archetypes](./extensions-and-archetypes.md#archetypes-battery-types) with different guide tiers on the same `merlon compile` and `merlon check` mechanics.

## 3. Compile and validation

The normative clauses for compile and validation are the twelve shards that the Features guide's manifest, `docs/features/index.md`, groups under Compile and validate. These eight are the entry points, and they link the other four:

- [Manifest compile order](../manifest-compile-order.md): the order a guide's manifest gives its shards in compiled output
- [Default compile hooks](../default-compile-hooks.md): the hooks that run on each shard unless a guide switches them off
- [Compile pipeline](../compile-pipeline/index.md): the assembly steps that run whatever `compile.hooks` says, link rewriting and table re-alignment among them
- [Check gate](../check-gate.md): the stages of `merlon check`, the validation gate
- [Link validation](../link-validation.md): the internal links and anchors that must resolve
- [Refs registry path](../refs-registry-path.md): where compile writes the refs registry and where commands read it
- [Source tags and default banner](../source-tags-and-banner.md): the source tags and the warning banner compile writes into each output unless the config switches them off
- [Compile output backup](../compile-output-backup.md): the opt-in backup of an output before compile overwrites it

## 4. Skill workflows

Skill workflows are part of the Merlon Docs 1.0 authoring profile. The `merlon-docs` skill selects one per task (e.g. the feature-level workflow for a code change). See [Skill workflows](./skill-workflows.md).

Work-item workflows **MUST** resolve `WORK_ITEM` and `WORK_ITEM_LOOKUP` before editing, as [Required intake](./skill-workflows.md#required-intake) defines. Feature work **SHOULD** use the [feature-level workflow](./workflows/feature-level.md). Both rules are advisory, like the other obligations on [Skill workflows](./skill-workflows.md), which says who applies them and what evidence a session leaves.

## 5. Skills and immutability

The Merlon Docs Agent Skill installed in an agent's skills directory **MUST NOT** be hand-edited for repo-specific content. The rule is advisory ([Enforceable rules](../design-constraints/enforceable-rules.md)), because `merlon check` reads the docs root and never an installed skill. Whoever changes the repository applies it, and the change's review is the evidence. Project overlays belong in `docs/extensions/`, registered as [Extensions directory](./extensions-and-archetypes.md#extensions-directory) says, or in repo shards. [Extensions and archetypes](./extensions-and-archetypes.md) covers extension packs and archetypes.

## 6. Agent context delivery

Agent context comes from the parent **Agent Skill** and one-shard reads ([ADR 0001](../adr/0001-remove-export-profiles.md)).

## Appendix A (informative)

Merlon Docs vs MCP and delivery adapters: [01-scope-and-positioning.md](./01-scope-and-positioning.md)
