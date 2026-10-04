# Built-in link validation

Specification for first-party internal link validation at compile and check. Tests in `packages/mdcp-core/test/links.test.ts`, `packages/mdcp-core/test/cross-guide-links.test.ts`, `packages/mdcp-core/test/guide-output-path.test.ts`, `packages/mdcp-core/test/source-path-links.test.ts`, and `packages/mdcp-cli/test/cli.smoke.test.ts` map to the sections below (docs first, then TDD).

## Link validation purpose

Internal markdown links can compile cleanly but still be broken in published output — dead `#anchor` fragments after heading demotion, missing shard files, or cross-guide rewrite collisions on publish paths (for example `packages/mdcp-cli/README.md`).

MDCP validates link integrity at **shard**, **standalone-guide**, and **compiled-guide** level, emits **`BROKEN LINK`** markers in compiled output by default, and fails `mdcp compile` / `mdcp check` with IDE-clickable `path:line:` diagnostics unless warn mode is enabled.

Validated target classes are `.md` paths, `#fragment` anchors, and **file paths** — a link whose target carries a known extension (`.ts`, `.py`, `.yaml`, `.csv`, …) names a file in the repository, so an unresolved target is a defect. This is what keeps a shard from citing a module that has been deleted. Targets that name no resolvable file — a bare word, a directory path — stay unvalidated, because nothing distinguishes a stale one from an illustrative one.

The extensions come from two built-in lists, because a file's contents decide what can be said about it. **Code** extensions name files a symbol can cite a line in, which the [code evidence hook](../client-core/compile-hooks/code-evidence.md) does. **Data** extensions name files that hold configuration or records, validated for existence exactly like code but never cited by line, since a symbol found in inert content is an occurrence rather than a declaration. Neither list covers every stack, so `lint.codeExtensions` and `lint.dataExtensions` add to them; moving an extension into the code list is also how a repository asks for lines to be cited in a format that ships as data.

Peer `mdcp links` / `markdown-link-check` remains optional for external URL HTTP checks — not a substitute for internal link validation.

## BROKEN LINK marker

After cross-guide, publish-relative, and intra-guide rewrite passes, compile runs **`markBrokenLinks`** on each assembled guide body. A `#fragment` there passes when it matches a heading of the body or a slug that assembly gave one of its sections, such as a `FIND-*` finding id or a declared `{#id}`. A shard in the guide's directory that the guide doesn't stitch has no section there. Its slug fails, even when another guide stitches the shard. Each compile result keeps that slug set, and link lint checks against the same set.

A guide's copy in the [monolith](../glossary/monolith.md) is marked after every copy is assembled, against the headings of the whole monolith, so a `#fragment` there can point at a heading of any guide the monolith stitches. The copy also accepts the section slug of every copy there, whichever guide is the shard's owner.

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

The original target comes from the shard link at the same place among the links with that label, and each marker replaces its own link where it stands. So of two links with one label, each marker gives the target its own link was written with, and a link that a compiled guide and the monolith both mark gets the same marker in both.

Disable markers per guide with `compile.links.markBroken: false`. `lint.links.enabled` can still fail check.

## Publish-only link policy

Guides with `compile.outputFile` are **publish-only** outputs (npm READMEs, `DEVELOPERS.md`, and similar). Link validation applies extra rules:

| Target in publish output                                          | Result                                                                         |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Another output of the same run (a compiled guide or the monolith) | Valid when any `#fragment` matches a heading in that output                    |
| `#fragment` in the same document                                  | Valid when slug exists                                                         |
| Shard `.md` in an unpublished guide (not in `ignoreGuides`)       | **`missing publish path`**                                                     |
| Shard `.md` for a guide in `compile.crossGuideLinks.ignoreGuides` | Valid when the file exists on disk and any `#fragment` matches a heading in it |

See [publish-relative rewrite](../client-core/compile-hooks/publish-relative-links.md) for how shard paths are rebased before this policy runs.

Example: `client-cli` with `ignoreGuides: ["features"]` compiles `../features/feature-catalog.md` to `../../docs/features/feature-catalog.md` in `packages/mdcp-cli/README.md`. Cross-guide rewrite is skipped for `features`; publish-relative rebase fixes geometry; lint accepts the shard path because `features` is in `ignoreGuides`.

