# Built-in link validation

Specification for first-party internal link validation at compile and check. Tests in `packages/mdcp-core/test/links.test.ts`, `packages/mdcp-core/test/cross-guide-links.test.ts`, `packages/mdcp-core/test/source-path-links.test.ts`, and `packages/mdcp-cli/test/cli.smoke.test.ts` map to the sections below (docs first, then TDD).

## Link validation purpose

Internal markdown links can compile cleanly but still be broken in published output — dead `#anchor` fragments after heading demotion, missing shard files, or cross-guide rewrite collisions on publish paths (for example `packages/mdcp-cli/README.md`).

MDCP validates link integrity at **shard**, **standalone-guide**, and **compiled-guide** level, emits **`BROKEN LINK`** markers in compiled output by default, and fails `mdcp compile` / `mdcp check` with IDE-clickable `path:line:` diagnostics unless warn mode is enabled.

Validated target classes are `.md` paths, `#fragment` anchors, and **file paths** — a link whose target carries a known extension (`.ts`, `.py`, `.yaml`, `.csv`, …) names a file in the repository, so an unresolved target is a defect. This is what keeps a shard from citing a module that has been deleted. Targets that name no resolvable file — a bare word, a directory path — stay unvalidated, because nothing distinguishes a stale one from an illustrative one.

The extensions come from two built-in lists, because a file's contents decide what can be said about it. **Code** extensions name files a symbol can cite a line in, which the [code evidence hook](../client-core/compile-hooks/code-evidence.md) does. **Data** extensions name files that hold configuration or records, validated for existence exactly like code but never cited by line, since a symbol found in inert content is an occurrence rather than a declaration. Neither list covers every stack, so `lint.codeExtensions` and `lint.dataExtensions` add to them; moving an extension into the code list is also how a repository asks for lines to be cited in a format that ships as data.

Peer `mdcp links` / `markdown-link-check` remains optional for external URL HTTP checks — not a substitute for internal link validation.

## BROKEN LINK marker

After cross-guide, publish-relative, and intra-guide rewrite passes, compile runs **`markBrokenLinks`** on each assembled guide body.

Broken links are replaced with visible prose (no clickable dead href):

```markdown
**BROKEN LINK:** "Feature catalog" (`../features/feature-catalog.md`) → `#feature-catalog` (dead anchor in compiled guide)
```

| Field           | Source                                                               |
| --------------- | -------------------------------------------------------------------- |
| Link label      | Original `[label]` text                                              |
| Original target | Shard-relative path as authored                                      |
| Broken target   | Resolved compile target (`#slug`, `guides.md#slug`, `missing.md`, …) |
| Reason          | `dead anchor`, `missing file`, `missing publish path`                |

Disable markers per guide with `compile.links.markBroken: false`. `lint.links.enabled` can still fail check.

## Publish-only link policy

Guides with `compile.outputFile` are **publish-only** outputs (npm READMEs, `DEVELOPERS.md`, and similar). Link validation applies extra rules:

| Target in publish output                                          | Result                             |
| ----------------------------------------------------------------- | ---------------------------------- |
| Another guide's compiled `outputFile`                             | Valid                              |
| `#fragment` in the same document                                  | Valid when slug exists             |
| Shard `.md` in an unpublished guide (not in `ignoreGuides`)       | **`missing publish path`**         |
| Shard `.md` for a guide in `compile.crossGuideLinks.ignoreGuides` | Valid when the file exists on disk |

See [publish-relative rewrite](../client-core/compile-hooks/publish-relative-links.md) for how shard paths are rebased before this policy runs.

Example: `client-cli` with `ignoreGuides: ["features"]` compiles `../features/feature-catalog.md` to `../../docs/features/feature-catalog.md` in `packages/mdcp-cli/README.md`. Cross-guide rewrite is skipped for `features`; publish-relative rebase fixes geometry; lint accepts the shard path because `features` is in `ignoreGuides`.

Publish-relative rewrite and publish-only lint are complementary: rewrite fixes geometry from absolute resolution; lint enforces which target classes are allowed in publish output.

## Validation phases

| Phase      | When                      | Validates                                                                                           |
| ---------- | ------------------------- | --------------------------------------------------------------------------------------------------- |
| Shard      | `lintLinks` / author time | Unresolved `.md` and source-file paths; same-shard `#fragment` vs demoted heading slugs             |
| Standalone | `lintLinks`               | Same checks as shard phase, over every file matched by `standaloneGuides`                           |
| Compiled   | After assemble            | `#fragment` vs `buildSlugRegistry`; relative `.md` and source-file paths from output file directory |

