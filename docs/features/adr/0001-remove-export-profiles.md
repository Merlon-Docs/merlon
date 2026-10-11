# ADR 0001: Remove `mdcp export` profiles

- **Status:** Accepted
- **Date:** 2026-07-14
- **Supersedes:** Token-strip `mdcp export --llm`, llms-index export (`--llms-index` / `--fetch`), and related config / bootstrap artifacts

## Context

Open-alpha mdcp shipped CLI export profiles that tried to package documentation for agents: a token-strip `--llm` dump, plus `--llms-index` / `--fetch` bootstraps that produced `mdcp.v*.llms.txt` and related cache layout. That overlapped the parent **Agent Skill** entrypoint and the usage model of host search plus one-shard reads.

Those profiles failed the [direct value bar](../design-constraints/direct-value-bar.md): agents already search and open shards; maintaining a second bootstrap path duplicated surface area without a unique contract that `compile` / `check` and the skill do not already cover.

## Decision

Remove the `mdcp export` verb and the `--llm`, `--llms-index`, and `--fetch` profiles from the supported product. Prefer:

- Parent Agent Skill (`npx skills add betsalel-williamson/mdcp --skill mdcp`) for agent workflow
- Host search and one-shard reads for context
- `mdcp compile` / `mdcp check` for authored docs and CI

Consumer migration and breaking-change notice live in the package [CHANGELOG](../../../packages/merlon-docs-cli/CHANGELOG.md) (0.5.0), not in feature-catalog shards.

## Consequences

- [Feature catalog](../feature-catalog.md) lists current capabilities only; it does not document removed export profiles.
- Invoking `mdcp export` fails with guidance toward the Agent Skill and shard reads.
- Roadmap delivery after export removal is Agent Skills + compile/check (V1); optional MCP / hosted access stay separate pipeline items in [Vision and roadmap](../protocol/00-vision-and-roadmap.md).