Publish-relative rewrite and publish-only lint are complementary: rewrite fixes geometry from absolute resolution; lint enforces which target classes are allowed in publish output.

## Validation phases

| Phase      | When                      | Validates                                                                                                                           |
| ---------- | ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Shard      | `lintLinks` / author time | Unresolved `.md` and source-file paths; same-shard `#fragment` vs demoted heading slugs                                             |
| Standalone | `lintLinks`               | Same checks as shard phase, over every file matched by `standaloneGuides`                                                           |
| Compiled   | After assemble            | `#fragment` vs the headings and the slugs broken-link marking used; relative `.md` and source-file paths from output file directory |

A `.md` target names another output of the same run only when its resolved path equals that output's path. Its `#fragment` is then checked against the compiled text held in memory, so the output doesn't have to be written yet. This holds in publish-only output too. The monolith counts as an output only when at least one guide is stitched into it, because a run where every guide sets `compile.outputFile` never writes it. A link to a monolith that is never written reports `missing publish path`, even when an earlier run left the file on disk. A file that only shares a name with an output, such as a package's `README.md` when the root `README.md` is an output, gets the ordinary check: the file has to exist, and any `#fragment` has to match one of its headings.

The compiled phase reads each output as compile writes it, banner included, so the line in a diagnostic is a line of that file. A `#fragment` in an output has to match one of its headings or a slug from the set that broken-link marking used. A slug that only another guide's compiled guide has is a dead anchor, even when the monolith has that heading. So is the slug of a shard that the output doesn't stitch, even when the shard is in the directory of the output's guide. A fragment on a link to another output of the run has to match a heading of that output. A finding id or a declared `{#id}` doesn't, because the heading there takes its anchor from its text. So `architecture-review.md#find-004` is a dead anchor, though compile writes that link for a link to the finding's shard. [Cross-guide purpose](../client-core/compile-hooks/cross-guide-links.md#cross-guide-purpose) says which slug a link to a shard takes in an output without the shard's section, and when that slug matches another heading there. [Monolith link lint](./monolith-link-lint.md) says how the monolith is checked, and when an issue there repeats one in a compiled guide.

