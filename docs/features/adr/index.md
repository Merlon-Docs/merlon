# Architecture decision records

Durable product scope decisions for this repository. **Feature**, **client**, and **developer** shards describe the product as it works now. Removed or rejected surfaces are recorded here (rationale) and in package **CHANGELOGs** (consumer migration), not in the [Feature catalog](../feature-catalog.md). Never link ADRs to pending `.changeset/*.md` files — those notes are temporary and disappear when versioned.

Delivery backlog and roadmap tracks stay in GitHub issues / the project board — see [Agent work-item tracking](../../developer/agent-work-item-tracking.md).

## Records

- [ADR 0001 — Remove `mdcp export` profiles](./0001-remove-export-profiles.md)
- [ADR 0002 — Remove `mdcp refs lookup`](./0002-remove-refs-lookup.md)
- [ADR 0003 — Do not adopt OKF](./0003-do-not-adopt-okf.md)
- [ADR 0004 — Decline a hard-gated branch-before-edit skill rule](./0004-decline-branch-before-edit-hard-gate.md)
- [ADR 0005 — Keep linear TypeScript scanners over rg, Peggy, or Rust](./0005-keep-ts-scanners-over-rg-peggy-rust.md)
- [ADR 0006 — Publish one skill that routes to workflows](./0006-one-skill-with-workflows.md)
- [ADR 0007 — Review the docs as a set in their own workflow](./0007-doc-review-workflow.md)
