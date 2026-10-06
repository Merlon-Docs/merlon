# manifest

A **manifest** is the file in a [guide](./guide.md) directory whose Markdown links set compile order. It is `index.md` by default, and `guides[].compile.manifest` can name another file such as `shards.md`. Compile stitches the linked `.md` files in the order the links appear. The [orphan](./orphan.md) check compares the guide directory against these links.

See [Manifest compile order](../features/manifest-compile-order.md).
