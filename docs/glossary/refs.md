# refs

**Refs** (short for **references**) are the organized set of heading [slugs](./heading-slug.md) and [cross-links](./cross-link.md) MDCP derives from compiled guides so authors and CI can keep Markdown links coherent after stitch.

The problem refs solve is structural. Stitching shards shifts heading levels and disambiguates duplicate titles, so a hand-guessed `#anchor` or stale path can break after `compile`. MDCP keeps a [refs registry](./refs-registry.md) and validates links at `check` time so the **compiled** document still targets the right sections and files.

## Related wording

| Form               | Meaning                                                                           |
| ------------------ | --------------------------------------------------------------------------------- |
| **refs** (noun)    | The reference system as a whole (slugs + links + registry)                        |
| **refs registry**  | Derived catalog (`refs.json`) of compiled heading entries                         |
| **ref** (informal) | One heading entry or one link target under that system                            |
| **generate refs**  | Rebuild the registry from compiled output (`mdcp refs-gen` / compile side effect) |
| **list refs**      | Print each compiled output's headings with its file (`mdcp refs-list`)            |
| **check refs**     | Confirm registry matches compiled headings (`mdcp refs-check` / via `mdcp check`) |

Refs check links. They do not find documents. To find a shard, use host search (`rg`, IDE search) or the guide `index.md`, then read that one shard. To check links, run `mdcp check`. To see the registry's slugs, run `mdcp refs-list`. [ADR 0002](../features/adr/0002-remove-refs-lookup.md) records why MDCP has no lookup command.
