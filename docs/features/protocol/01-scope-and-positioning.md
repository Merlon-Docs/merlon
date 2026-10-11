# Scope and positioning

[Vision and roadmap](./00-vision-and-roadmap.md) covers the full phased delivery model.

## Protocol class

[MDCP](../../glossary/mdcp.md) is an **offline document context protocol**. It differs from a wire protocol such as [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) on every row below.

| Dimension       | MCP                                       | MDCP                                                                    |
| --------------- | ----------------------------------------- | ----------------------------------------------------------------------- |
| Problem         | Runtime tool and data access for AI hosts | Author, compile, and validate documentation context                     |
| Interaction     | JSON-RPC session                          | Files on disk + batch CLI                                               |
| Source of truth | Server-defined                            | **Shards in version control (git in V1)**; compiled output is generated |
| Validation      | Server-defined                            | One validation gate, `mdcp check`                                       |

## Why MDCP is not an MCP server

1. **Authoring is the hard part** — MCP reads what exists; it does not enforce shard manifests, compile order, link rewriting, or orphan detection.
2. **CI and version control (git in V1) are first-class for the V1 transport** — documentation context must be reviewable in PRs and reproducible from a commit.
3. **Complementary** — an optional MCP adapter (V2) exposes _already-compiled_ MDCP outputs; it sits on top of MDCP, not instead of it.

```text
  [Authoring]  MDCP: shards → compile → check
       ↓
  [Delivery]   V1: Agent Skill + one-shard reads (host search)
               V2: MCP adapter (optional)
       ↓
  [Consumers]  agent host, CI, human reviewers
```

## Documentation domain vs transport

MDCP is for **technical documentation** broadly: durable procedural or system docs such as software specs.

**V1 transport** is a version-controlled file tree (typically a git repo plus CI/PR review). That is how shards are authored and validated today — not a limit on _what_ you document.

Content domain is **orthogonal** to transport. The [Code Repository Archetype](./extensions-and-archetypes.md#archetypes-battery-types) is the default layout for software teams, not the protocol's only use.

## OpenAPI analogy

OpenAPI defines HTTP API contracts. MDCP defines **documentation context contracts** for a shard tree: shard layout, compile invariants, and the refs registry. The analogy is about clear contracts — MDCP itself is positioned as an Agent Skill and toolchain, not an industry “standard” to join.

## Normative core vs reference implementation

| Layer                     | Owner                                                                                                  |
| ------------------------- | ------------------------------------------------------------------------------------------------------ |
| Normative spec (MDCP 1.0) | `docs/features/` (protocol/ plus the compile and check specs)                                          |
| Protocol artifacts        | Schema files in `packages/mdcp-core/`                                                                  |
| Extension packs           | complementary skills + local [`docs/extensions/`](./extensions-and-archetypes.md#extensions-directory) |
| Reference implementation  | `@bwilliamson/mdcp-cli`, `@bwilliamson/mdcp-core`                                                      |
| Delivery adapters (V2/V3) | MCP server, hosted API                                                                                 |
