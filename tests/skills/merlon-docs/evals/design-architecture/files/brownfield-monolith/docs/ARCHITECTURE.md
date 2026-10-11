# System architecture (legacy monolith)

> This single file is the **entire** architecture record for the fixture
> product. It intentionally mixes multiple concerns, stale planning text, and
> a durable decision that should become an ADR. Agents using
> `mdcp-design-architecture` should break this into small MDCP shards under
> `docs/features/`, update indexes, and retire superseded bullets — not grow
> this monolith further.

## Product overview

ShardGraph is a documentation tooling product that helps teams keep design and
feature notes in small Markdown files (shards) instead of one growing wiki
page. Authors link related shards; a compile step assembles guides for humans
and agents.

End-user value: contributors find the right design note in one read instead of
scrolling a thousand-line architecture dump.

## Component map

### Authoring workspace

- Authors edit Markdown under `docs/`
- Each durable topic should eventually be its own shard
- Guide `index.md` files define compile order and discovery

### Compile pipeline

- Reads guide indexes, follows links, emits assembled guides
- Cache keys should cover authored shard content and compile-affecting config
- Invalidation is content-addressed when digests match

### Agent intake surface

- Agents load `WORK_ITEM` plus a `WORK_ITEM_LOOKUP` shard for delivery rules
- Prefer one-shard reads; avoid dumping whole trees into context

### Package CLI (out of scope for design docs)

- `packages/example-cli` exposes a tiny CLI entrypoint
- Design docs must not grow into TypeScript implementation notes

## Data flow (intent level)

1. Author updates a feature or ADR shard
2. Index lists the shard for compile discovery
3. Compile reads shards → emits guide output
4. Agents and humans read compiled guides or individual shards

Contracts at the design level:

- **Shard**: one primary concern; links out for related concerns
- **Index**: authoritative list for a guide tier
- **ADR**: accepted decision with Context / Decision / Consequences

## Decision log mashed into this file

### Prefer skill + one-shard reads over a hosted "context dump" API

**Context:** Product managers asked for an HTTP export that returns the entire
docs tree as one JSON blob for agents.

**Decision:** Reject the hosted context-dump API. Agents should use skills and
read one shard at a time (plus indexes). A dump API encourages monolith
context and fights the shard model.

**Consequences:** No new export endpoint in the product roadmap. Skill docs and
ADR indexes remain the discovery path. Implementation helpers may add CLI
commands later; this architecture record only locks the boundary.

## Stale planning / archaeology (remove when sharding)

- Migration backlog: finish "wiki → shards" ticket dump before Q3 (tracker
  owns this — do not keep in durable architecture docs)
- Old approach: keep both the monolith and the new shards forever and document
  both layouts for archaeology
- Superseded: global `.compile-cache-v1/` forever with dual cache layouts
- Pending release notes live under `.changeset/shardgraph-export.md` (do not
  link durable shards to pending changesets)

## Client guide brainstorm (wrong tier — do not expand here)

How end users click through the web docs site, onboarding screenshots, and
marketing copy for "break the monolith" — that belongs in `docs/client/` under
a different helper, not in this architecture monolith.

## Implementation scratchpad (wrong for durable design docs)

```typescript
// Do not grow design docs with multi-function dumps like this.
export async function dumpAllDocs(root: string): Promise<string> {
  const files = await walk(root);
  return JSON.stringify(files.map(read));
}

export function walk(dir: string): Promise<string[]> {
  /* ... */
  return Promise.resolve([]);
}

export function read(path: string): { path: string; body: string } {
  return { path, body: '' };
}
```
