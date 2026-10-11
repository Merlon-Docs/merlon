# refs

**Refs** (short for **references**) are the organized set of heading [slugs](./heading-slug.md) and [cross-links](./cross-link.md) Merlon Docs derives from compiled guides so authors and CI can keep Markdown links coherent after stitch.

The problem refs solve is structural. Stitching shards shifts heading levels and disambiguates duplicate titles, so a hand-guessed `#anchor` or stale path can break after `compile`. Merlon Docs keeps a [refs registry](./refs-registry.md) and validates links at `check` time so the **compiled** document still targets the right sections and files.

## Related wording

| Form                                    | Meaning                                                                             |
| --------------------------------------- | ----------------------------------------------------------------------------------- |
| **refs** (noun)                         | The reference system as a whole (slugs + links + registry)                          |
| **[refs registry](./refs-registry.md)** | The derived catalog of compiled headings, `refs.json`                               |
| **ref** (informal)                      | One heading entry or one link target under that system                              |
| **generate refs**                       | Rebuild the registry from compiled output (`merlon refs-gen` / compile side effect) |
| **list refs**                           | Print each compiled output's headings with its file (`merlon refs-list`)            |
| **check refs**                          | Confirm the registry on disk matches compiled headings (`merlon refs-check`)        |

Refs check links. They do not find documents. To find a shard, use host search (`rg`, IDE search) or the guide `index.md`, then read that one shard. To check links, run `merlon check`. To see the registry's slugs, run `merlon refs-list`. [ADR 0002](../features/adr/0002-remove-refs-lookup.md) records why Merlon Docs has no lookup command.
