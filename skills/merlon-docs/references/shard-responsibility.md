# Shard responsibility (agent reference)

Operative rules for when to write, split, or leave durable MDCP shards. Keep this file short. Provenance: see [acknowledgments.md](./acknowledgments.md).

## Single responsibility

A shard has **one primary concern**, for **one audience** (`features` / `client` / `developer` / `glossary` in the Code Repository Archetype), serving **one job** (explain **or** instruct how-to **or** define/look up — not several).

If you cannot state that responsibility in one sentence, the shard is not ready — or it needs mitosis.

## Idea mitosis — split when

1. Dual **audience** (consumer vs contributor)
2. Dual **job** (explain vs how-to vs reference)
3. Dual **concern** (independent reasons to change)
4. Reading the file alone **misleads**
5. Unsettled discovery / time-bound notes next to durable current truth → move discovery to the issue tracker

Do **not** split only because a file is long. Split because responsibility multiplied.

## After split

Update the guide index, cross-link, then two-level review (isolation, then guide agreement).

## Guides

A guide orders shards for one audience job family. Each shard still obeys single responsibility. Placement is by audience and job, not topic keyword alone.
