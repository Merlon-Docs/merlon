# coverage

Documentation **coverage** is the set of markdown files MDCP can account for, and a file in that set is **captured**. [Coverage and the captured set](../features/coverage-scan.md#coverage-and-the-captured-set) lists which files count.

The coverage scan walks the repository for markdown files, skips vendored paths, and reports any file that is not captured so authors either fold it into a guide or register it in `standaloneGuides[]`. With `scan.strict: true`, gaps fail `mdcp check`.