Compiled-phase checks run **after** cross-guide, publish-relative, and intra-guide rewrite. Co-compiled transitive targets (shards in `linkedSectionFiles` outside `guideDir`) are expected to rewrite to in-document `#slug` / `#fragment` via the guide link index and same-output preference — see [Cross-guide link rewriting](../client-core/compile-hooks/cross-guide-links.md#transitive-section-discovery). Validation treats remaining raw `../file.md` (or `./file.md`) to those co-compiled paths as broken when publish-only policy requires a compiled target. <!-- mdcp-paths: illustrative -->

## Standalone guide validation

Files registered under `standaloneGuides` are captured but never compiled, so the compiled phase cannot reach them. They are link-linted with the shard-phase checks instead, each file resolving against its own directory: there is no manifest or scope root to resolve against.

Globs resolve against the **scan root** — `scan.root` when set, otherwise the invocation directory — the same root the coverage pass uses, so one registration covers both.

Being uncompiled is not a reason to be unchecked: `AGENTS.md`, `CLAUDE.md`, and a shipped skill corpus under `skills/**/*.md` are exactly the documents an agent reads first.

## Check pipeline

```text
orphans → compile → refs → links (built-in) → peer linters
```

Built-in link validation runs when `lint.links.enabled !== false` (default **on**).

## Exit codes

| Condition                      | Exit code | Stderr prefix      |
| ------------------------------ | --------- | ------------------ |
| No broken links                | **0**     | —                  |
| Broken links, default severity | **1**     | `link:`            |
| Broken links, warn mode        | **0**     | `link-warn:`       |
| `lint.links.enabled: false`    | **0**     | validation skipped |

Warn mode: global `--warn-broken-links` or `lint.links.severity: "warn"`. Resolution: CLI flag > config > default `"error"`.

## Check failure summary

`mdcp check` may continue peer linters (markdownlint, Vale) after built-in link failures so one run surfaces every gate. Peer tools often print their own “0 errors” success lines afterward, which can hide why the process still exits **1**.

When any gate fails, `mdcp check` ends with a stderr **failure summary** after all steps:

```text
mdcp check failed:
  - built-in links: 2 issue(s) (see `link:` lines above)
    → Fix shard targets cited above, then re-run mdcp check.
      missing publish path: link a published outputFile (or list the guide in
      compile.crossGuideLinks.ignoreGuides when shard paths are intentional).
      Do not link durable docs to pending .changeset/*.md files.

Resolve the diagnostics above, then re-run: mdcp check
```

| Summary line includes | Role                                                           |
| --------------------- | -------------------------------------------------------------- |
| Failed step name      | Which gate failed (orphans, built-in links, peer linters)      |
| Count / pointer       | How many issues, or “see `link:` / peer output above”          |
| Remediation hint      | Concrete next action for the failure kinds present in that run |

Success still ends with `mdcp check passed` on stdout. Early hard stops (orphans, refs registry mismatch) keep exiting immediately after their own diagnostics — they do not need a multi-step summary.

## Link validation config

```json
{
  "compile": {
    "links": { "markBroken": true }
  },
  "lint": {
    "links": {
      "enabled": true,
      "severity": "error"
    }
  }
}
```

| Knob                       | Default   | Role                                                |
| -------------------------- | --------- | --------------------------------------------------- |
| `compile.links.markBroken` | `true`    | Emit BROKEN LINK in compiled output                 |
| `lint.links.enabled`       | `true`    | Run built-in link validation                        |
| `lint.links.severity`      | `"error"` | `"error"` exits 1; `"warn"` exits 0                 |
| `lint.links.config`        | —         | Peer `markdown-link-check` only (not built-in gate) |
| `lint.codeExtensions`      | `[]`      | Extra code extensions, validated and line-citable   |
| `lint.dataExtensions`      | `[]`      | Extra data extensions, validated, never line-cited  |

Per-guide: `guides[].compile.links.markBroken`.

## CLI

Global option (all commands that run link validation):

| Flag                  | Role                           |
| --------------------- | ------------------------------ |
| `--warn-broken-links` | Report broken links but exit 0 |

## Diagnostic shape

```text
link: docs/client-cli/consumer-migration.md:42: dead anchor "#missing-slug" (slug not found in compiled guide "client-cli")
  → compiled: packages/mdcp-cli/README.md:696
```

## Link validation acceptance criteria

- BROKEN LINK marker replaces dead link in compiled output (label, original target, broken target, reason)
- BROKEN LINK marker for missing `.md` file
- No marker when `compile.links.markBroken: false`
- Shard dead file link at `path:line`
- Shard dead same-doc `#fragment`
- Shard link to a source file that does not resolve reports `missing file`
- Compiled link to a source file that does not resolve reports `missing file`
- Link target without a resolvable file class (bare word, directory) stays unvalidated
- `standaloneGuides` files are link-linted, globs included, at the scan root
- An extension listed in `lint.codeExtensions` or `lint.dataExtensions` is validated like a built-in one, with or without a leading dot
- A data-file link is validated and rebased but carries no `#L` fragment; the same extension listed in `lint.codeExtensions` gets one
- Compiled dead anchor after demotion
- Compiled dead path after publish-relative link rewrite
- Manifest-first guide link index — transitive guide does not overwrite manifest owner; index includes every `linkedSectionFiles` path for the compiling guide
- Co-compiled transitive targets rewrite before compiled validation (same-output `#slug` / `#fragment`)
- Cross-guide publish link rewrites to `guides.md#slug`, not same-doc `#slug`
- `mdcp check` / `mdcp compile` exit **1** on broken links by default
- `--warn-broken-links` exits **0** with `link-warn:` diagnostics
- Config parses link validation defaults
- `mdcp check` prints a stderr failure summary after peer linters when any continuing gate failed, with step names and remediation hints (not only a bare exit code after “0 errors” peer output)

## Link validation related

- [Cross-guide link rewriting](../client-core/compile-hooks/cross-guide-links.md)
- [Publish-relative link rewriting](../client-core/compile-hooks/publish-relative-links.md)
- [Optional linters](../client-cli/optional-linters.md)
- [Commands reference](../client-cli/commands-reference.md)
