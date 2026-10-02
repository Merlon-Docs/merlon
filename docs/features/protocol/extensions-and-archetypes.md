# Extensions and archetypes

How MDCP stays **broadly applicable** while allowing **project-specific** (and proprietary) customization. Parent spec: [MDCP 1.0 (draft)](./mdcp-1.0-spec.md).

## Problem

A single monolithic agent index cannot serve every documentation culture — open-source libraries with Javadoc-style API surfaces, SaaS products with Docusaurus sites, regulated industries with fixed templates, or teams that want **pointer shards** into source files instead of duplicating implementation detail.

MDCP separates:

| Layer             | Holds                                                         | Edited by                                     |
| ----------------- | ------------------------------------------------------------- | --------------------------------------------- |
| **Protocol core** | Normative shards, schemas, CLI/core packages                  | Upstream mdcp maintainers; adopted by version |
| **Repo shards**   | `features/`, `client/`, `developer/`, `glossary/`             | Your team in git                              |
| **Extensions**    | Complementary skills, local overlays under `docs/extensions/` | Your team; **MAY** be proprietary             |

## Do not hand-edit agent entrypoints for repo-specific guidance

The parent **Agent Skill** (`skills/mdcp/` → your agent's skills directory after `npx skills add`) is the portable agent entrypoint.

| Rule                                                                       | Detail                                                  |
| -------------------------------------------------------------------------- | ------------------------------------------------------- |
| Agents **MUST NOT** hand-edit vendored skill files for one-off repo advice | Changes belong in shards or `docs/extensions/`          |
| Broadly applicable improvements                                            | Propose upstream to `skills/mdcp/` via PR               |
| Project-specific guidance                                                  | `docs/extensions/` or complementary skills you maintain |
| Refresh local dogfood                                                      | `pnpm skill:update` (alias: `pnpm skill:install`)       |

## SOLID principles for MDCP

Design constraints for the protocol and its ecosystem — analogous to SOLID in software design, applied to **documentation context contracts**.

| Principle                 | MDCP meaning                                                                                                            |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| **S**ingle responsibility | Agent Skill = entrypoint and workflow; shards = intent; code = implementation; extensions = vertical overlays           |
| **O**pen/closed           | Core protocol versioned and stable; extend through complementary skills without forking the base skill                  |
| **L**iskov substitution   | Optional extensions **MUST NOT** break core `mdcp check` when disabled; archetypes compose on top of conforming layouts |
| **I**nterface segregation | Compile hooks and complementary skills are separate opt-in surfaces                                                     |
| **D**ependency inversion  | Agents and CI depend on **compiled contracts** and `mdcp check`, not ad-hoc README prose or host-specific rules         |

## Extensions directory

Published and community extensions live as complementary skills under `skills/mdcp-arch-*` (WIP) or local `docs/extensions/`.

| Kind                | Purpose                                                            | Example                                   |
| ------------------- | ------------------------------------------------------------------ | ----------------------------------------- |
| **Archetype**       | "Battery type" end-to-end layout + conventions for a project class | OSS library, product docs site            |
| **Formatting pack** | Lint and style presets for a doc framework                         | Vale/Markdownlint for Docusaurus          |
| **Pointer profile** | Shards as stable links into source; agents read code on demand     | API surface via heading refs + file paths |

### Fork, use locally, or contribute back

- **Fork** complementary skills into your repo under `docs/extensions/` when you need proprietary or experimental packs.
- **Contribute back** via PR when an extension is broadly useful — we want shared archetypes to grow.
- **No obligation** — mdcp uses **MIT**; local-only proprietary extensions are explicitly encouraged when they encode competitive or regulated workflow detail.

**Bootstrap:** Install the skill with `npx skills add betsalel-williamson/mdcp --skill mdcp`. Commit the vendored skill in your agent's skills directory so agents share the same instructions.

**Security:** Agent Skills operate with identical permissions to the user. Treat third-party Agent Skills as untrusted. Future work: trusted-source allowlist and sandboxed execution.

Built-in workflows (such as the feature-level and doc-only workflows) are files inside the `mdcp` skill, which your host loads from the skills directory it discovers. Each Agent Skill is an isolated, independent entity.

## Archetypes ("Battery Types")

An **archetype** (or "battery type") is a documented bundle: guide layout, glossary seeds, optional prompts, and extension pointers for one project class. The goal is to enforce useful structure for human/AI collaboration.

The default MDCP installation provides the **Code Repository Archetype** (`features/`, `client/`, `developer/`, `glossary/`). This is the "batteries-included" pack for software engineering that keeps developer workflows out of client usage and separates high-level feature specs from low-level code.

Because the underlying MDCP engine (`mdcp compile`, `mdcp check`) is domain-agnostic, teams can define alternative archetypes for other documentation systems — for example factory SOPs, equipment manuals, training curricula, Legal Operations, or HR Policies — that use completely different guide tiers.

Current public archetypes:

| Archetype          | Extension id                  | When to use                            | Shard emphasis                                              |
| ------------------ | ----------------------------- | -------------------------------------- | ----------------------------------------------------------- |
| OSS library        | `mdcp-arch-oss-library`       | npm/crates publishable API             | Pointer shards to `src/`; minimal duplication of signatures |
| Product docs site  | `mdcp-arch-product-docs-site` | MkDocs, Docusaurus, VitePress          | `format-*` extension + client guide tier                    |
| Go-to-market / GTM | `mdcp-arch-gtm`               | Marketing, sales, awareness, messaging | `awareness/`, `messaging/`, `audience/` guide tiers         |

Archetype READMEs live under complementary skills — for example `mdcp-arch-oss-library/`, `mdcp-arch-product-docs-site/`, and `mdcp-arch-gtm/`.

Formatting packs use the `mdcp-format-*` prefix.

Start from an archetype README, copy patterns into `docs/`, then customize under `docs/extensions/`.

## Governance vision

MDCP is designed to outgrow a single vendor implementation. The long-term goal is sponsorship under a **neutral foundation** (for example Linux Foundation or similar) so protocol artifacts, extension catalogs, and conformance vectors have a trusted home. Until then, the mdcp repository hosts the reference implementation.

## Related

- [Vision and roadmap](./00-vision-and-roadmap.md)
- [Skill workflows](./skill-workflows.md)
