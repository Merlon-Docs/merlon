# standalone guide

A **standalone guide** is a hand-authored markdown file listed in `standaloneGuides[]` that is both its source and the file readers open, such as a package `README.md` or a top-level `SECURITY.md`.

Contrast with a [guide](./guide.md), whose shards compile into one output. Compile doesn't write output for a standalone guide, and listing it marks it as [captured](./coverage.md). [Standalone guide behavior](../features/coverage-scan.md#standalone-guide-behavior) covers how compile treats it and which checks read it.
