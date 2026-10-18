# Extensions and archetypes

How Merlon Docs stays **broadly applicable** while allowing **project-specific** (and proprietary) customization. Parent spec: [Merlon Docs 1.0](./merlon-docs-1.0-spec.md).

## Problem

One agent index cannot serve every documentation culture: open-source libraries with Javadoc-style API surfaces, SaaS products with Docusaurus sites, regulated industries with fixed templates, or teams that want **pointer shards** into source files instead of duplicating implementation detail.

Merlon Docs separates:

| Layer           | Holds                                                         | Edited by                                            |
| --------------- | ------------------------------------------------------------- | ---------------------------------------------------- |
| **System core** | Normative shards, schemas, CLI/core packages                  | Upstream Merlon Docs maintainers; adopted by version |
| **Repo shards** | `features/`, `client/`, `developer/`, `glossary/`             | Your team in git                                     |
| **Extensions**  | Complementary skills, local overlays under `docs/extensions/` | Your team; **MAY** be proprietary                    |

Agents don't hand-edit the vendored skill with repo-specific guidance, which goes in repo shards or the extensions layer ([Merlon Docs 1.0 §5](./merlon-docs-1.0-spec.md#5-skills-and-immutability)).

## SOLID principles for Merlon Docs

Design constraints for the system and its ecosystem — analogous to SOLID in software design, applied to **documentation context contracts**.

| Principle                 | Merlon Docs meaning                                                                                                                                         |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **S**ingle responsibility | Agent Skill = entrypoint and workflow; shards = intent; code = behavior; extensions = vertical overlays                                                     |
| **O**pen/closed           | Core system versioned; extend through complementary skills without forking the base skill                                                                   |
| **L**iskov substitution   | Optional extensions **SHOULD NOT** break core `merlon check` when disabled; archetypes compose on top of conforming layouts                                 |
| **I**nterface segregation | Built-in [compile hooks](../default-compile-hooks.md) run by default, and a guide switches each one off in `compile.hooks`; complementary skills are opt-in |
| **D**ependency inversion  | Agents and CI depend on **compiled contracts** and `merlon check`, not ad-hoc README prose or host-specific rules                                           |

These principles are advisory ([Enforceable rules](../design-constraints/enforceable-rules.md)): `merlon check` doesn't test them, so whoever designs a change to the system or an extension applies them, and the change's review is the evidence.

## Extensions directory

Merlon Docs ships one skill, and it works alongside the other skills and tools in an agent. Extending it is optional: a project that needs more can add its own extensions in a local `docs/extensions/`. Register that directory as a [guide](../../glossary/guide.md) with its own manifest, its files as `standaloneGuides` entries, or the directory in `scan.ignore`. Otherwise the [coverage scan](../coverage-scan.md) reports each markdown file in it as uncaptured, and `merlon check` fails under `scan.strict: true`.

| Kind                | Purpose                                                            | Example                                   |
| ------------------- | ------------------------------------------------------------------ | ----------------------------------------- |
| **Archetype**       | "Battery type" end-to-end layout + conventions for a project class | OSS library, product docs site            |
| **Formatting pack** | Lint and style presets for a doc framework                         | Vale/Markdownlint for Docusaurus          |
| **Pointer profile** | Shards as stable links into source; agents read code on demand     | API surface via heading refs + file paths |

### Fork, use locally, or contribute back

- **Keep** your own extensions in your repo under `docs/extensions/` when you need proprietary or experimental packs.
- **Contribute back** via PR when a change to `skills/merlon-docs/` or the engine is broadly useful.
- **No obligation** — Merlon Docs uses **MIT**; local-only proprietary extensions are explicitly encouraged when they encode competitive or regulated workflow detail.

[Skill security](../agent-skill.md#skill-security) in Agent Skill says that a skill runs with the user's permissions and that a third-party skill is untrusted.

## Archetypes ("Battery Types")

An **archetype** (or "battery type") is a documented bundle: guide layout, glossary seeds, optional prompts, and extension pointers for one project class. The goal is to enforce useful structure for human/AI collaboration.

The default Merlon Docs installation provides the **Code Repository Archetype** (`features/`, `client/`, `developer/`, `glossary/`), the "batteries-included" pack for software engineering. [Default guide layout](./merlon-docs-1.0-spec.md#2-default-guide-layout-code-repository-archetype) defines its tiers.

Because the underlying Merlon Docs engine (`merlon compile`, `merlon check`) is domain-agnostic, teams can define alternative archetypes for other documentation systems — for example factory SOPs, equipment manuals, training curricula, Legal Operations, or HR Policies — that use completely different guide tiers.

Merlon Docs ships only the Code Repository Archetype. A team that needs another one defines its guide tiers in its own manifests, and can keep any conventions or prompts for it in `docs/extensions/`.

## Related

- [Vision and roadmap](./00-vision-and-roadmap.md)
- [Skill workflows](./skill-workflows.md)
