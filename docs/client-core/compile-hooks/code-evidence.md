# codeEvidence

<!-- mdcp-paths: illustrative -->

Specification for the `codeEvidence` compile hook. Tests in `packages/mdcp-core/test/code-evidence.test.ts` map to the sections below (docs first, then TDD). The fenced code tests in `packages/mdcp-core/test/links.test.ts` also cover [codeEvidence link matching](#codeevidence-link-matching).

## codeEvidence purpose

Architecture and technical review shards cite **repo source files** as evidence. At compile time, the hook:

1. Resolves **line ranges** from link text (for example `L6-L8`, `lines 12–15`, `:42`)
2. Resolves **symbols** from the URL fragment (`file.ts#symbol`) or from the link label when no fragment is present (for example ``[`orgCount`](../../functions/src/foo.ts)``)
3. Appends GitHub-style **`#L` fragments** (`#L6`, `#L6-L8`) to the link target
4. Rewrites the target path to be relative to the guide's [link base](./publish-relative-links.md#when-it-runs)

The publish-relative pass then rebases the `../` links whose path the hook leaves as the shard wrote it, against the same link base. Such a link can lead to a Markdown file or to another path the hook doesn't read, like `.nvmrc`. It can also lead to a source file that the hook doesn't find, even when the hook added a line fragment to it. In `DEVELOPERS.md`, the hook rebases `../../package.json` to `package.json`, and the publish-relative pass rebases `../../.nvmrc` to `.nvmrc`. [Publish-relative exclusions](./publish-relative-links.md#publish-relative-exclusions) lists the links that pass leaves alone, a link the hook rebased among them.

## codeEvidence link matching

A link is rewritten when **all** of the following hold:

- Standard markdown link syntax: `[label](path)`
- Target path names a **file in the repository** (a code extension such as `.ts`, `.py`, `.go`, a data extension such as `.yaml` or `.csv`, or an extensionless path like `Makefile`)
- Target is not `http://`, `https://`, or `#…`
- The link is outside fenced code and code spans

Markdown (`.md`) links, external URLs, and same-guide shard links are left unchanged.

The hook finds fenced code and code spans as the [link passes](./index.md#link-passes) do. A link outside code can still wrap onto the next line.

**Code and data differ in what the hook adds.** A code file can be cited by line, so symbol lookup can give it an `#L` fragment. A data file, such as configuration or records, is resolved and rebased for the output path. It gets an `#L` fragment only from a line range the shard writes in the label, the path or the fragment, and never from symbol lookup, because an identifier found in inert content is an occurrence rather than a declaration. Link validation uses the same code and data extension lists. To look symbols up in a data format, list its extension in `lint.codeExtensions`. See [Built-in link validation](../../features/link-validation.md).

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

1. If the URL has a `#fragment` that is not already `#L…`, treat the fragment as a **symbol name** and scan the resolved source file for a matching declaration or reference.
2. Otherwise, treat the **link label** as the symbol (backticks and surrounding whitespace stripped).

Symbol lookup scans for identifier matches and common declaration forms (`function`, `class`, `const`, `export`, call sites). It runs for code files only; a data file skips both steps.

When neither step finds a line, the hook drops the `#fragment`, and the link points at the whole file.

## codeEvidence path resolution

The hook finds the source file in the order [Path lookup order](./index.md#path-lookup-order) gives for `codeEvidence`. When a source file is resolved, the hook rewrites the link target to a POSIX path **relative to the rendered output document**, preserving any `#L…` fragment added by the hook. You don't configure the hook for this. It resolves a shard-relative path as written, then rebases it for the location of the compiled file.

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

Runs by default — no hook list required. Path rewriting uses the monolith or per-guide output path automatically:

```json
{
  "name": "architecture-review",
  "compile": {}
}
```

To publish the guide to a path you choose, set `compile.outputFile` (paths are rebased to that file). When shards link across directories outside the guide tree, set `compile.scopeRoot` (typically `"."` for repo root) so manifest scoping and evidence lookup share one root:

```json
{
  "name": "architecture-review",
  "compile": {
    "scopeRoot": ".",
    "outputFile": "architecture-review.md"
  }
}
```

Opt out: `"hooks": { "codeEvidence": false }`. See [Default compile hooks](../../features/default-compile-hooks.md).

## codeEvidence compile example

Shard input (under `review/claim.md`):

```markdown
Evidence: [`orgCount`](../../functions/src/foo.ts)

See [firestore.rules L6-L8](../../firestore.rules).
```

Compiled output (when `functions/src/foo.ts` defines `orgCount` on line 6 and output is `architecture-review.md` at repo root):

```markdown
Evidence: [`orgCount`](functions/src/foo.ts#L6)

See [firestore.rules L6-L8](firestore.rules#L6-L8).
```
