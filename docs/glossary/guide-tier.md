# guide tier

A **guide tier** is one category in an [archetype](../features/protocol/extensions-and-archetypes.md#archetypes-battery-types)'s guide layout. Each tier specifies what its shards contain and what they keep out. The default archetype, the Code Repository Archetype, defines four tiers: `features/`, `client/`, `developer/`, and `glossary/`. A tier can include more than one [guide](./guide.md).

[Default guide layout](../features/protocol/mdcp-1.0-spec.md#2-default-guide-layout-code-repository-archetype) defines the four tiers. Under its placement test, a shard that consumers need goes in `features/` or `client/`, and a shard that only contributors need goes in `developer/`.
