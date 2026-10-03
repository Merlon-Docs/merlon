# Path resolution in prose

Specification for resolving backtick-quoted repository paths in documentation prose. Tests in `packages/mdcp-core/test/path-probe.test.ts` map to the sections below (docs first, then TDD).

## Path resolution purpose

A shard that names `packages/mdcp-core/src/links/validate.ts` in prose makes a claim a machine can check: that file is in the repository. When the code moves and the prose survives, the claim goes stale and no structural check notices, because a backtick path is not a link. This is the gap that lets a document describe a component that has been removed while [`mdcp check`](../client-cli/commands-reference.md) still passes.

The probe resolves every path claim in shards and [standalone guides](../glossary/standalone-guide.md) and fails on the ones that resolve nowhere.

It cannot tell a path that went stale from one that was always illustrative, because the two are textually identical. So the discriminator is authorial: the document says which of its paths describe this repository. That is the whole design, and it is why the probe is opt-in.

## What counts as a path claim

A backtick span is a claim when it carries **a directory segment and a name**.

| Span                     | Claim | Why                                        |
| ------------------------ | ----- | ------------------------------------------ |
| `src/links/validate.ts`  | Yes   | Directory segment plus a name              |
| `docs/glossary/`         | Yes   | Directory segment plus a name              |
| `index.md`               | No    | Bare name — no path to anchor it to a root |
| `src/`                   | No    | Single segment, spoken of generically      |
| `pnpm docs:compile`      | No    | Whitespace — a command line                |
| `packages/*/README.md`   | No    | Glob — a pattern, not a file               |
| `@bwilliamson/mdcp-core` | No    | npm scope                                  |
| `--warn-broken-links`    | No    | Flag                                       |
| `lintShardLinks`         | No    | Code identifier                            |

Fenced code blocks are skipped entirely: a fence holds examples, not claims. A `#fragment` and a leading `./` are trimmed before resolution.

Which extensions can name a file is the **same set the link validators use** — every built-in code and data extension, plus `lint.codeExtensions` and `lint.dataExtensions` — widened with `.md` and `.mdx`. Prose asks the question links ask, whether the file exists, so both read one pair of knobs and a repository on an unlisted stack configures it once. Membership is a set lookup rather than a generated pattern, so a configured value cannot change how matching behaves.

## Resolution ladder

A claim resolves against the first root that contains it:

1. the directory of the file making the claim,
2. the scan root (`scan.root`, else the invocation directory),
3. the docs root,
4. each guide's `compile.scopeRoot`,
5. every entry in `lint.paths.searchRoots`.

The ladder exists because a monorepo names paths relative to a package as readily as to the repository: a shard describing `packages/mdcp-presets` writes `vale/MDCP/`, which is correct and resolves only with that package as a root.

## Opting out

Two scopes, one marker — `<!-- mdcp-paths: illustrative -->`:

| Placement               | Scope     | Use                                                                  |
| ----------------------- | --------- | -------------------------------------------------------------------- |
| Alone on its own line   | The file  | A document whose paths teach syntax rather than describe this repo   |
| Trailing a content line | That line | One illustrative path in a document that otherwise makes real claims |

The line scope exists because a whole-file marker on a mostly-descriptive shard would exempt its real claims too. Prefer the narrower scope.

Two more cases are not authorial at all, and they are declared in config rather than in the prose, because they are properties of the repository rather than of a sentence.

| Knob                    | Matching | The claim it declares                                                                    |
| ----------------------- | -------- | ---------------------------------------------------------------------------------------- |
| `lint.paths.generated`  | Prefix   | Real here, absent in a clean checkout: build output, caches, vendor-managed installs     |
| `lint.paths.vocabulary` | Exact    | A name this repository documents without having: a protocol tier, another project's tree |

They match differently because they claim different things. Nothing under a generated prefix exists until something builds it, so the prefix covers the whole tree. A vocabulary entry is one name the document uses without instantiating, so matching stops at that name: `docs/client/` is declared, and `docs/client/onboarding.md` is still an unresolved path. Neither matches a sibling that merely shares a prefix. <!-- mdcp-paths: illustrative -->

This repository uses `vocabulary` for `docs/client/` and `docs/extensions/`, two tiers the protocol defines that mdcp itself does not instantiate. Filing them as generated would have been the wrong claim: they are not waiting for a build, they are names belonging to a consumer's tree.

## Path resolution config

```json
{
  "lint": {
    "paths": {
      "severity": "error",
      "searchRoots": ["packages/mdcp-presets"],
      "generated": ["docs/_build", ".caches"],
      "vocabulary": ["docs/client"]
    }
  }
}
```

| Knob                     | Default | Role                                                                     |
| ------------------------ | ------- | ------------------------------------------------------------------------ |
| `lint.paths.severity`    | `"off"` | `"off"` skips the probe; `"warn"` reports and exits 0; `"error"` exits 1 |
| `lint.paths.searchRoots` | `[]`    | Extra resolution roots, relative to the scan root                        |
| `lint.paths.generated`   | `[]`    | Prefixes absent in a clean checkout                                      |
| `lint.paths.vocabulary`  | `[]`    | Exact names this repository documents without having                     |
| `lint.codeExtensions`    | `[]`    | Extra code extensions, shared with link validation                       |
| `lint.dataExtensions`    | `[]`    | Extra data extensions, shared with link validation                       |

**The default is `off` on purpose.** Turning the probe on for a corpus written without it in mind produces a burst of findings that are correct as written, and a check nobody can get to green is a check nobody enables. A repository turns it on once, cleans up, and keeps it on.

## Diagnostic shape

```text
path: docs/features/overview.md:206: unresolved path "packages/mdcp-core/src/session/store.ts"
```

Source shards and standalone guides are scanned; compiled output is not, since it is generated from them and would double-report every claim at a line nobody should edit.

## Path resolution acceptance criteria

- A claim with a directory segment that resolves against no root fails `mdcp check` at `path:line`
- A bare name (`index.md`), a single segment (`src/`), a command, a glob, a flag, an npm scope and a code identifier are not claims
- A claim inside a fenced code block is not reported
- A claim resolves against the file's own directory, the scan root, the docs root, a guide `scopeRoot`, or a `lint.paths.searchRoots` entry
- `lint.paths.generated` suppresses a prefix match but not a sibling sharing that prefix
- `lint.paths.vocabulary` suppresses the name itself but not a path beneath it
- The marker alone on a line exempts the file; trailing a content line it exempts that line only
- `lint.paths.severity` defaults to `off`; `warn` reports with a `path-warn:` prefix and exits 0
- An extension added by `lint.codeExtensions` or `lint.dataExtensions` makes a span a claim; documentation extensions stay claimable regardless

## Path resolution related

- [Built-in link validation](./link-validation.md) — the same question for authored links
- [Documentation coverage scan](./coverage-scan.md) — which files are in scope
- [Commands reference](../client-cli/commands-reference.md)
