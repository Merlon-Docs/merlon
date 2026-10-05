# publish output

A **publish output** is the file a [guide](./guide.md) compiles to when it sets its own `compile.outputFile`, such as a package README or the repository-root `DEVELOPERS.md`. [Path layout](../client-cli/config-essentials.md#path-layout) says how compile resolves the path.

Publish outputs stay out of the optional [monolith](./monolith.md), and link validation applies the [publish-only link policy](../features/link-validation.md#publish-only-link-policy) to them.

See [Default per-guide outputs](../client-cli/config-essentials.md#default-per-guide-outputs).
