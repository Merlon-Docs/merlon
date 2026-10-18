# Front matter

A shard MAY begin with a YAML front matter block: a first line of `---` and a closing line of `---` or `...`. Compile discards that block, and the blank lines after it, before any hook or link pass reads the shard. The block is data about that one file, and its keys can mean anything, so compile doesn't place it in a guide, merge it with other shards' blocks or act on its keys. An opening `---` with no closing line isn't front matter, and compile keeps it as content.

Diagnostics still count lines as the shard file does. When compile drops lines before a shard's body, the [source tag](../source-tags-and-banner.md#source-tags) that opens the shard gives the line the body starts on, and link validation reports each shard line from it.
