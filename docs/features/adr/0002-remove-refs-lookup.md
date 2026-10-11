# ADR 0002: Remove `mdcp refs lookup`

- **Status:** Accepted
- **Date:** 2026-07-14
- **Supersedes:** `mdcp refs lookup` CLI verb and the public `lookupHeadings` helper

## Context

Open-alpha mdcp exposed `mdcp refs lookup` (and `lookupHeadings`) as if refs were a **retrieval** API for finding documentation. That collided with how agents already work — host search (`rg`, IDE search) finds shards — and with the real job of the refs system: keep **compiled** heading slugs and cross-links coherent after stitch (`refs gen` / compile side effect, `refs-list`, `refs check` via `mdcp check`).

A lookup verb failed the [direct value bar](../design-constraints/direct-value-bar.md): it duplicated host search without a unique contract, and it encouraged WIIFM claims that MDCP “retrieves context” when discovery is not MDCP’s job.

## Decision

Remove `mdcp refs lookup` and the `lookupHeadings` export. Prefer:

- Host search and one-shard reads for doc discovery
- `mdcp check` (and optional `mdcp refs-list`) for cross-link / slug integrity against the [refs registry](../../glossary/refs-registry.md)

Consumer notice of the breaking API removal lives in the package [CHANGELOG](../../../packages/merlon-docs-cli/CHANGELOG.md) (0.5.0), not in feature-catalog shards.

## Consequences

- [Feature catalog](../feature-catalog.md) describes the refs registry for validation only; it does not document a lookup verb.
- Invoking `mdcp refs lookup` fails (contract tests lock the removal).
- Product claims must not market a MDCP lookup / retrieval verb — see [Benefit claims and evidence](../protocol/benefit-claims-and-evidence.md).
- Optional later retrieval surfaces (for example MCP index) stay separate roadmap items, not a reintroduction of `refs lookup` under the same name.
