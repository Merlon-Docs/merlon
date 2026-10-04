# Scope and positioning

[Vision and roadmap](./00-vision-and-roadmap.md) covers the full phased delivery model.

## Protocol class

MDCP is an **offline document context protocol** — not a wire protocol like [Model Context Protocol (MCP)](https://modelcontextprotocol.io/).

| Dimension       | MCP                                       | MDCP                                                                    |
| --------------- | ----------------------------------------- | ----------------------------------------------------------------------- |
| Problem         | Runtime tool and data access for AI hosts | Author, compile, and validate documentation context                     |
| Interaction     | JSON-RPC session                          | Files on disk + batch CLI                                               |
| Source of truth | Server-defined                            | **Shards in version control (git in V1)**; compiled output is generated |
| Validation      | Server-defined                            | Orphans, refs, links, optional peer linters                             |

## Why MDCP is not an MCP server

1. **Authoring is the hard part** — MCP reads what exists; it does not enforce shard manifests, compile order, link rewriting, or orphan detection.
2. **CI and version control (git in V1) are first-class for the V1 transport** — documentation context must be reviewable in PRs and reproducible from a commit.
3. **Complementary** — an optional MCP adapter (V2) exposes _already-compiled_ MDCP outputs; it sits on top of MDCP, not instead of it.

```text
  [Authoring]  MDCP: shards → compile → check
       ↓
  [Delivery]   Agent Skills pack, MCP server, file read, stdout
       ↓
  [Consumers]  agent host, CI, human reviewers
```

## Documentation domain vs transport

MDCP is for **technical documentation** broadly — software specs, factory SOPs, equipment manuals, training curricula, and similar durable procedural or system docs.

**V1 transport** is a version-controlled file tree (typically a git repo plus CI/PR review). That is how shards are authored and validated today — not a limit on _what_ you document.

Content domain is **orthogonal** to transport. The [Code Repository Archetype](./extensions-and-archetypes.md#archetypes-battery-types) is the default layout for software teams, not the protocol's only use.

## OpenAPI analogy

OpenAPI defines HTTP API contracts. MDCP defines **documentation context contracts** for a shard tree: shard layout, compile invariants, and the refs registry. The analogy is about clear contracts — MDCP itself is positioned as an Agent Skill and toolchain, not an industry “standard” to join.

## Normative core vs reference implementation

| Layer                     | Owner                                             |
| ------------------------- | ------------------------------------------------- |
| Normative spec (MDCP 1.0) | `docs/features/protocol/`                         |
| Protocol artifacts        | Schema files in `packages/mdcp-core/`             |
| Extension packs           | complementary skills + local `docs/extensions/`   |
| Reference implementation  | `@bwilliamson/mdcp-cli`, `@bwilliamson/mdcp-core` |
| Delivery adapters (V2/V3) | MCP server, hosted API                            |
