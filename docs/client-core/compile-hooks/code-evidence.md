# codeEvidence

Specification for the `codeEvidence` compile hook. The [Spec-to-test map](../../developer/packages-and-tests.md#spec-to-test-map) names the tests behind this spec.

## codeEvidence purpose

Architecture and technical review shards cite **repo source files** as evidence. At compile time, the hook:

1. Resolves **line ranges** from link text (for example `L6-L8`, `lines 12–15`, `:42`)
2. Resolves **symbols** from the URL fragment (`file.ts#symbol`) or from the link label when no fragment is present, such as ``[`countItems`](../../src/counts.ts)``
3. Appends GitHub-style **`#L` fragments** (`#L6`, `#L6-L8`) to the link target
4. Rewrites the target path to be relative to the guide's [link base](../../features/compile-pipeline/publish-relative-links.md#when-it-runs)

The publish-relative pass then rebases the `../` links whose path the hook leaves as the shard wrote it, against the same link base. Such a link can lead to a Markdown file or to another path the hook doesn't read, like `.nvmrc`. It can also lead to a source file that the hook doesn't find, even when the hook added a line fragment to it. In `DEVELOPERS.md`, the hook rebases `../../package.json` to `package.json`, and the publish-relative pass rebases `../../.nvmrc` to `.nvmrc`. [Publish-relative exclusions](../../features/compile-pipeline/publish-relative-links.md#publish-relative-exclusions) lists the links that pass leaves alone, a link the hook rebased among them.

## codeEvidence link matching

A link is rewritten when **all** of the following hold:

- Standard markdown link syntax: `[label](path)`
- Target path names a **file in the repository**: one with a code or data extension like `.ts` or `.yaml`, or a path with no `.` in it like `Makefile`
- Target is not `http://`, `https://`, or `#…`
- The link is outside fenced code and code spans

Markdown (`.md`) links, external URLs, and same-guide shard links are left unchanged.

The hook skips a path to an extensionless file when the path has a `.` anywhere in it, such as `../../Makefile` or `./Makefile`. A line range in the label of such a link doesn't add an `#L` fragment. The publish-relative pass still rebases the `../` path.

The hook finds fenced code and code spans as the [link passes](../../features/compile-pipeline/link-passes.md) do, and it reads a label and a target as they do. It reads each run of lines between two fences at once, so a label outside code can still wrap onto the next line, and an unfinished link such as `[x](see` doesn't take in a link on the next line. In a label that contains an image, such as a linked image's, the hook reads a line range or a symbol only from the text outside the image.

**Code and data differ in what the hook adds.** A code file can be cited by line, so symbol lookup can give it an `#L` fragment. A data file, such as configuration or records, is resolved and rebased for the output path. It gets an `#L` fragment only from a line range the shard writes in the label, the path or the fragment, because symbol lookup runs for code files only. Link validation uses the same code and data extension lists. To look symbols up in a data format, list its extension in `lint.codeExtensions`. See [Built-in link validation](../../features/link-validation.md).

## codeEvidence line ranges

Line ranges are parsed from the **link label** first, then from the path (before any `#` fragment). The hook always emits GitHub-style **`#L…` fragments** (protocol output — not localized).

**Language-neutral forms** (always recognized):

| Form in label or path | Fragment           |
| --------------------- | ------------------ |
| `L6-L8`, `L6–L8`      | `#L6-L8`           |
| `L42`                 | `#L42`             |
| `:10-20`, `:10`       | `#L10-L20`, `#L10` |
| bare `1-2`            | `#L1-L2`           |

**Locale word forms** come from the active [locale pack](../../glossary/locale-pack.md) (`lineRangeWords`). Default **en-US** recognizes `line` / `lines` (case-insensitive), for example `line 42` → `#L42` and `lines 12–15` → `#L12-L15`. Other locales may supply different authored words; they are not MDCP protocol vocabulary. See [Locale and language boundary](../../features/design-constraints/locale-and-language.md).

If the URL already has a line fragment such as `#L6` or `#L6-L8`, the hook keeps it and writes each `l` in it as `L`, so `#l6-l8` becomes `#L6-L8`.

## codeEvidence symbols

When no line range is found:

1. If the URL has a `#fragment` that is not already `#L…`, treat the fragment as a **symbol name** and look it up in the resolved source file.
2. Otherwise, treat the **link label** as the symbol (backticks and surrounding whitespace stripped).

Symbol lookup links the first line where the symbol appears as a whole word. That line can be an import, a call or a comment above the declaration. To cite the declaration, write its line range in the label or the fragment. Lookup runs for code files only, and a data file skips both steps.

When neither step finds a line, the hook drops the `#fragment`, and the link points at the whole file.

## codeEvidence path resolution

The hook finds the source file in the order [Path lookup order](../../features/compile-pipeline/path-lookup-order.md) gives for `codeEvidence`. When a source file is resolved, the hook rewrites the link target to a POSIX path relative to the guide's [link base](../../features/compile-pipeline/publish-relative-links.md#when-it-runs), preserving any `#L…` fragment added by the hook. You don't configure the hook for this. It resolves a shard-relative path as written, then rebases it to that link base.

When no directory has the file, the path stays as written, and the [line range](#codeevidence-line-ranges) rules still set the fragment. The hook keeps an existing `#L` fragment, and otherwise adds one from a line range in the label or path. Symbol lookup has no file to scan, so without a line range the hook drops any other `#fragment`.

## codeEvidence exclusions

The hook **does not** transform:

- Markdown shard links (`.md`)
- External URLs
- Link syntax in fenced code or in a code span
- The path of a source link whose file can't be resolved (see [codeEvidence path resolution](#codeevidence-path-resolution) for its fragment)
- A symbol in a data-file link into an `#L` fragment, unless the extension is listed in `lint.codeExtensions`
- Body text when `codeEvidence` is disabled via `compile.hooks: { "codeEvidence": false }` or an explicit hook override that omits it

## codeEvidence config

Path rewriting rebases each path to the guide's link base, the file being assembled: its compiled guide or the monolith. Runs by default, so an empty `compile` keeps it on:

```json
{
  "name": "architecture-review",
  "path": "review",
  "compile": {}
}
```

`compile.outputFile` publishes the guide to a path you choose, and the hook rebases each path to that file. The path resolves relative to `outputDir`. With `outputDir: "_build"` and the docs root at `docs/`, `"../../architecture-review.md"` is a file at the repository root. Set `compile.scopeRoot` too when the guide stitches shards outside its directory, or cites files that resolve only from that root. The [linked-shard walk](../../features/manifest-compile-order.md#linked-shards-and-the-file-name-fallback) keeps a shard under it, and evidence lookup tries it last, as [Path lookup order](../../features/compile-pipeline/path-lookup-order.md) says. `compile.scopeRoot` resolves from the docs root, and `"."` is the docs root itself:

```json
{
  "name": "architecture-review",
  "path": "review",
  "compile": {
    "scopeRoot": ".",
    "outputFile": "../../architecture-review.md"
  }
}
```

Opt out: `"hooks": { "codeEvidence": false }`. See [Default compile hooks](../../features/default-compile-hooks.md).

## codeEvidence compile example

Shard input (`docs/review/claim.md`): <!-- mdcp-paths: illustrative -->

```markdown
Evidence: [`countItems`](../../src/counts.ts)

See [access.rules L6-L8](../../config/access.rules).
```

Compiled output, when the first line of `src/counts.ts` with the word `countItems` is line 6 and the guide's output is `architecture-review.md` at the repository root: <!-- mdcp-paths: illustrative -->

```markdown
Evidence: [`countItems`](src/counts.ts#L6)

See [access.rules L6-L8](config/access.rules#L6-L8).
```