Compiled-phase checks run **after** cross-guide, publish-relative, and intra-guide rewrite. Co-compiled transitive targets (shards in `linkedSectionFiles` outside `guideDir`) are expected to rewrite to in-document `#slug` / `#fragment` via the guide link index and same-output preference — see [Cross-guide link rewriting](../client-core/compile-hooks/cross-guide-links.md#transitive-section-discovery). Validation treats remaining raw `../file.md` (or `./file.md`) to those co-compiled paths as broken when publish-only policy requires a compiled target. <!-- mdcp-paths: illustrative -->

## Standalone guide validation

A file registered under `standaloneGuides` doesn't get compile output, so the compiled phase checks it only when a guide stitches it as a shard (see [Standalone guide behavior](./coverage-scan.md#standalone-guide-behavior)). The standalone phase link-lints every registered file with the shard-phase checks, each file resolving against its own directory: there is no manifest or scope root to resolve against.

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

Each issue starts with the file and line where link lint found it. The reason and target follow, then the guide the issue belongs to, when it has one. A compiled output's line is a line of the written file. On a line with a BROKEN LINK marker, the reason is `dead anchor` and the target is the whole line. Link lint reports that line once and doesn't check the other links on it.

`mdcp check` prints these lines for a docs root at `/repo/docs` where guide a's `intro.md` has `First see [x](../b/topic.md#nope).` on line 3 and `Then see [x](#nope).` on line 5, and the standalone guide `AGENTS.md` links `./gone.md`:

```text
link: /repo/docs/AGENTS.md:3: missing file "./gone.md"
link: /repo/docs/_build/a.md:11: dead anchor "Then see **BROKEN LINK:** "x" (`#nope`) → `#nope` (dead anchor in compiled guide)." (compiled guide "a")
link: /repo/docs/_build/a.md:9: dead anchor "b.md#nope" (compiled guide "a")
link: /repo/docs/_build/guides.md:9: dead anchor "First see **BROKEN LINK:** "x" (`../b/topic.md#nope`) → `#nope` (dead anchor in compiled guide)." (compiled guide "a")
```

`formatLinkIssue` adds a second line for an issue that records the shard it came from, with that shard's line and the target as written. The issues `markBrokenLinks` returns to an API caller record it, and their line is a line of the markdown it marked. Link lint reports a marked link by its marker line, as above, and that issue doesn't record a shard. This example comes from `markBrokenLinks` on a short string, not from the fixture above.

```text
link: /repo/docs/_build/a.md:5: dead anchor "#nope" (compiled guide "a")
  → shard: /repo/docs/a/intro.md:5 → #nope
```

## Link validation acceptance criteria

- BROKEN LINK marker replaces dead link in compiled output (label, original target, broken target, reason)
- BROKEN LINK marker for missing `.md` file
- Of two links with the same label, each BROKEN LINK marker gives the target its own link was written with
- A BROKEN LINK marker replaces its own link, even when the same text is in an earlier code span
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
- A shard link points at its section heading when an earlier heading in the compiled guide has the same title, the guide's H1 or a sub-heading in an earlier shard included
- A heading line inside a fenced code block takes no slug, in the compiled phase and in the shard phase
- Compiled dead path after publish-relative link rewrite
- Compiled `.md` link to another output of the same run reports `dead anchor` when its `#fragment` matches no heading in that output, even before the output is written and from publish-only output
- Compiled link to the configured monolith reports `missing publish path` when every guide is publish-only, even when an earlier run left the file on disk
- Compiled `.md` link that only shares a file name with an output reports `missing publish path` when the file is gone and `dead anchor` for a stale `#fragment`, in publish-only output too
- Manifest-first guide link index — transitive guide does not overwrite manifest owner; index includes every `linkedSectionFiles` path for the compiling guide
- Co-compiled transitive targets rewrite before compiled validation (same-output `#slug` / `#fragment`)
- Cross-guide publish link rewrites to `guides.md#slug`, not same-doc `#slug`, with the slug the monolith gives the section
- A link to a shard under a monolith guide's directory that the guide doesn't stitch takes the slug of the shard's first copy in the monolith
- A link between two guides in the monolith targets the other guide's compiled guide from the linking guide's compiled guide, and an in-document `#slug` in the monolith, with no BROKEN LINK marker in either
- A link whose `#fragment` points at a sub-heading of another guide in the monolith doesn't compile to a BROKEN LINK marker in either document
- A compiled `#fragment` that only another guide's compiled guide has is a dead anchor, even when the monolith has that heading
- A compiled `#fragment` set to the slug of a shard in the guide's directory that the guide doesn't stitch is a dead anchor in its compiled guide, and compile marks it, even when another guide stitches the shard or the shard is in a subdirectory
- A `#fragment` set to a `FIND-*` id or a declared `{#id}` passes link lint in the output that stitches the shard, as it passes broken-link marking there
- A link from another output, the monolith included, is a dead anchor when its `#fragment` is the `FIND-*` id or declared `{#id}` of a section there
- A `#fragment` on a link to another output, the monolith included, is a dead anchor when it points at a shard that the output doesn't stitch and no heading there has that slug, even when the shard is in the directory of the output's guide
- A link to a shard's file passes, and points at another heading, when the output it points into lacks the shard's section but has a heading with the link's slug
- A diagnostic's line counts the banner, so it points at a line of the written file
- A section link in the monolith points at its section heading when an earlier guide in the monolith has a heading with the same title
- A guide in the monolith rebases paths and source tags in its compiled guide relative to that file, and in the monolith relative to the monolith, wherever the monolith is
- `mdcp check` / `mdcp compile` exit **1** on broken links by default
- `--warn-broken-links` exits **0** with `link-warn:` diagnostics
- Config parses link validation defaults
- `mdcp check` prints a stderr failure summary after peer linters when any continuing gate failed, with step names and remediation hints (not only a bare exit code after “0 errors” peer output)

## Link validation related

- [Monolith link lint](./monolith-link-lint.md)
- [Cross-guide link rewriting](../client-core/compile-hooks/cross-guide-links.md)
- [Publish-relative link rewriting](../client-core/compile-hooks/publish-relative-links.md)
- [Optional linters](../client-cli/optional-linters.md)
- [Commands reference](../client-cli/commands-reference.md)
