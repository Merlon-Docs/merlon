# monolith

The **monolith** is the optional single file that stitches every [guide](./guide.md) without `compile.outputFile` into one document, in `compileOrder` order. Compile writes it only when the config sets top-level `outputFile` and at least one guide in `compileOrder` has no `compile.outputFile`.

See [What compile actually does](../features/overview.md#what-compile-actually-does). [Cross-guide resolution](../features/compile-pipeline/cross-guide-links.md#cross-guide-resolution) covers links between two guides in the monolith.
