# MDCP Feature Catalog

Product documentation for **what mdcp is designed to do** — the problems it solves, how commands connect, and where to read implementation details.

**Start here:** [Overview](./overview.md) explains the mental model (shards → compile → validate → Agent Skill), package roles, and a code map. The sections below go deeper on specific topics.

- [MDCP Feature Catalog](#table-of-contents)
  - [About this guide](./about-this-guide.md)

## Start here

- [Overview](./overview.md)
- [Glossary](../glossary/index.md)
- [Personas and priority tiers](./personas-and-priority-tiers.md)
- [Feature catalog](./feature-catalog.md)

## Compile and validate

- [Manifest compile order](./manifest-compile-order.md)
- [Default compile hooks](./default-compile-hooks.md)
- [Source tags and default banner](./source-tags-and-banner.md)
- [Compile output backup](./compile-output-backup.md)
- [Link validation](./link-validation.md)
- [Documentation coverage scan](./coverage-scan.md)
- [Refs registry path](./refs-registry-path.md)

## Agent Skill and its workflows

- [Agent Skill](./agent-skill.md)
- [Skill workflows](./protocol/skill-workflows.md)
- [Getting-started workflow](./protocol/workflows/getting-started.md)
- [Feature-level workflow](./protocol/workflows/feature-level.md)
- [Doc-only workflow](./protocol/workflows/doc-only.md)
- [Design-architecture workflow](./protocol/workflows/design-architecture.md)
- [UX workflow](./protocol/workflows/ux.md)
- [Doc-review workflow](./protocol/workflows/doc-review.md)

## Decisions and constraints

- [Architecture decision records](./adr/index.md)
- [ADR 0001 — Remove `mdcp export` profiles](./adr/0001-remove-export-profiles.md)
- [ADR 0002 — Remove `mdcp refs lookup`](./adr/0002-remove-refs-lookup.md)
- [ADR 0003 — Do not adopt OKF](./adr/0003-do-not-adopt-okf.md)
- [ADR 0004 — Decline a hard-gated branch-before-edit skill rule](./adr/0004-decline-branch-before-edit-hard-gate.md)
- [ADR 0005 — Keep linear TypeScript scanners over rg, Peggy, or Rust](./adr/0005-keep-ts-scanners-over-rg-peggy-rust.md)
- [Design constraints](./design-constraints/index.md)

## Protocol

- [Vision and roadmap](./protocol/00-vision-and-roadmap.md)
- [Scope and positioning](./protocol/01-scope-and-positioning.md)
- [Alternatives and adoption](./protocol/02-alternatives-and-adoption.md)
- [Benefit claims and evidence](./protocol/benefit-claims-and-evidence.md)
- [Field report: a fully automated repository](./protocol/field-report-automated-repository.md)
- [Usage model](./protocol/usage-model.md)
- [Shard single responsibility and idea mitosis](./protocol/shard-srp-and-mitosis.md)
- [Acknowledgments](./protocol/acknowledgments.md)
- [Performance goals and review](./protocol/performance.md)
- [MDCP 1.0 spec (draft)](./protocol/mdcp-1.0-spec.md)
- [Extensions and archetypes](./protocol/extensions-and-archetypes.md)
- [Format specification](./protocol/format-specification.md)
