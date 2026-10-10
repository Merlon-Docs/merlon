# About this guide

**Audience:** coding agents and technical readers who need to know what mdcp does. mdcp is the MarkDown Context Protocol (MDCP) toolchain and Agent Skill, and this guide covers its commands and design decisions.

This is the **features** guide (`docs/features/`): capabilities and behavior of the tool itself. Begin with [Overview](./overview.md) for the high-level pipeline, then use the sections below for specifics. The [Glossary](../glossary/index.md) defines shared terms. Moving existing docs into shards starts with [Shard split](./feature-catalog.md#shard-split), and [Consumer migration](../client-cli/consumer-migration.md) in the CLI guide walks through it.

**Belongs here:** what the product does — commands, design/ADRs, contracts, acceptance criteria.  
**Does not belong here:** maintainer runbooks, live skill evals, contributor setup, or consumer how-to tutorials (those are [Developer](../developer/index.md) or client guides).

For how to contribute to this repository (setup, tests, changesets, releases, and **Agent Skill development**), read the [Developer Guide](../developer/index.md).

Consumer adoption docs compile separately into the npm package READMEs, from `docs/client-cli/` and `docs/client-core/`. The root [README](../../README.md) compiles from `docs/repo-readme/`.

Which guide a shard belongs in: the placement test in [Default guide layout](./protocol/mdcp-1.0-spec.md#2-default-guide-layout-code-repository-archetype).
