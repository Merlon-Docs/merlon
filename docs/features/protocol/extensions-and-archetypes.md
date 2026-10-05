# Extensions and archetypes

How MDCP stays **broadly applicable** while allowing **project-specific** (and proprietary) customization. Parent spec: [MDCP 1.0 (draft)](./mdcp-1.0-spec.md).

## Problem

One agent index cannot serve every documentation culture: open-source libraries with Javadoc-style API surfaces, SaaS products with Docusaurus sites, regulated industries with fixed templates, or teams that want **pointer shards** into source files instead of duplicating implementation detail.

MDCP separates:

| Layer             | Holds                                                         | Edited by                                     |
| ----------------- | ------------------------------------------------------------- | --------------------------------------------- |
| **Protocol core** | Normative shards, schemas, CLI/core packages                  | Upstream mdcp maintainers; adopted by version |
| **Repo shards**   | `features/`, `client/`, `developer/`, `glossary/`             | Your team in git                              |
| **Extensions**    | Complementary skills, local overlays under `docs/extensions/` | Your team; **MAY** be proprietary             |

Agents don't hand-edit the vendored skill with repo-specific guidance, which goes in repo shards or the extensions layer ([MDCP 1.0 §5](./mdcp-1.0-spec.md#5-skills-and-immutability)).

## SOLID principles for MDCP

Design constraints for the protocol and its ecosystem — analogous to SOLID in software design, applied to **documentation context contracts**.

| Principle                 | MDCP meaning                                                                                                                                                |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **S**ingle responsibility | Agent Skill = entrypoint and workflow; shards = intent; code = behavior; extensions = vertical overlays                                                     |
| **O**pen/closed           | Core protocol versioned; extend through complementary skills without forking the base skill                                                                 |
| **L**iskov substitution   | Optional extensions **SHOULD NOT** break core `mdcp check` when disabled; archetypes compose on top of conforming layouts                                   |
| **I**nterface segregation | Built-in [compile hooks](../default-compile-hooks.md) run by default, and a guide switches each one off in `compile.hooks`; complementary skills are opt-in |
| **D**ependency inversion  | Agents and CI depend on **compiled contracts** and `mdcp check`, not ad-hoc README prose or host-specific rules                                             |

These principles are advisory ([Enforceable rules](../design-constraints/enforceable-rules.md)): `mdcp check` doesn't test them, so whoever designs a change to the protocol or an extension applies them, and the change's review is the evidence.

## Extensions directory

Extensions are complementary skills. mdcp's own are the internal archetypes under `skills/mdcp-arch-*`, and a project can add its own in a local `docs/extensions/`.

| Kind                | Purpose                                                            | Example                                   |
| ------------------- | ------------------------------------------------------------------ | ----------------------------------------- |
| **Archetype**       | "Battery type" end-to-end layout + conventions for a project class | OSS library, product docs site            |
| **Formatting pack** | Lint and style presets for a doc framework                         | Vale/Markdownlint for Docusaurus          |
| **Pointer profile** | Shards as stable links into source; agents read code on demand     | API surface via heading refs + file paths |

### Fork, use locally, or contribute back

- **Fork** complementary skills into your repo under `docs/extensions/` when you need proprietary or experimental packs.
- **Contribute back** via PR when an extension or a change to `skills/mdcp/` is broadly useful. We want shared archetypes to grow.
- **No obligation** — mdcp uses **MIT**; local-only proprietary extensions are explicitly encouraged when they encode competitive or regulated workflow detail.

**Security:** A skill runs with the same permissions as the user. Treat third-party skills as untrusted.

Each Agent Skill is an isolated, independent entity.

## Archetypes ("Battery Types")

An **archetype** (or "battery type") is a documented bundle: guide layout, glossary seeds, optional prompts, and extension pointers for one project class. The goal is to enforce useful structure for human/AI collaboration.

The default MDCP installation provides the **Code Repository Archetype** (`features/`, `client/`, `developer/`, `glossary/`), the "batteries-included" pack for software engineering. [Default guide layout](./mdcp-1.0-spec.md#2-default-guide-layout-code-repository-archetype) defines its tiers.

Because the underlying MDCP engine (`mdcp compile`, `mdcp check`) is domain-agnostic, teams can define alternative archetypes for other documentation systems — for example factory SOPs, equipment manuals, training curricula, Legal Operations, or HR Policies — that use completely different guide tiers.

The archetype extensions in this repository are internal (`metadata.internal: true`) and not released, as [Publishing the skill pack](../../developer/agent-skill.md#publishing-the-skill-pack) says:

| Archetype          | Extension id                  | When to use                            | Shard emphasis                                                                         |
| ------------------ | ----------------------------- | -------------------------------------- | -------------------------------------------------------------------------------------- |
| OSS library        | `mdcp-arch-oss-library`       | npm/crates publishable API             | Pointer shards to `src/`; minimal duplication of signatures                            |
| Product docs site  | `mdcp-arch-product-docs-site` | MkDocs, Docusaurus, VitePress          | A `format-*` formatting pack (a naming slot; no such skill exists) + client guide tier |
| Go-to-market / GTM | `mdcp-arch-gtm`               | Marketing, sales, awareness, messaging | `awareness/`, `messaging/`, `audience/` guide tiers                                    |
| Research project   | `mdcp-arch-research`          | Studies, field reports, benchmarks     | `research/` tier of dated records beside `design-constraints/`                         |

Each archetype is a `SKILL.md` under `skills/mdcp-arch-*`. Start from an archetype's `SKILL.md`, copy its patterns into `docs/`, then customize under `docs/extensions/`.

## Related

- [Vision and roadmap](./00-vision-and-roadmap.md)
- [Skill workflows](./skill-workflows.md)
