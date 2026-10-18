---
'@merlon-docs/merlon-docs-core': minor
'@merlon-docs/merlon-docs-cli': minor
---

List every compiled output in the refs registry, each slugged on its own

With top-level `outputFile` set, `merlon compile`, `merlon refs-gen` and
`merlon check` built `refs.json` from the monolith alone. A guide with
`compile.outputFile` isn't in the monolith, so adding a monolith dropped every
publish output's headings from `refs.json` and from `merlon refs-list`.

The registry now has an `outputs` array beside the top-level `headings` and
`slugs`, with one entry for each file compile writes. The entries list each
compiled guide in `compileOrder`, publish outputs included, then the monolith.
An entry gives the file's path relative to the docs root in `file`, the guide's
name in `guideName` for a compiled guide, and that file's `headings` and
`slugs`. Each file is slugged on its own, so a guide's `setup` heading keeps
that slug in its compiled guide when the monolith numbers it `setup-1`. Each
heading's `line` is a line of the file as compile writes it, banner included.
The top-level `headings` and `slugs` don't change.

`@merlon-docs/merlon-docs-core` adds `refsOutputTexts(results, options)`, which
returns each compiled output's docs-root-relative file and written text from
`compiledOutputDocuments`, and `buildRefsRegistry(compiledText, outputs)`.
`genRefsFromCompiled` and `checkRefsRegistry` take that list as an optional
third argument. Without it they write and check a registry with no `outputs`,
as before. So `checkRefsRegistry` without `outputs` reports a `refs.json` that
`merlon compile` wrote as stale. Pass `refsOutputTexts(results, options)` to
check it. `RefsRegistry` gains the optional `outputs` field, and the package
exports the `RefsOutput` and `RefsOutputText` types.

`LinkIssue` gains `inMonolith`, which link lint sets on each issue it reports
for the monolith. `formatLinkIssue` then labels the issue
`(guide "a" in the monolith)`. It used to label it `(compiled guide "a")`,
though the issue's file is the monolith and not that compiled guide.

`merlon refs-list` now prints the headings of every output, each with its
`file`. A guide in the monolith appears twice, once for its compiled guide and
once for the monolith. JSON entries gain a `file` field. `--format table`
starts each line with the file, and the slug is now the second column. For a
`refs.json` without `outputs`, `merlon refs-list` prints the top-level headings.
On stderr it gives the registry's path and suggests `merlon refs-gen`. The hint
that `merlon check` prints for a dead anchor now points at
`merlon refs-list --format table` for the slugs of a compiled output. It also
says that a bare `#fragment` can point at a section's id, which the registry
leaves out with the headings of a standalone guide.

`merlon refs-check` reports a `refs.json` from an earlier version as stale until
a compile rewrites it.
