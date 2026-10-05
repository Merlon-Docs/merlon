# Consumer migration

Use these steps to move an existing Markdown document into shards. For a new repo with no docs to migrate, the [Quick start](./install-and-quick-start.md#quick-start) covers setup.

## Map the document to guides

`mdcp shard` splits the source document at its H1 headings, then splits each guide's part into shards. Set top-level `source` to the document's path from the docs root, and give each guide in `guides` its own `source`, which picks the H1 sections that guide takes. A guide without one stops the command with `Guide <name> needs h1Extract, merge, or directory source for shard`, and a config without `guides` doesn't write any shards.

| `source.type` | Fields                                                                                                | What the guide gets                                                                |
| ------------- | ----------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `h1Extract`   | `index`, and optional `preamble`                                                                      | The H1 section at that position, counting from 1                                   |
| `merge`       | `parts`, each `{ "fromH1Extract": n }` with optional `"demoteFirstH1": true`, and optional `preamble` | Those H1 sections in order, each part's H1 made an H2 when it sets `demoteFirstH1` |
| `directory`   | `path`, outside the guide's own directory                                                             | A copy of the `.md` files in that directory, read from the docs root               |

Set `"demoteFirstH1": true` on every `merge` part after the first. A later part whose H1 stays an H1 loses that heading and the text before its first `##` heading, and `mdcp shard` still exits 0. With the flag, the part's H1 becomes an H2 and starts a shard of its own.

`mdcp shard` starts a new shard at each `##` heading in a guide's part, and deeper headings stay in the shard above them. The schema accepts a guide's `splitLevel`, an integer from 1 to 6 that defaults to 2, but `mdcp shard` doesn't apply it, because the [md-tree](../features/design-constraints/md-tree-integration.md) `explode` command it runs takes no level. Each shard is a file named after its heading, and the guide's `index.md` links the shards in order.

The text between a guide's H1 and its first `##` heading becomes an "About this guide" shard, `about-this-guide.md`, which compile stitches without its heading. An `h1Extract` or `merge` source can set `"preamble": { "promoteToH2": "<heading>" }` to give that shard another heading. The shard is then named after that heading, and compile keeps the heading as it does for any other shard. `mdcp shard` reads `preamble` from the first guide in `guides` only and gives every guide's preamble shard its heading. The core API page [Shard and peers](../client-core/api-shard-and-peers.md) says how the library reads these mappings.

This config makes the first H1 section the `overview` guide, and the second and third the `admin` guide:

```json
{
  "source": "old.md",
  "compileOrder": ["overview", "admin"],
  "guides": [
    { "name": "overview", "source": { "type": "h1Extract", "index": 1 } },
    {
      "name": "admin",
      "source": {
        "type": "merge",
        "parts": [{ "fromH1Extract": 2 }, { "fromH1Extract": 3, "demoteFirstH1": true }]
      }
    }
  ]
}
```

`mdcp shard` deletes and rewrites the directory of each guide it shards, so commit any shards already there first. That deletion comes before a `directory` source is copied, so with the guide's own directory as `path`, the guide ends up empty and `mdcp shard` still exits 0. It writes a guide's shards to the directory named after the guide under the docs root and ignores `guides[].path`, so for a guide that sets `path`, move the shards there before you compile. It also writes `compile-order.txt` at the docs root, a list of `compileOrder` that compile doesn't read, so you can delete it. It runs `@kayvan/markdown-tree-parser` through `npx --yes`, which downloads the package on the first run unless the npx cache already holds it. Then run:

```bash
mdcp shard
mdcp compile
mdcp check
```

## Guide manifests and compile order

There is no separate manifest sync step, so rerun `mdcp compile` and `mdcp check` after a manifest change. [Manifest compile order](../features/manifest-compile-order.md) says how link order in the manifest sets compile order and when to set `compile.sectionsHeading`.
