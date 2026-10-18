# Shared glossary

A glossary directory can feed several guides without its own entry in `compileOrder`. Set `compile.scopeRoot` on each guide that should include glossary terms. The value is a directory relative to the docs root:

```json
{
  "name": "developer",
  "compile": { "scopeRoot": "glossary" }
}
```

Compile follows `.md` links from that guide's shards into the glossary tree and stitches each linked term shard into the output. Link `../glossary/index.md` from the guide manifest to publish the full glossary table of contents. A lean guide can skip that link and link individual terms. Compile also follows links from term to term. The output contains the linked terms plus every term reachable from them.

A large glossary can move groups of term links into sub-index files that `index.md` links. The `scopeRoot` walk follows those links too.

To publish the glossary as its own file, add `glossary` to `compileOrder` and set `compile.outputFile`. That guide's `index.md` must link every term shard in the directory directly, because the orphan check reports a term that only a sub-index links. The term shards then belong to the glossary guide. Guides that keep `compile.scopeRoot: glossary` still stitch the terms they link, but their term links point at the glossary's output file instead of the copy in their own output.
