# codeEvidence

<!-- mdcp-paths: illustrative -->

Specification for the `codeEvidence` compile hook. Tests in `packages/mdcp-core/test/code-evidence.test.ts` map to the sections below (docs first, then TDD).

## codeEvidence purpose

Architecture and technical review shards cite **repo source files** as evidence. At compile time, the hook:

1. Resolves **line ranges** from link text (for example `L6-L8`, `lines 12–15`, `:42`)
2. Resolves **symbols** from the URL fragment (`file.ts#symbol`) or from the link label when no fragment is present (for example ``[`orgCount`](../../functions/src/foo.ts)``)
3. Appends GitHub-style **`#L` fragments** (`#L6`, `#L6-L8`) to the link target
4. Rewrites the target path to be **relative to the rendered output** — the per-guide `compile.outputFile` when set, otherwise the monolith path (`outputDir` + `outputFile` from config)

Publish outputs (`compile.outputFile`) rewrite remaining relative file links automatically (for example `../../package.json` → `package.json` in `DEVELOPERS.md`). Same resolve-then-rebase model as publish-relative assembly; see [Publish-relative link rewriting](./publish-relative-links.md).

## codeEvidence link matching

A link is rewritten when **all** of the following hold:

- Standard markdown link syntax: `[label](path)`
- Target path names a **file in the repository** (a code extension such as `.ts`, `.py`, `.go`, a data extension such as `.yaml` or `.csv`, or an extensionless path like `Makefile`)
- Target is not `http://`, `https://`, or `#…`

Markdown (`.md`) links, external URLs, and same-guide shard links are left unchanged.

**Code and data differ in what the hook adds.** A code file can be cited by line, so it gets an `#L` fragment. A data file — configuration, records, a serialized document — is resolved and rebased for the output path but gets no fragment, because an identifier found in inert content is an occurrence rather than a declaration. The two lists are the ones link validation uses, so a repository that does want lines cited in a format shipped as data lists that extension in `lint.codeExtensions`. See [Built-in link validation](../../features/link-validation.md).

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

If the URL already has a normalized `#L…` fragment, the hook preserves it (normalizing case to `#L`).

## codeEvidence symbols

When no line range is found:

1. If the URL has a `#fragment` that is not already `#L…`, treat the fragment as a **symbol name** and scan the resolved source file for a matching declaration or reference.
2. Otherwise, treat the **link label** as the symbol (backticks and surrounding whitespace stripped).

Symbol lookup scans for identifier matches and common declaration forms (`function`, `class`, `const`, `export`, call sites). It runs for code files only; a data file skips both steps.

## codeEvidence path resolution

Source file lookup order:

1. Relative to the current shard directory
2. Relative to the shard parent directory
3. `process.cwd()` and its parent
4. `compile.scopeRoot` (when set on the guide — same field used for manifest scoping)

When a source file is resolved, the hook rewrites the link target to a POSIX path **relative to the rendered output document**, preserving any `#L…` fragment added by the hook. No hook-specific config is required: shard-relative paths in source are resolved as written, then rebased for where the compiled file lands.

## codeEvidence exclusions

The hook **does not** transform:

- Markdown shard links (`.md`)
- External URLs
- Source links when the file cannot be resolved and no line range appears in label or path
- `#L` fragments on data files, unless the extension is listed in `lint.codeExtensions` or the shard wrote the fragment itself
- Body text when `codeEvidence` is disabled via `compile.hooks: { "codeEvidence": false }` or an explicit hook override that omits it

## codeEvidence config

Runs by default — no hook list required. Path rewriting uses the monolith or per-guide output path automatically:

```json
{
  "name": "architecture-review",
  "compile": {}
}
```

When the guide publishes to its own file instead of the monolith, set `compile.outputFile` (paths are rebased to that file). When shards link across directories outside the guide tree, set `compile.scopeRoot` (typically `"."` for repo root) so manifest scoping and evidence lookup share one root:

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
