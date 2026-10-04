---
'@bwilliamson/mdcp-cli': minor
---

`mdcp prose` and `mdcp check` run Vale over the files that `standaloneGuides` registers, as well as the guide directories. They add the standalone files when `vale.scanGlobs` is set too, because that setting replaces only the guide directories. Each standalone guide is linted once, even when it is inside a scanned directory or two `standaloneGuides` entries match it. The exception is a guide that a scanned directory also reaches through a symlinked subdirectory, which Vale lints under both names.

Vale gets absolute paths in every setup. Vale runs from the docs root, so when `vale.scanGlobs` is unset and a guide has no `guides[].path`, a relative `--docs-root` such as `docs` used to give Vale `docs/<guide>`, which resolves nowhere from there. When that was Vale's only path, Vale read it as text and passed without linting anything. With any other path next to it, such as a second guide, Vale stopped with a runtime error. Those guide shards are linted now in both cases, so expect new alerts from them as well as from the standalone guides.

When `vale.scanGlobs` is unset and a guide has no `guides[].path`, `--docs-root .` used to give Vale relative paths such as `guide`, so a relative `.vale.ini` section such as `[guide/*.md]` matched. That section stops matching now. The files it named get the settings of the Markdown section, such as `[*.md]`, instead, and Vale prints absolute file paths. Start such a section with `**/`, as in `[**/guide/*.md]`, which matches before and after this change.

With Vale installed, `mdcp check` and `mdcp prose` fail after this upgrade, with or without `--require-vale`, when a standalone guide or a newly linted shard breaks an error-level Vale rule. A `vale.scanGlobs` entry for a missing path, such as a glob, can fail them too, because Vale does not expand globs. When a missing path is Vale's only argument, Vale reads it as text and passes without linting anything. With more than one path, as when standalone guides are added, a missing one stops Vale with a runtime error. `mdcp check` points a runtime error at `.vale.ini` and `vale.scanGlobs`, and points alerts at the opt-out below.

To keep Vale off one file, such as vendored text, give it a section at the end of `.vale.ini`, after every section that matches the file, such as `[*.md]` or `[*.{md,mdx}]`:

```ini
[**/CODE_OF_CONDUCT.md]
BasedOnStyles =
```

Start the section with `**/`, because mdcp passes Vale absolute paths, and a section such as `[CODE_OF_CONDUCT.md]` never matches. A rule that an earlier section sets by name, such as `MDCP.DatedClaim = warning`, stays on until this section sets it to `NO`. The CLI README's "Opt a standalone guide out of Vale" section has the full example.

`standaloneGuides` globs match without the coverage scan's ignore list, so a broad glob such as `**/README.md` also sends files under `node_modules` to Vale. List narrower globs.
