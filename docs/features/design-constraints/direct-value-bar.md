# Direct value bar

Product filter for new and existing capabilities: ship only what adds **direct value** the rest of the system cannot already provide.

## Rule

A feature earns a place in core when it closes a gap that hosts and ordinary tooling leave open — and when that gap matters to a documented persona workflow.

**Ship when:**

- Unique contract the repo must enforce (compile, check, slug rules)
- Outcome is testable as mechanism or measured conditional benefit ([claim tiers](../protocol/benefit-claims-and-evidence.md#claim-tiers))
- Workflow fails without it

**Do not ship (or revisit) when:**

- A generic search/read the agent already has (`rg`, IDE search)
- Marketing story that the [claim tiers](../protocol/benefit-claims-and-evidence.md#claim-tiers) don't allow
- Workflow succeeds with shards + `check` alone

Features without a clear direct-value case go **back to the drawing board** — keep the problem statement, drop or demote the surface until a distinct value is demonstrated.

## Applies to

- New CLI verbs, MCP tools, and skill hard rules
- Public WIIFM copy (README, decks) — claim only what the capability uniquely does
- Roadmap items that duplicate host search or generic file open

Part of [Design constraints](./index.md).
