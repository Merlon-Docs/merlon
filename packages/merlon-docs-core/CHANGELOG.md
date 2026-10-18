# @merlon-docs/merlon-docs-core

## 1.0.0

### Major Changes

- 4b846c4: Merlon Docs 1.0.0 is the first stable release. The CLI, the core library, the presets and the Agent Skills publish under the npm `latest` tag: install with `npm install @merlon-docs/merlon-docs-cli`. From 1.0.0 on, a breaking change needs a major version. The `1.0.0-draft.N` prereleases stay on the npm `draft` tag.

### Minor Changes

- 99b9575: A `merlon.config.json` now declares its config format version in `configVersion`: the version of `@merlon-docs/merlon-docs-core` it was written for, since core defines the format. Loading a config that declares no version fails, and the error names the line to add. Breaking: add `"configVersion": "<installed core version>"` to configs that have no version key. A config with the former `standardVersion` or `protocolVersion` still loads, migrated to the installed version, and those keys are read until 2.0.0; the CLI's upgrade of `mdcp.config.json` writes `configVersion`.

  Core exports `MerlonConfigFileSchema`, the file format with `configVersion` required, and `DEFAULT_CONFIG_VERSION`, the package's version. `MerlonConfigSchema`, the in-memory config the compile API takes, doesn't require a version. `DEFAULT_STANDARD_VERSION` is a deprecated alias of `DEFAULT_CONFIG_VERSION` until 2.0.0. The generated `merlon.config.schema.json` marks `configVersion` required. The Agent Skill's getting-started workflow tells agents to set `configVersion`.

- 9bc05cd: Lint each compiled output against its own slugs, and lint the monolith as a document

  `lintLinks` accepted a compiled `#fragment` when it matched a heading of the
  output or the slug of any shard in the guide link index. So a guide could link
  `#topic` to a heading that only another guide's compiled guide has, and
  `merlon check` passed. The monolith was never linted as a document, apart from
  its BROKEN LINK markers. Issue lines also left out the banner, so a diagnostic
  named a line two lines above the link in the written file.

  Each `CompileGuideResult` now has `knownSlugs`, the slugs broken-link marking
  accepted besides the headings of `text`: the slug of each section `text`
  stitches, such as a `FIND-*` finding id or a declared `{#id}`. A guide in the
  monolith also has `monolithKnownSlugs` for `monolithText`, the section slugs of
  every copy there. Link lint checks a fragment in an output against that
  output's headings and known slugs, so compile and check agree. A fragment on a
  link to another output still has to match a heading there, so a link to a
  shard that the output doesn't stitch fails, even when the shard is in the
  directory of the output's guide. It passes only when another heading there has
  the same slug, and it then points at that heading.

  Broken-link marking now accepts only the slugs of sections the document
  stitches. It used to accept the slug of each shard that the guide link index
  gives the guide, such as a shard in the guide's directory. So a link to such a
  shard that the guide doesn't stitch passed compile and check and pointed at no
  heading. Compile now marks it. In the monolith, a link to a shard that no
  guide there stitches is marked too, unless another heading or section there has
  the slug the link takes. Such a link then points at that heading, or at no
  heading when only a section's declared `{#id}` has the slug, and compile and
  link lint pass it in the monolith. Each copy in the monolith accepts the section
  slugs of every copy, whichever guide is the shard's owner.

  Link lint reads each output as compile writes it, banner included, through the
  new `compiledOutputDocuments` export. It lints the monolith as a document of
  its own and leaves out an issue that the guide's compiled guide already
  reports for the same link. It matches a link issue or a BROKEN LINK marker at
  the same line of the guide's text first. It reports a monolith issue under the
  guide whose copy holds its line, as it does for a compiled guide. Called without
  `compileOptions`, `lintLinks` now counts the banner from config in its line
  numbers and lints the monolith too. The `knownSlugs` option of `assembleGuide`
  is now marked deprecated. Assembly already ignored it.

  `merlon compile` and `merlon check` report these issues. A diagnostic now gives the
  line of the written file, banner included, and a monolith issue gives the guide
  whose copy holds its line.

  Compile now adds a newline to a `banner` that lacks one. The banner's last line
  used to share a line with the guide's title, which then had no anchor in the
  written file. A later heading with the same title lost its number too. A link
  to either heading named a slug that the written file didn't have.

  A check that passed before can fail when a guide links a `#fragment` that only
  another output has. Link it through its shard file instead, so compile
  rewrites the link to that output. That doesn't clear a link to a `FIND-*`
  shard or to a heading with a `{#id}` marker, since no heading in the other
  output has the id that the rewritten link gives.

- 9bc05cd: Match compiled `.md` links to compile outputs by path, not file name

  `merlon check` skipped a compiled `.md` link whenever its file name matched any
  output of the run. With the root `README.md` as an output, a link to a package
  `README.md` passed even when that file was gone or its `#fragment` named no
  heading. Publish-only output had a similar fallback that took an allowed publish
  path with the same file name as the target.

  A link now points at another output only when its resolved path is that
  output's path. Its `#fragment` is checked against the headings in that output's
  compiled text, before or after the output is written, from publish-only output
  as well. Any other `.md` target has to exist, and its fragment has to match one
  of its headings. The monolith counts as an output only when at least one guide
  is stitched into it, so a link to a monolith that is never written reports
  `missing publish path`, even when an earlier run left the file on disk.

  A check that passed before can now fail. A link to a sibling package README
  with a stale fragment is the likely case. Some failures are in links that
  compile writes itself, so editing shards won't clear them. A cross-output link
  to a `FIND-*` shard or to a heading with a `{#id}` marker is one. Compile
  rewrites it to `other.md#find-004` or `other.md#id`, but the heading in that
  output gets a slug from its text, such as `find-004--example-finding`.

  The `knownOutputBasenames` option is deprecated and ignored.
  `lintCompiledLinks` and `validateCompiledLinkTarget` take `knownOutputPaths`,
  the absolute paths of the run's outputs, instead. They also take
  `unwrittenOutputPaths` for configured outputs that the run doesn't write.

- 9bc05cd: Make the file extension lists broad, split and configurable

  The set of extensions that mark a link target or path claim as naming a file was
  a fixed regex covering about 30 mostly web-stack extensions. It is now two
  default lists. **Code** extensions span JVM, .NET, systems, scripting, template,
  schema and infrastructure formats: a symbol can cite a line in one of these.
  **Data** extensions cover configuration, tabular and serialized formats, which
  are validated for existence exactly like code but never cited by line, because
  an identifier found in inert content is an occurrence rather than a declaration.

  `lint.codeExtensions` and `lint.dataExtensions` extend the defaults for a project
  on a stack they do not list. Moving an extension into the code list is also how a
  repository asks for lines to be cited in a format that ships as data, its
  workflow YAML for instance. Entries are accepted with or without a leading dot,
  and matching is a set lookup rather than a generated pattern, so a configured
  value cannot change how matching behaves.

  Both lists together govern link validation and path resolution in prose, which
  additionally always accepts `.md` and `.mdx`. The `codeEvidence` compile hook
  rewrites links for either list and cites lines only from the code one.

  Broadening the defaults exposed a compile bug: `codeEvidence` rebased a file
  link relative to the output file only when it also added an `#L` line fragment,
  so a link to a data file stayed shard-relative and broke in output published
  from another directory. It now rebases whenever the target resolves.

- 9bc05cd: `resolveGuideDir` and `guideScanDirs` return absolute paths when `docsRoot` is relative. With a relative `--docs-root` such as `docs`, a guide with no `guides[].path` used to reach markdownlint as `docs/<guide>` when `lint.markdownlint.shardsGlobs` is unset. markdownlint-cli2 runs from the docs root, where `docs/<guide>` doesn't exist, so `merlon lint` and `merlon check` linted none of those guides' shards and passed. Those shards are linted now, so expect new markdownlint findings from them.

  Without `shardsGlobs`, `shardLintPaths` returns a glob for the `.md` and `.markdown` files in each guide directory, such as `<guide>/**/*.{md,markdown}`. It used to return the bare directory, which markdownlint-cli2 expands to every file in it, so an image or text file beside the shards was linted as Markdown. API callers that read the result as a list of directories should call `guideScanDirs` instead.

  `shardLintPaths` returns paths for markdownlint-cli2 running with the docs root as its cwd, as `merlon lint` and `merlon check` run it. API callers must run markdownlint-cli2 from the docs root with them. From any other cwd, markdownlint-cli2 resolves the relative paths against that directory, so it misses the guide shards and lints the wrong files or none. A guide under the docs root gets a glob relative to the docs root, which keeps the checkout path out of it. An absolute `--docs-root` used to put the checkout path into each guide directory, and each `shardsGlobs` entry was resolved to an absolute path, so under a directory whose name has glob characters, such as `repo (copy)` or `proj {a,b}`, the shard pass linted 0 files and passed.

  A guide outside the docs root, such as one at `guides[].path: "../pkg/guide"`, gets an absolute glob, so the shard preset's `!**/index.md` still reaches it next to in-root guides, and a symlinked docs root still finds it. Glob characters and quotes in each path that goes into a glob are escaped.

  `shardsGlobs` entries go to markdownlint-cli2 as written, and it resolves them against its cwd, the docs root. A negated entry such as `!legacy/**` excludes files now, where it used to become `<docsRoot>/!legacy/**` and exclude nothing. An entry that starts with `../` gets the escaped absolute directory those segments name in their place, followed by `/**` for a directory. The shard preset's exclusions then apply to it too. A negated `../` entry also gets `**` in front of that path, which lets it exclude files. A `.` entry becomes `**`, so markdownlint-cli2 still lints every file under the docs root.

  The same relative paths kept `merlon check` from reporting an orphan shard at the top of a guide when the manifest linked a nested shard with the same file name, such as `sub/a.md` next to an unlisted `a.md`. That orphan is reported now, and `checkOrphansForGuides` resolves a relative `dir` against the process cwd. A shard that a guide reaches in a sibling directory whose name starts with the guide's name, such as `guide-shared/x.md` from `guide`, no longer counts as listed in a `guide-shared` guide, so an orphan there is reported as it is for a sibling with any other name. The shard counts under its file name in `guide` instead, as a shard in a sibling with any other name does, so an unlisted `x.md` at the top of `guide` passes.

  The compiled markdownlint preset lists `_build/guides.md` as well as `guides.md`, so it lints a monolith named `guides.md` under the default `outputDir`. It used to list only `guides.md`, which matches only with `outputDir: "."`, so under the default layout the compiled pass linted 0 files and passed. Expect new findings from the compiled pass under that layout, from the rules both presets leave on, such as `MD022`, and from `MD052` and `MD053`, which check reference links and their definitions. A `guides.md` left at the docs root by an earlier `outputDir: "."` layout is linted too, so delete it. With no monolith, or a monolith with another name or path, copy the preset and point its `globs` at your compiled outputs.

  The compiled preset now keeps every rule setting of the shard preset, so a rule the shard pass turns off, such as `MD024` or `MD033`, no longer fails the compiled pass. With `outputDir: "."`, the compiled pass reports fewer findings than before, except from `MD003`, which now requires ATX headings as the shard preset does, so a monolith with setext or closed ATX headings fails it.

  The shard preset excludes `_build/**` as well as `guides.md`. A guide at `guides[].path: "."` gets `**/*.{md,markdown}`, and a `.` entry in `shardsGlobs` becomes `**`, so the shard pass also linted the compiled outputs under the default `outputDir`. An absolute `--docs-root` did that before. A relative one linted 0 files, so it shows up there only now. Any other compiled output, such as one under another `outputDir`, needs its own exclusion in a copy of the preset.

  The CLI README's in-scope guide fileset section says how both markdownlint passes resolve their paths.

- 4b846c4: Add `merlon review`, a report-only command that flags documentation sprawl across guide shards: index groups with too many shard links (`index-size`), shards with too many prose words (`long-shard`), paragraphs repeated in two or more shards (`duplicate-paragraph`), and shards in one guide that share a title (`similar-titles`). Each finding names the files and a fix (with `fix:` printed once per signal group header in text output). Use `--json` for machine-readable output, `--strict` to exit 1 when there are findings, and `--guide <name>` to review one guide (duplicates shared with other guides included). Tune thresholds with the new optional `review` config object (`maxIndexEntries`, `maxShardWords`, `minDuplicateWords`); paths in `scan.ignore` are skipped. Core exports `reviewDocs` and `formatReviewReport`.
- 9bc05cd: Assemble a guide in the monolith once for its compiled guide and once for the monolith

  A guide without `compile.outputFile` is written to its own compiled guide and,
  when the config sets top-level `outputFile`, into the monolith too. Compile
  assembled it once, against the monolith, and wrote that text to both files.
  Its compiled guide then had paths and source tags relative to the monolith,
  so they broke whenever the monolith was in another directory. A link
  between two guides in the monolith compiled to a `#slug` that the linking
  guide's compiled guide doesn't have, so compile replaced it with a BROKEN LINK
  marker in both files and exited 1. In the monolith itself, a section link could
  point at an earlier guide's heading with the same title, and `merlon check`
  passed.

  Compile now assembles such a guide twice. Its compiled guide rebases paths and
  source tags relative to itself, and it links another guide in the monolith
  through that guide's compiled guide, such as `b.md#topic`, when that guide
  stitches the target shard. Otherwise it links the monolith. Its copy in the
  monolith rebases relative to the monolith and links the monolith's own
  headings. One slugger numbers every guide in the monolith, in `compileOrder`,
  so a section link there takes `#setup-1` when an earlier guide also has a Setup
  heading. A publish output that links a guide in the monolith takes the
  monolith's slug. An explicit `#fragment` is never renumbered, so a hand-written
  `#setup` can still point at an earlier guide's heading in the monolith.

  Compile marks broken links in a guide's copy in the monolith after every copy is
  assembled, against the headings of the whole monolith. So a link such as
  `../a/setup.md#details` to a sub-heading of another guide stays a link there.
  `lintLinks` reports a BROKEN LINK marker that appears only in the monolith. It
  matches each marker in a guide's copy in the monolith to the same marker in
  that guide's compiled guide, so a marker in both files is reported once, even
  when the rest of its line differs. A stale `#fragment` on a link to another
  guide in the monolith is reported once for each file: as a dead anchor in the
  linking guide's compiled guide and as a marker in the monolith.
  `LocaleBrokenLinkCopy` gains the optional `findMarkers` method, which returns
  each marker on a line, and `createLocalePack` provides it.

  `markBrokenLinks` now replaces each broken link where it stands, and its marker
  gives the target that link was written with. It used to pair a broken link
  with the first unused shard link of the same label among the broken ones, and
  to replace the first text that matched the link, which could be in an earlier
  code span. So a marker could name another link's target, or replace the text in
  the code span and leave the broken link as it was. It now pairs the k-th link
  with a label with the k-th provenance entry with that label. A link then gets
  the same marker in a compiled guide and in the monolith. `extractLinks` gives
  each link's `offset` in the markdown.

  `CompileGuideResult.text` is now each guide's own compiled guide. For a guide
  in the monolith it used to hold the monolith copy, so code that read it as the
  monolith copy should read the new optional `monolithText` instead.
  `compileGuidesFromResults` and `compileGuides` stitch the monolith from
  `monolithText`. `GuideLinkEntry` gains the optional `guideFile` and
  `monolithSlug` fields. Both are set only for a shard whose owner is in the
  monolith: `guideFile` only when the owner stitches the shard, and
  `monolithSlug` only when some copy in the monolith stitches it.
  `assembleGuide` and `rewriteCrossGuideFileLinks` take a `monolithFile` option.

  `merlon compile` and `merlon check` change with it. A link between two guides in the
  monolith no longer fails them, and a link that compile marks only in the
  monolith now does.

  Compile output changes for configs with a monolith. It can also change in a
  config without one, for a broken link that shares its label with an earlier
  link or whose text also appears in an earlier code span. A guide in the
  monolith takes about twice as long to assemble. Its compile hooks, a
  registered custom hook included, run twice for each shard, with fresh
  `hookState` for each assembly.

- 9bc05cd: Add opt-in path resolution for backtick paths in prose

  `merlon check` can now resolve backtick-quoted repository paths in shards and
  standalone guides, and fail on the ones that resolve nowhere. This catches a
  document describing code, files or a component that no longer exists — prose a
  link check never reads.

  Off by default (`lint.paths.severity: "off"`). Turning it on for a corpus
  written without it produces findings that are correct as written, so a
  repository enables it deliberately, cleans up once, and keeps it on.

  A claim needs a directory segment and a name, so a bare `index.md`, a single
  `src/`, a command line, a glob, a flag and a code identifier are not claims.
  Claims resolve against the file's own directory, the scan root, the docs root,
  each guide `scopeRoot`, and `lint.paths.searchRoots`.

  Two config lists declare why a path legitimately does not resolve, and they say
  which case they are rather than sharing one allow-list. `lint.paths.generated`
  covers paths that exist only after a build or install, matched as a prefix since
  nothing under one exists yet. `lint.paths.vocabulary` covers a name the
  repository documents without having, such as a tier the standard defines and a consumer creates,
  matched exactly so an invented file beneath that name still has to resolve.

  Because no pattern separates a stale path from an always-illustrative one, the
  discriminator is authorial: `<!-- merlon-paths: illustrative -->` exempts the file
  when it stands alone on a line, or one line when it trails content.

- 9bc05cd: List every compiled output in the refs registry, each slugged on its own

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

- 9bc05cd: Remove the unused llms-index helpers `parseLlmsIndexFilename`, `isLlmsIndexDraftFilename`, `expandProtocolVersion`, `abbreviateProtocolVersion` and `protocolVersionToReleaseRef`, which were left over from the removed `merlon export`, and drop `export.llm` from `merlon.config.schema.json`. Breaking for importers of those names.
- 4b846c4: MDCP (MarkDown Context Protocol) is now Merlon Docs. The packages publish as `@merlon-docs/merlon-docs-cli`, `@merlon-docs/merlon-docs-core` and `@merlon-docs/merlon-docs-presets`, and the CLI command is `merlon`. The Agent Skill installs as `merlon-docs` with `npx skills add Merlon-Docs/merlon --skill merlon-docs`.

  The config file is `merlon.config.json`. Until 2.0.0, a CLI run that finds `mdcp.config.json` and no `merlon.config.json` upgrades the project itself. It writes the config to `merlon.config.json` with `protocolVersion` renamed to `standardVersion` and set to `1.0.0-draft.0`, deletes `mdcp.config.json` and prints a notice. The illustrative-paths marker is `<!-- merlon-paths: illustrative -->`, and the former `mdcp-paths` spelling still works until 2.0.0.

  The Vale style is `MerlonDocs`, so a rule reads `MerlonDocs.DatedClaim`. Compiled outputs carry `<!-- merlon-shard: … -->` markers. In the core API the config types are `MerlonConfig`, `MerlonConfigInput` and `MerlonConfigSchema`, and the `Mdcp*` names stay as deprecated aliases until 2.0.0.

  To migrate a project, install the new packages, run any `merlon` command once to upgrade the config file, and change `MDCP` to `MerlonDocs` in `.vale.ini`, in `<!-- vale MDCP.… -->` comments and in the `StylesPath` link to the presets.

- 4b846c4: Validate source-file and directory link targets and link-lint standalone guides

  `merlon check` now fails on a link whose target names a source file or directory (`path/`) that does not
  resolve, in shard sources and in compiled output. Previously any target not
  ending in `.md` was skipped, so a link to a deleted module or directory passed the gate
  indefinitely.

  Files registered under `standaloneGuides` are now link-linted with the same
  checks a shard gets. They are never compiled, so no phase read their links
  before; the docs already claimed they were validated.

  Targets that name no resolvable file or directory class — a bare word —
  stay unvalidated, and external `http://`, `https://` and `//` URLs are skipped without network requests.

- 4b846c4: The config key for the version of the Merlon Docs standard is now `standardVersion`, defaulting to `1.0.0-draft.0` with the 1.0 draft line (replacing the former `0.5.0.0` label and `protocolVersion` name). A config that still sets `protocolVersion` keeps working until 2.0.0: when `standardVersion` is absent, `loadConfig` and the new `parseConfig` migrate it to `1.0.0-draft.0` on `standardVersion`, and they fail when the two keys hold different values. A parsed config still has `protocolVersion`, set to the same value. The JSON schema marks `protocolVersion` as deprecated.

  The copyright line in each license now reads Merlon Docs. Code comments, the JSON schema and the docs now call the specification "the standard". The presets README now refers to the `MerlonDocs` Vale style, which the rename had missed.

### Patch Changes

- 99b9575: Compile discards a shard's leading YAML front matter instead of stitching it into the guide, where it rendered as a horizontal rule and a stray heading. When compile drops lines before a shard's body, the opening source tag names the line the body starts on (`<!-- merlon-shard: start guide/section.md#L6 -->`), so link diagnostics still report the shard's own line numbers.
- 99b9575: Describe each documented key of `MerlonConfigSchema` in the zod schema itself, so `z.toJSONSchema(MerlonConfigSchema)` carries the same descriptions, title and `protocolVersion` deprecation as the editor schema. The repository's `merlon.config.schema.json` is now generated from it during the build.
- 4b846c4: The core README's section on the shard and peer tool exports comes from `docs/client-core/api-shard-and-peers.md`, the shard's new name. Its shard markers name that path.
- 9bc05cd: Find broken-link markers in linear time

  Link validation looks for a BROKEN LINK marker on each line of compiled output with `lineHasMarker`, and monolith link lint lists the markers on a line with `findMarkers`. Both ran a regex built from the locale's `markerTemplate`, with a lazy `.*?` for each variable but `markerLabel`. On a crafted line that regex tries every choice of where each variable ends, so with the four variables of the en-US template its time grew with about the fourth power of the line's length. A line of 733 characters took 115 ms, and one of 2,878 took 28 s.

  A scanner now finds the template's literal parts in order, with no line terminator between two of them, and returns the markers that the regex returned. Its time grows linearly with the line, and the 2,878-character line takes under 1 ms. The link pass of compiled link lint also asked about a line once for each link on it, so a line of 16,000 links with a marker at the end took 257 ms. That pass now asks once per line, and the line takes 12 ms. New cases in the ReDoS budget suite cover crafted marker lines and a marker line with many links.

- 4b846c4: The CLI README's Config essentials section keeps `--config` vs `--docs-root`, Minimal config and Path layout. Its reference material, Feature settings, Config key map, Review thresholds, Schema-only fields and Full schema and sample config, now sits in a Config reference section after Commands reference, and Shared glossary is its own section after Config essentials. The moved headings keep their anchors in the compiled README, and links into it still resolve. In the Merlon Docs repository, the shards are `docs/client-cli/config-reference.md` and `docs/client-cli/shared-glossary.md`.

  The core README's Compile API links Feature settings in Config reference.

- 4b846c4: The CLI README's Cross-links and refs says a standalone guide's headings are in the refs registry only when a guide stitches the file through its manifest or a `compile.scopeRoot` walk, and links Standalone guide behavior as the owner, where it said compile never writes those headings. Config essentials states the `--config` vs `--docs-root` rule once, and Global options in Commands reference and the Quick start link it instead of restating it. Each package README's Stability section opens with one sentence that says what can change before 1.0.0 and links the pre-1.0 policy. The CLI README's section also keeps the advice to read the changelog and release notes before upgrading, and the core README links it.
- 4b846c4: CLI README fixes from a doc review. Quick start begins with the minimal config. Once markdownlint-cli2 and the presets are installed, it shows the config again with the `lint` key that lints shards with the presets' shard config, and Config essentials' Minimal config keeps the field table and links that block. It says to fail CI on `git diff --exit-code` after `merlon compile` when a repository commits compiled outputs, because `merlon check` writes every output again and passes on a stale one. Its check commands pass `--skip-vale` until Vale is set up, because `merlon check` runs Vale whenever it finds `vale`, and Vale fails when the `.vale.ini` that `vale.config` names is missing. The verification checklist now ends Install and quick start. Requirements says the CLI needs Node.js 20.19.0 or later. Consumer migration documents the top-level `source` and each guide's `source`, which `merlon shard` needs, under `#map-the-document-to-guides`. It says to set `demoteFirstH1` on every `merge` part after the first, because a later part that keeps its H1 loses that heading and the text before its first `##` heading. It says `merlon shard` starts a new shard at each `##` heading whatever a guide's `splitLevel` says, and writes each guide to the directory named after the guide, ignoring `guides[].path`. A `directory` source's `path` must be outside the guide's own directory, because `merlon shard` deletes that directory first. Compile ignores the `compile-order.txt` file from `merlon shard`. It also documents a source's optional `preamble.promoteToH2`, which `merlon shard` reads from the first guide only.

  Config essentials states one rule for `compile.outputFile`, top-level `outputFile` and `refs.registryFile`. Each one resolves from `outputDir`, unless it is absolute or already lands inside `outputDir` when read from the docs root. A relative backup directory has no such exception. It also says that `--docs-root` defaults to the directory the command runs in, and its new Config key map section lists the page that documents each config key, with the core Compile hooks index beside Default compile hooks for `compile.hooks`. `protocolVersion` is listed as a schema-only field, and a new last section, Full schema and sample config, links the JSON Schema file and the sample guides' config. The table of peer tools in Optional linters gains an `merlon check` row. The page says Merlon Docs looks for `vale` in `node_modules/.bin` before `PATH`, names `lint.markdownlint.shardsConfig` and `lint.markdownlint.compiledConfig` and says their paths are read from the docs root. It says the shard pass takes its scope from the CLI and the compiled pass from the compiled config's `globs`, and that a relative `lint.links.target` is read from the docs root. It says `merlon fix` needs a markdownlint-cli2 config that lists `globs` and always exits 0. Project layout says `shards.md` is a manifest only when `compile.manifest` names it. Why Merlon Docs for coding agents moved into Get started, and the stitched glossary terms follow a Terms in this guide heading that links each one.

  These CLI README anchors are gone. Use `#repo-root-npm-scripts` in place of `#agent-integration`, and `#config-key-map` in place of `#compile-hooks-and-multi-guide-links`. `#end-user-value`, `#registry-location` and `#workflow` merged into the Compile and the refs registry section and Cross-links and refs.

  The core README links the pre-1.0 policy from Stability, and links the CLI README's Path layout where it describes how compiled outputs and the refs registry resolve. It says backup paths don't use `resolveUnderOutputDir`. Shard and peers links Consumer migration for where `merlon shard` splits a guide, where it said the split falls at `splitLevel`.

- 9bc05cd: README cleanup. The CLI README explains in one section, "Not the Agent Skill", how the CLI, the core library and the Agent Skill differ. The "LLM collaboration" and "Agent Skill (related)" sections that repeated it are gone. The core README folds its Overview section into About.

  Deep links to the CLI README's `#llm-collaboration` and `#agent-skill-related` anchors no longer resolve, so point them at `#not-the-agent-skill`. The core README's `#overview` anchor is gone too, and its content is now under `#about-merlon-docsmerlon-docs-core`.

  Both READMEs now put their related packages, further reading and license after the guide sections, just before the glossary. In the CLI README these sat inside the Agent integration section, and in the core README they came before the API sections. The related packages are a list instead of a table, and the presets entry describes the Merlon Docs Vale style as well as the markdownlint configs. The `#related-packages`, `#further-reading` and `#license` anchors don't change.

  The CLI README says once, in the `refs` glossary entry, that refs check links and do not find documents. Other CLI sections no longer repeat it, and the command reference links to that entry. The `refs` and `refs registry` glossary entries use the registered command names `merlon refs-gen` and `merlon refs-check`, and the config table calls `refs.registryFile` the refs registry file instead of a lookup table.

  The CLI README gives the output layout and its defaults once, under "Path layout" in Config essentials. Project layout and Consumer migration link there instead of repeating the outputs table, so links to `#generated-output-outputdir-default-_build` or `#output-layout` should point at `#path-layout`. Config essentials renames "Guide = one subdirectory" to "Resolution bases", and the refs registry section renames its own "Path layout" heading to "Registry location", so the README has one "Path layout" heading. In the core README, the Config API section says which defaults `loadConfig` fills and links to Config essentials for the output layout instead of listing it.

  Config essentials gives the minimal config and its top-level field table their own "Minimal config" section. They used to sit under "Link validation" and read as part of it. The "Opt-in output backup", "Link validation" and "`sectionsHeading`" subsections are gone. A new "Feature settings" section lists the default of each link, path and backup key, and links to the feature spec that explains each key. Links to `#opt-in-output-backup`, `#link-validation` or `#sectionsheading` should point at `#feature-settings`.

  The CLI README's Consumer migration section is now about moving an existing document into shards. Its "Steps for a new consumer repo" are gone: the Quick start already had the config and repo-root commands, and it now ends with adding the `docs:compile` and `docs:check` scripts (with `--require-lint`) and running them in CI. Links to `#steps-for-a-new-consumer-repo` should point at `#quick-start`. The manifest section is one paragraph that links to the Manifest compile order spec. The pointer to upgrade notes moved to Stability. The core README's Stability section now asks for the changelog and release notes of each Merlon Docs package you use, in the same words as the CLI README.

- 4b846c4: The core README's codeEvidence section states the rules the hook applies. Symbol lookup links the first line where the symbol appears as a whole word, which can be an import or a comment, and a line range cites the declaration. The hook skips a path to an extensionless file when the path has a `.` in it, such as `../../Makefile`. `compile.scopeRoot` and `compile.outputFile` resolve from the docs root and from `outputDir`, and the example config writes its output to the repository root as the compiled example shows. The example uses neutral file names.
- 9bc05cd: The publish-relative pass no longer rewrites a link that `codeEvidence` already rebased.

  `codeEvidence` writes a source link's path relative to the link base. The publish-relative pass then read that path as relative to the shard and looked it up from the shard's directory first. When that path led to another file from there, the link pointed at it, with a line fragment taken from the file the hook had read. A shard at `docs/a/sub/deep.md` that links `../../../src/foo.ts` compiled to `../src/foo.ts#L3` in `docs/_build/a.md` once `docs/src/foo.ts` existed. The link now keeps the path the hook wrote, `../../src/foo.ts#L3`.

  Assembly marks the links the hook rebased once every hook has run. The hook itself returns its links without a mark, to a direct `applyCompileHooks` call and to a hook that runs after it. Assembly finds each link by the text the hook wrote and by its place among the links with that text, so a link that the shard wrote with the same text and the hook left alone doesn't get a mark. When a hook listed after `codeEvidence` changes that text, or adds or removes a link with that text above it, the publish-relative pass can still rebase the hook's path, and leave another link with that text as it is.

  Link passes, `docs/features/compile-pipeline/link-passes.md` in the Features Guide's Compile pipeline group, states the rule, and Publish-relative link rewriting, `publish-relative-links.md` there, lists a link the hook rebased among its exclusions. The core README's codeEvidence section now says which `../` links the publish-relative pass rebases, and the publish-relative examples from Merlon Docs’ own docs show links that pass rebases.

- 4b846c4: Path lookup order, `docs/features/compile-pipeline/path-lookup-order.md` in the Features Guide's Compile pipeline group, states each pass's path lookup order once, in a table that matches the code. The per-hook lists it replaces were wrong. No pass tries the shard's parent directory. The publish-relative rewrite tries `compile.scopeRoot` before the guide directory. `codeEvidence`, `inlineInserts` and the cross-guide rewrite try the working directory and its parent before `compile.scopeRoot`.

  The `codeEvidence` section now says what the hook does with the fragment of a link whose file it can't find. It keeps an existing `#L` fragment or adds one from a line range in the label or path, and it drops any other `#fragment`. Its exclusions list said such a link was left unchanged. The section also says a data file gets an `#L` fragment from a line range the shard writes, and never from symbol lookup. It said a data file never got one.

  Link passes, `docs/features/compile-pipeline/link-passes.md` in the same group, lists the three link passes in one table, and the Architecture diagram of the core README's compile hooks section shows the per-shard intra-guide pass. The Built-in hooks list links that shard in place of its entries for the cross-guide and publish-relative passes, which aren't hooks. The cross-guide section's "Link rewrite passes" table and the publish-relative section's "Division of labor" table are gone, so links to `#link-rewrite-passes-cross-guide-vs-intra-guide` or `#division-of-labor-three-link-passes` should point at `link-passes.md`. The "guideDir misaligned with shard tree" section is now "Guide directory apart from its shards" in `path-lookup-order.md`.

  Cross-guide link rewriting, `docs/features/compile-pipeline/cross-guide-links.md` in the same group, no longer describes which links the compile walk follows. The Manifest compile order spec in the features guide covers that now, so links to `#transitive-section-discovery` or `#what-the-walk-follows` should point at its "Linked shards and the file-name fallback" section. The ownership rules for the guide link index are under "Index ownership" in that shard, and its "Guide link index" section says which shards get an entry: each shard the walk compiles that opens with a heading, and each `FIND-*` finding. The core README's Config API section has a publish-outputs paragraph that links to the link passes instead of restating them.

  The matching and exclusions lists of Publish-relative link rewriting, `docs/features/compile-pipeline/publish-relative-links.md` in the same group, now match the code.

  The `inlineInserts` search root examples use `shared`, the parent of a `diagrams/` library. Compile resolves the whole link path, such as `diagrams/flow.md`, against each root, so a root named `diagrams` looks for `diagrams/diagrams/flow.md`.

- 9bc05cd: Read manifest, shard and insert links in linear time

  Compile reads the `.md` links and `](#slug)` links of a manifest, then the `.md` links of each shard it follows a link to. The `inlineInserts` hook reads links into an insert library. Both read the whole text at once. The regexes that did this read a link target with `[^)]`, which crosses line breaks. On a crafted text the `.md` and insert link regexes rescanned the rest of the text from each `[` and again after each `.md`, so their time grew with the cube of the text's length. A shard of 1,000 lines of `See [x](a.md#` took 4.5 s to compile, and an `inlineInserts` body of 21,600 characters took 8.4 s. The slug link regex rescanned the rest of a manifest from each `](#`, so its time grew with the square of the manifest's length.

  Linear scanners now find the same links, with the same labels, paths and fragments, and the same two inputs take 9 ms and under 1 ms. New cases in the ReDoS budget suite cover a shard, a manifest and an insert body whose link targets never close, and texts whose links share a label end or a target end.

  The `inlineInserts` section of the core package README now states the rule the hook matches links with. The target starts with a library directory, after an optional `./` or run of `../`, and the directory and the `.md` can take any case. A `#fragment` after the `.md` can't be empty.

- 4b846c4: The core README keeps the API reference and what a hook author or config author uses: the compile hooks overview, the extension pattern and each built-in hook. The compile pipeline specs moved to a Compile pipeline group in the Features Guide, under `docs/features/compile-pipeline/`. The group lists Link passes, Path lookup order, Cross-guide link rewriting, Publish-relative link rewriting and Tables after link rewriting, and the core README links them. Its `#link-passes`, `#path-lookup-order`, `#guidedir-misaligned-with-shard-tree`, `#cross-guide-link-rewriting`, `#publish-relative-link-rewriting` and `#tables-after-link-rewriting` anchors are gone, with the anchors of their subsections. A link to one of them should point at the same heading in the moved shard. The guideDir section is now Guide directory apart from its shards, in Path lookup order. The move also renamed or dropped these subsections. In Cross-guide link rewriting, the section with the old anchor `#cross-guide-purpose` is now Guide link index, so a link to it should point at `cross-guide-links.md#guide-link-index`, and its dead-anchor and wrong-heading limits are under `#link-index-limits` there. The section with the old anchor `#default-_build-outputs-and-transitive-targets` is gone, since it didn't add a rule, and a link to it should point at `#same-compiled-output-preference`, the rule it pointed at. In Publish-relative link rewriting, the section with the old anchor `#why-this-pass-exists` is now Shard-relative paths and the one with `#repo-dogfood-examples` is now Examples from this repository, so a link to them should point at `publish-relative-links.md#shard-relative-paths` and `publish-relative-links.md#examples-from-this-repository`. The group also has a Fence scan shard and a Section slugs shard, split from the stripAnchors spec and the cross-guide spec.

  The CLI README links the moved shards where it linked those core README sections.

- 4b846c4: Use "compiled guide" for the file compile writes for one guide, and keep "monolith" for the optional top-level `outputFile`. The `merlon compile` help text now reads "Stitch shards into compiled guides". The `ignoreGuides` type docs now say that links to a listed guide's shards keep source `.md` paths instead of `#slug` targets in the file that holds the target guide. The `standaloneGuides` schema description now says a standalone guide doesn't get compile output of its own. The `merlon shard` help text now reads "Split a source document into shards (md-tree)". The `merlon-docs` skill's context guardrails tell agents not to load whole compiled output (a compiled guide or the monolith).
- 4b846c4: The core README's API sections are titled Config API, Compile API, Refs and validation API, and Shard and peers API. Their anchors are now `#config-api`, `#compile-api`, `#refs-and-validation-api` and `#shard-and-peers-api`, and a link to one of the old `#api--` anchors should use the new one. The CLI README's link to the config API uses the new anchor.
- 4b846c4: The core README's API tables name more of the exports. Config adds `resolveDocsRoot`, `resolveUnderOutputDir`, `effectiveGuideOutputFile` and `resolveGuideLinkBase`, which the page says is the link base of only the assembly that writes that file. Compile adds the from-results and with-context functions, `buildGuideLinkIndex`, the shard cache, two link passes, `slugForSectionFile` and `stripExplicitAnchorMarkers`, and a Locale packs section lists the locale pack API. Validation lists the extension sets. The Compile order table on the refs and validation page is gone, since the Compile page lists the same exports.
- 4b846c4: The core README's Shard and peers API gives the `findPeerBinary` and `runPeer` contract, a `node_modules/.bin` binary found from `cwd` upward, then one on PATH, then `found: false` and a skip with an info line unless `require` is set, and links the peer linters design constraint as the policy. Config API no longer restates the shard glob rule. It links In-scope guide fileset in the CLI README and keeps what is specific to `shardLintPaths`. The codeEvidence, inlineInserts and stripAnchors specs open with a link to the developer guide's Spec-to-test map instead of a contributor test map, and the Compile hooks overview drops its sentence on docs-first specs with mapped tests. The developer guide's Spec-to-test map holds the mapping.
- 4b846c4: The core README's `compile.hooks` section keeps the `resolveCompileHooks` sentence and links Configuration in the compile hooks overview for the config keys, where it restated the forms `compile.hooks` takes, the `hooksConfig` key and `compile.stripAnchors`. The extension pattern links Explicit override in the Default compile hooks spec, which says the array form replaces the default pipeline. The `compileGuideResultsWithContext` row names `linkedFilesByGuide`, the fourth field of the context. The stray "Full spec" line after the `compile.title` paragraph is gone, since the backup paragraph already links Backup path layout. The codeEvidence section calls the rebase target the guide's link base, the term Publish-relative link rewriting defines. The inlineInserts section states the media-embed rule once, under layout. The refs validation section no longer restates the outputDir-relative path advice that Path layout in the CLI README owns.
- 4b846c4: The core README links each rule's owner instead of restating it. Config API and the compile hooks overview link Default compile hooks in the Features Guide for the forms `compile.hooks` takes. The overview's "Opt out per hook" and "Explicit override" subsections are gone, so links to `#opt-out-per-hook` or `#explicit-override` should point at that spec's Configuration section. The rule for the strip after stitching is stated once, under "stripAnchors purpose".

  The Config API summary gives the `ignoreGuides` exception in one clause that links the glossary entry, and the glossary entry, which each README stitches, links the two rules behind it. A link to a shard the compiling guide stitches can still take its in-document anchor. Same compiled output preference says when the cross-guide pass gives it one, and `ignoreGuides` interaction says when the intra-guide pass does, for a `./` or bare link. The CLI README now stitches the `ignoreGuides` glossary entry, which its consumer migration steps link. Config API links Source tags and default banner for the per-guide banner and source tag keys, and Config essentials for the base of each generated path. Compile API says what `knownSlugs` and `monolithKnownSlugs` hold and links the BROKEN LINK marker spec for the fragments that pass.

  The core README no longer links the monolith glossary entry, which led to a chain of doc-authoring terms, so it stitches three glossary entries where it stitched fifteen. Compile API defines the monolith in one sentence instead.

- 4b846c4: A sentence in the core README's heading slug contract drops a semicolon, and the first line of its codeEvidence config section drops an em-dash. The rules they state are unchanged.
- 4b846c4: The core README's Further reading links the CLI commands reference in place of a second link to the CLI package page.
- 4b846c4: The core README's Extension pattern section says where a custom hook runs. A process registers the hook before it calls `compileGuideResults` or `compileGuides`, and the Merlon Docs CLI doesn't load one. Compile skips a name in `compile.hooks` that has no registered hook, without a warning. It shows a `compile.hooks` array that keeps the built-in hooks next to a custom one, and lists the `CompileHookContext` fields a hook gets.
- 9bc05cd: Keep headings inside fenced code in a CRLF shard

  Heading demotion skips the lines inside fenced code blocks, so a `# comment` in a shell example keeps its level. It found the fences with a regex that ended in `(.*)$` without the `m` flag, and on a line that ends in a carriage return that regex never matched. In a shard with CRLF line endings, compile and `demoteHeadings` demoted each heading-like line inside a fence. On a crafted CRLF line the regex also gave the backtick run back one character at a time, so a line of 40,000 backticks took 2.4 s.

  Demotion now finds fences with the scan that the slug registry's heading reader uses. A heading inside a fence of a CRLF shard stays as written, and the 40,000 backticks take under 1 ms. Since the scan follows GFM, a few lines that the regex misread now read as GFM renders them:

  - A run of backticks or tildes shorter than the one that opened the fence, or one followed by an info string, no longer closes it.
  - A line of three or more backticks followed by another backtick, such as `` ``` `x` ``` ``, no longer opens a fence.
  - A fence that starts one to three spaces in now counts as a fence.

  `demoteExceptFirstH1` changes the same way. On text that ends with a newline, both functions still add a blank line at the end.

- e888a2a: Update runtime and development dependencies to the latest stable versions past the 7-day release-age gate (`cac` 7.0.1, `ignore` 7.0.12), publish the Agent Skill (`repo-readme` and `skills/merlon-docs/**`) as Part 1 on the documentation site ahead of the CLI guide (Part 2), and link `[Agent Skill]` in `why-merlon-docs-for-agents.md` directly to the Agent Skill spec and workflows.
- 9bc05cd: Write each `l` of a line fragment as `L`, and trim slashes and backticks in linear time

  `codeEvidence` keeps a line fragment that a link already has, such as `#L6-L8`. It wrote only the first `l` of that fragment in upper case, so `#l6-l8` compiled to `#L6-l8` instead of the `#L6-L8` form the hook writes for every other range. It now writes each `l` as `L`.

  `shardLintPaths` trimmed the slashes at the end of a `shardsGlobs` entry that starts with `../` with `/\/+$/`, and `codeEvidence` trimmed the backticks around a link label with ``/^`+|`+$/g``. When a run of slashes or backticks is followed by other text, each regex rescans the run from each of its characters. An entry with 80,000 slashes before a letter took 8.2 s, and so did a label with 80,000 backticks between two letters. Each trim is now a loop, and the same entry takes under 1 ms and the same label 6 ms in the hook. New cases in the ReDoS budget suite cover both.

- 4b846c4: Doc review corrections in sections that the READMEs stitch. The `orphan` entry in both READMEs links the new Orphan check scope section of the Manifest compile order spec, which says what the check reports and which files it doesn't read. The entry's second paragraph restated that scope and is gone.

  In the CLI README, the `refs registry` entry says that `merlon compile`, `merlon refs-gen` and `merlon check` rewrite `refs.json` from their own compile, and that only `merlon refs-check` fails on a stale file, as the new Stale registry check section of the Refs registry path spec says. It used to say that `merlon check` verifies the registry against the latest compile, which can't fail because `merlon check` writes the file first. The `refs` entry there drops "via `merlon check`" from its check refs row and links the registry entry from its own row.

  Both READMEs link the backup path layout in the Compile output backup spec instead of restating where `--backup` puts a prior output. The CLI README said prior output sits under `backups/`, but the backup of a publish output outside the docs root climbs out of that directory.

  The `locale pack` entry in both READMEs and the `authored GFM` entry in the core README now have lowercase titles, like the other common-noun glossary entries. Their anchors are unchanged.

- 4b846c4: The core README's `stripAnchors` section keeps the hook's own rules and links the fence scan, which moved to a Fence scan shard in the Features Guide's Compile pipeline group with its limits. The section's "stripAnchors limits" now names only what the scan's limits do to the strip. The heading slug notes under Refs and validation API link the Fence scan and Section slugs shards instead of the stripAnchors and cross-guide sections.
- 4b846c4: The guide tier glossary entry in both READMEs links only to Default guide layout in the Merlon Docs 1.0 spec, which now holds the placement test as well as the four tiers.
- 4b846c4: Cross-guide link rewriting, `docs/features/compile-pipeline/cross-guide-links.md` in the Features Guide's Compile pipeline group, now states how `compile.crossGuideLinks.ignoreGuides` and same compiled output preference interact. Compile behaves as before.

  A link to a shard that the compiling guide stitches takes the in-document anchor when the shard's owner in the guide link index is non-canonical, even when the compiling guide lists that owner in `ignoreGuides`. A non-canonical owner is only the first guide in `compileOrder` whose walk reached the shard. A `../` link to a shard whose canonical owner is listed keeps its shard path. A `./` or bare link to such a shard still takes the in-document anchor through the intra-guide pass when the compiling guide stitches the shard. The matching rules and the exclusions list read as if every link to a listed guide kept its shard path, and now link the precedence rule. The `ignoreGuides` summaries in the core README's Config API section, in the features overview and in the CLI README's consumer migration steps give the exception in one clause and link the glossary entry, which links both rules. The `compile.crossGuideLinks.ignoreGuides` section links both rules too. The type docs of `AssembleGuideOptions.ignoreGuides` and `CrossGuideLinkRewriteOptions.ignoreGuides` now name the same exceptions.

- 4b846c4: The core README's inlineInserts section names the check that catches a first reference in a table cell: MD056 in the compiled markdownlint pass, for the outputs that pass lints.
- 9bc05cd: `inlineInserts` now reads `hooksConfig.inlineInserts.searchRoots` for a guide whose `path` ends in a directory with a different name from its `name`, such as a guide named `architecture-review` with `path: review`. Assembly gave hooks the directory's name as the guide name, so the hook didn't find the guide's config and skipped its search roots. An insert link that only a search root could resolve stayed a plain link. Hooks now get the guide's configured name.
- 4b846c4: The stripAnchors section of the core README drops its illustrative marker, and the codeEvidence and inlineInserts sections mark only their example lines. The path check now covers their test and source citations.
- 4b846c4: Read inline links as CommonMark does in every link reader

  Link lint, broken-link marking, the link passes, `codeEvidence`, the manifest walk and the `inlineInserts` hook ran a link's label to its first `]`. In a linked image, `[![Diagram](./d.png)](./page.md)`, they read the image's src and missed the outer target. Compile left `./page.md` as written and link lint didn't check it, and the walk didn't follow it to a shard. They didn't read a label with brackets in it, such as `[the arr[0] notes](./notes.md)`, at all.

  These readers now read a label as CommonMark reads link text, so a label can contain an image or balanced brackets. Compile rewrites the outer target of a linked image, and link lint checks it. Broken-link marking marks a dead `#fragment` there with the label and target the shard wrote, and the walk follows the target to a shard. A bracket after a backslash is text, so `\[x](./x.md)` isn't a link, and the walk no longer follows it. Link lint checks no image's src, so it no longer reports a missing src in a linked image, as it never did for an image alone. `inlineInserts` no longer reads an image as an insert link. In `codeEvidence`, the walk and `inlineInserts`, a target now ends at the first `)` on its line, as in link lint and the link passes. So an unfinished link such as `[x](see` no longer takes in the link on the next line.

- 9bc05cd: Compile no longer lets a later link pass rewrite a link that the cross-guide or publish-relative pass already wrote.

  The cross-guide pass writes a link to an output in the same directory as the output's file name alone, such as `glossary.md#term`. When the linking guide stitched a shard with that file name, the intra-guide pass turned the link into a dead `#term`, and compile marked it as a broken link. Guides without `compile.outputFile` all write to the output directory, so a link between two of them met this whenever the linking guide stitched a shard named like the other's compiled guide. The link now keeps the target the cross-guide pass wrote.

  The publish-relative pass also looked up a cross-guide target from the shard's directory, though that target is relative to the link base. When the path led to some other file from there, the pass pointed the link at that file, so `../../README.md#t` became `../../docs/README.md#t` once `docs/README.md` existed. It now leaves a cross-guide target as written.

  A path that `compile.crossGuideLinks.ignoreGuides` keeps is still rebased relative to the link base. The intra-guide run on the stitched body read that rebased path from the guide directory, and turned it into `#slug` when the guide stitched the shard and the path led to it from there. Whether it did depended on where each document sat, so a guide in the monolith could link the section in its compiled guide and the shard file in the monolith. Both documents now link the shard file, also in a layout where both used to link the section. A `./` or bare link to a shard the guide stitches still becomes `#slug`, because the intra-guide pass rewrites it per shard and the publish-relative pass only matches `../`.

  A direct `assembleGuide` call that sets `publishOutputFile` now keeps each path the publish-relative pass rebases. Without `linkIndex`, a `../` link to a shard the guide stitches used to become `#slug` when the rebased path also led to the shard from the guide directory. It now stays a path relative to `publishOutputFile`.

  The exported `rewriteCrossGuideFileLinks` doesn't mark the targets it writes. A caller that runs `rewriteIntraGuideFileLinks` on its output still lets the intra-guide pass read a target such as `glossary.md#term` as a shard link and turn it into `#term`.

  Link passes, `docs/features/compile-pipeline/link-passes.md` in the Features Guide's Compile pipeline group, states the new rule.

- 9bc05cd: The link passes, `codeEvidence`, broken-link marking and link lint now read fenced code the same way. The link passes, broken-link marking and link lint used to skip only the lines between two lines that start with three backticks, outside a blockquote. So they changed or checked a link in a fence of tildes or in a quoted fence. They missed a fence that opens a list item too, and a fence of four backticks ended for them at a line of three. The closing line of a fence that opens a list item started a fence for them, and so did a line of backticks in a fence of tildes, which hid every line after it up to the next line of backticks. They and `codeEvidence` now find fenced code with the scan that heading demotion and the slug registry use, which reads fences of backticks or tildes and follows list items. They also run it on the text of each blockquote, up to ten blockquotes deep. The link passes, `codeEvidence` and broken-link marking leave a link in fenced code as the shard wrote it. Link lint doesn't report a link or a BROKEN LINK example there. `merlon review` already skipped a fence of backticks or tildes before it read links. Its `index-size` check no longer counts a link in a quoted fence or in a fence that opens a list item.

  The scan reads an indented code block as prose, as link rewriting did before. A line of three backticks doesn't open a fence when it's indented four spaces or more outside a list, or four columns or more past the text of its list item. So it no longer hides the lines after it. In an indented code block, or after such a line in a paragraph, the link passes and broken-link marking now change the links on those lines, and link lint reports them. Link lint also reports the links on the lines that those lines of backticks used to hide. So `merlon check` can fail on a broken link that it passed before.

  Direct callers see the same change. The exported `extractLinks`, `markBrokenLinks`, `lintLinks`, `lintCompiledLinks`, `lintShardLinks`, `collectShardProvenance`, `rewriteCrossGuideFileLinks` and `rewriteIntraGuideFileLinks` skip the same fenced code, and so do the `links` and `provenance` that `loadShardSnapshot` returns.

  `codeEvidence` read its link pattern over the whole shard body, so it rewrote link syntax to a repository file in any fence and in a code span. It now skips fenced code and code spans, as the link passes and link lint do. A code span that shows link syntax keeps it as written, and a table with such a cell keeps its alignment. A link outside code still rewrites when its label wraps onto the next line. A label with a `]` in a code span now matches, as it does for the link passes.

  `inlineInserts` doesn't change. It still reads an insert link in fenced code or in a code span, so it can inline an insert in a code example.

  The core README's codeEvidence example now shows its shard input as written. Compile used to add `#L6-L8` to the link in that fenced example. Link passes, `docs/features/compile-pipeline/link-passes.md` in the Features Guide's Compile pipeline group, says the passes leave a link in fenced code or a code span as written, and so does the core README's codeEvidence section. Fence scan there states the fence reading. Cross-guide link rewriting and Publish-relative link rewriting in that group list link syntax in fenced code or a code span among their exclusions. Tables after link rewriting there says that the link passes leave the links of a table in fenced code as written, and that an insert link in fenced code or in a code span can still put the table out of line. The core README's inlineInserts section says the hook reads fenced code and code spans.

- 4b846c4: Read inline links in linear time in link lint and the link passes

  Link lint, broken-link marking and the cross-guide, intra-guide and publish-relative link passes read each line's links with regexes, and `codeEvidence` read each run of lines between fenced code with one. Each regex matched `[label](target)` with negated character classes, so on a crafted line it read the rest of the line again from each `[`. Compiling a shard whose one line is `[a](b` repeated 8,000 times, then one `)`, took about 730 ms, and the same line with 100,000 copies took about 2 minutes.

  These readers now find links with a linear scanner in `compile/link-scan.ts`. Those shards now compile in under 20 ms and under 250 ms. New cases in the ReDoS budget suite cover each reader.

- 9bc05cd: Parse path claims without backtracking regexes

  The prose path probe trimmed `./`, trailing slashes and `#fragment` with
  regexes anchored at the end of the string. Those backtrack on a span holding a
  long run of slashes followed by a non-slash — measured 156 ms at 20,000 slashes,
  5.2 s at 120,000 — and a backtick span is documentation text, so the input is
  not ours to trust. CodeQL flagged the pattern as `js/polynomial-redos`.

  Trimming is now index arithmetic, which is linear whatever the input, with the
  timing covered in the existing ReDoS budget suite.

- 9bc05cd: Compile now rebases a link target made only of `../` segments. A bare `../` used to stay as written, so in the compiled guide it pointed away from the directory the shard meant. A target such as `../../` that resolves to the directory containing the guide's output compiled to an empty href, and `../../#top` lost its path and became the same-document link `#top`. These targets now compile to the directory path, or to `./` when that directory contains the output. Any other target that resolves to the output's own directory, such as `../../pkg/` in a guide that compiles to `pkg/README.md`, also compiles to `./` now.
- 9bc05cd: The publish-relative pass now rebases a shard's own link to an output of the run, such as `../../README.md` or `../../DEVELOPERS.md#setup`, like a link to any other file. It counts each compiled guide as existing before compile writes it, and the monolith too when a guide is stitched into it. A first compile then rebases the link as later ones do. When every guide sets `compile.outputFile`, the run never writes the configured monolith. The pass then treats a path to the monolith as missing, even when an earlier run left the file on disk. Such a link used to keep its shard-relative path on a fresh tree and be rebased once the file was there.

  The pass used to skip a target whenever an entry in the guide link index named it as its output file. An entry's output file is its owner's publish output, or the monolith for a monolith guide. In a config without a monolith, it is the owner's compiled guide. A shard's link to one of them kept its shard-relative path and broke in a compiled guide at another depth than the shard. The skip was meant for links the cross-guide pass writes. The pass now tells those links apart from the shard's own and leaves only them alone.

  Publish-relative link rewriting, `docs/features/compile-pipeline/publish-relative-links.md` in the Features Guide's Compile pipeline group, says the pass rebases a link to an output, and Path lookup order there says when the monolith counts as missing. The core README's Config API section and the features overview give a path that leads to no file as their example of a link the pass leaves as written.

- 4b846c4: The core README's quick example opens with what it does and writes the compiled outputs with `writeCompiledGuidesFromResults`. It loads the config with `process.cwd()` as `configBase`, as the Config API says. It shows `checkRefsRegistry` as the CI alternative to regenerating the registry, and links the Compile and Config API pages.
- 9bc05cd: README corrections from a doc review: the CLI README documents the `--backup` options, `refs-list --format`, the `lint.codeExtensions`, `lint.dataExtensions` and `lint.paths.*` config keys, and the registered `refs-gen`/`refs-check`/`refs-list` names. Code examples that showed empty code where a heading id was stripped now render. The core README lists `computeCoverage` and `probeDocumentPaths`.
- 9bc05cd: Compile re-aligns a GFM table whose links it rewrote. Compile can rewrite a link target to a path or anchor of another length, and a broken link becomes a longer marker. Either change moved the pipes of an aligned table from a shard, and markdownlint's MD060 rule failed on the table in the compiled guide. The last step of each assembly now prints such a table as Prettier does with its default `proseWrap` setting. It measures a wide or fullwidth East Asian character, or an emoji shown as an emoji, as two columns, and a nonspacing mark or a format character as none. A text-style emoji such as ☝ counts one column, as markdownlint counts it.

  Compile re-aligns a table whose cells without a link still match the width of their column's delimiter cell, and that pads some cell with more than one space. A compact or tight table stays as written, and so does a table in more than ten nested blockquotes. Compile doesn't re-align a table in fenced code, though it can still change a link there. A table in a list item or a blockquote keeps its indentation and its quote markers. In a tight list, the table ends at the next list item, and a table that opens its list item keeps the marker on its header row. Prettier and markdownlint measure some text differently, such as Hindi or pointed Hebrew. When a cell without a link contains such text, MD060 flags the table in the shard and in the compiled guide.

- 4b846c4: Number section links with every heading in the compiled guide

  A link to a shard compiles to the anchor of the heading that opens the shard's section. Compile used to number only those opening headings, and it skipped sub-headings and the guide's H1. When an earlier heading had the same title, the link pointed at that earlier heading, and `merlon check` passed. One slugger now numbers every ATX heading at column 0 in stitch order, starting with `compile.title` or the manifest's H1. The link gets the heading's numbered anchor, such as `-1`. The guide link index takes each slug from the numbering of the shard's owner, so a link that goes to the owner's compiled guide matches the anchor there. A `FIND-*` shard or a first heading with `{#id}` keeps its declared id, and later headings with the same title count its heading. When `compile.stripAnchors` is `false` and the `stripAnchors` hook doesn't run, the compiled headings keep their `{#id}` markers, and each heading is numbered by the title it renders, marker included.

  A line inside a fenced code block is no longer a heading anywhere Merlon Docs numbers headings: section slugs, `buildSlugRegistry` and the same-shard `#fragment` check all skip it. A `# comment` in a shell example no longer takes a slug or shifts a later anchor, and `refs.json` no longer files the headings after it under a guide named after the comment.

  Compiled anchors change only where an earlier heading or a fenced line took a section heading's slug first. A cross-guide link also changes when the index took its slug from a guide whose transitive walk includes the shard. It now takes the slug from the shard's owner.

- 4b846c4: The core README states what `shardLintPaths` returns, for the default globs and for `shardsGlobs` entries, and leaves the reasons for each form to the code.
- 4b846c4: The core README's heading slug contract links `github-slugger` on npm and no longer links a third-party repository.
- 9bc05cd: The README's standalone guide glossary entry says that the Standalone guide behavior section covers which checks read a standalone guide, as well as how compile treats it. That section now says that `merlon prose` and `merlon check` run Vale over standalone guides.
- 9bc05cd: Strip `{#id}` markers from a long line in linear time

  `stripExplicitAnchorMarkers`, which backs the `stripAnchors` hook and the post-stitch strip, trims the whitespace before each marker it removes. `stripPandocAnchors` with `trimPrecedingWhitespace` did that by reading the end of the output it had built so far, and V8 copied that whole output on each read. A line with many markers took time that grew with the square of its length. A line of 40,000 `a{#x}` markers took 135 ms to strip, and one of 160,000 took 6.7 s.

  The helper now keeps its output as ranges of the input and trims the last range. Its time grows linearly with the line, and the same two lines take 8 ms and 30 ms. A new case in the ReDoS budget suite covers a line of many markers between words. The output is the same.

- 9bc05cd: Keep `{#id}` examples inside code when compile strips anchor markers

  `stripExplicitAnchorMarkers`, which backs the `stripAnchors` hook and the post-stitch strip, removed every `{#id}` marker in the document. When a guide quoted the syntax in an inline code span, the span compiled to an empty pair of backticks, and a fenced example lost its ids too. The strip now keeps a marker inside an inline code span or a fenced code block.

  Heading lines keep the old rule. A line that parses as an ATX heading at column 0 loses every marker, even inside a fence or a code span. Merlon Docs computes heading slugs from titles with every marker removed. Stripping the whole line keeps the compiled heading on the slug that refs and rewritten links use, however a fence is read. To show the syntax on a heading inside a fenced example, start the heading line one to three spaces in. Merlon Docs doesn't read that line as a heading, so it keeps its marker.

  Fences are found line by line. A fence counts when it starts at most three columns in, measured from the text of the innermost list item around it, or right after a list marker, and the scan doesn't read blockquotes or HTML. It misses a fence behind `>`. A marker in such a fence still goes unless a code span on its line holds it. Code spans are paired within each line, so a span that wraps onto the line, or a backslash-escaped backtick before it, can shift the pairing. A shifted pairing can drop a quoted marker or keep a prose one.

  The strip itself works line by line too. It trims whitespace only on the marker's own line, so a marker that opens a paragraph leaves the blank line above it in place. When a marker opens a line's text, the whitespace after it goes instead, and the line keeps its indent. The strip still drops a line that contains only a marker. With the markers on separate lines, the time grows linearly with the document.

  `merlon compile` output changes the same way. The CLI and core READMEs quote the syntax again, and the core README gives `stripAnchors` its own section, which states the heading-line and code rules. Fence scan, `docs/features/compile-pipeline/fence-scan.md` in the Features Guide's Compile pipeline group, states the fence reading and its limits.

- 4b846c4: Tables after link rewriting is a shard of its own, `docs/features/compile-pipeline/tables-after-link-rewriting.md` in the Features Guide's Compile pipeline group, where it was a subsection of the core README's compile hooks overview. The core README links it.

## 1.0.0-draft.0

### Major Changes

- 5ab62e8: This is the 1.0 draft of Merlon Docs. The CLI, the core library, the presets and the Agent Skills publish as `1.0.0-draft.N` prereleases under the npm `draft` tag. Install the newest draft with `npm install @merlon-docs/merlon-docs-cli@draft`. The interfaces can still change between drafts. 1.0.0 is the first release with a stability guarantee, and from 1.0.0 on a breaking change needs a major version.

### Minor Changes

- 9bc05cd: Lint each compiled output against its own slugs, and lint the monolith as a document

  `lintLinks` accepted a compiled `#fragment` when it matched a heading of the
  output or the slug of any shard in the guide link index. So a guide could link
  `#topic` to a heading that only another guide's compiled guide has, and
  `merlon check` passed. The monolith was never linted as a document, apart from
  its BROKEN LINK markers. Issue lines also left out the banner, so a diagnostic
  named a line two lines above the link in the written file.

  Each `CompileGuideResult` now has `knownSlugs`, the slugs broken-link marking
  accepted besides the headings of `text`: the slug of each section `text`
  stitches, such as a `FIND-*` finding id or a declared `{#id}`. A guide in the
  monolith also has `monolithKnownSlugs` for `monolithText`, the section slugs of
  every copy there. Link lint checks a fragment in an output against that
  output's headings and known slugs, so compile and check agree. A fragment on a
  link to another output still has to match a heading there, so a link to a
  shard that the output doesn't stitch fails, even when the shard is in the
  directory of the output's guide. It passes only when another heading there has
  the same slug, and it then points at that heading.

  Broken-link marking now accepts only the slugs of sections the document
  stitches. It used to accept the slug of each shard that the guide link index
  gives the guide, such as a shard in the guide's directory. So a link to such a
  shard that the guide doesn't stitch passed compile and check and pointed at no
  heading. Compile now marks it. In the monolith, a link to a shard that no
  guide there stitches is marked too, unless another heading or section there has
  the slug the link takes. Such a link then points at that heading, or at no
  heading when only a section's declared `{#id}` has the slug, and compile and
  link lint pass it in the monolith. Each copy in the monolith accepts the section
  slugs of every copy, whichever guide is the shard's owner.

  Link lint reads each output as compile writes it, banner included, through the
  new `compiledOutputDocuments` export. It lints the monolith as a document of
  its own and leaves out an issue that the guide's compiled guide already
  reports for the same link. It matches a link issue or a BROKEN LINK marker at
  the same line of the guide's text first. It reports a monolith issue under the
  guide whose copy holds its line, as it does for a compiled guide. Called without
  `compileOptions`, `lintLinks` now counts the banner from config in its line
  numbers and lints the monolith too. The `knownSlugs` option of `assembleGuide`
  is now marked deprecated. Assembly already ignored it.

  `merlon compile` and `merlon check` report these issues. A diagnostic now gives the
  line of the written file, banner included, and a monolith issue gives the guide
  whose copy holds its line.

  Compile now adds a newline to a `banner` that lacks one. The banner's last line
  used to share a line with the guide's title, which then had no anchor in the
  written file. A later heading with the same title lost its number too. A link
  to either heading named a slug that the written file didn't have.

  A check that passed before can fail when a guide links a `#fragment` that only
  another output has. Link it through its shard file instead, so compile
  rewrites the link to that output. That doesn't clear a link to a `FIND-*`
  shard or to a heading with a `{#id}` marker, since no heading in the other
  output has the id that the rewritten link gives.

- 9bc05cd: Match compiled `.md` links to compile outputs by path, not file name

  `merlon check` skipped a compiled `.md` link whenever its file name matched any
  output of the run. With the root `README.md` as an output, a link to a package
  `README.md` passed even when that file was gone or its `#fragment` named no
  heading. Publish-only output had a similar fallback that took an allowed publish
  path with the same file name as the target.

  A link now points at another output only when its resolved path is that
  output's path. Its `#fragment` is checked against the headings in that output's
  compiled text, before or after the output is written, from publish-only output
  as well. Any other `.md` target has to exist, and its fragment has to match one
  of its headings. The monolith counts as an output only when at least one guide
  is stitched into it, so a link to a monolith that is never written reports
  `missing publish path`, even when an earlier run left the file on disk.

  A check that passed before can now fail. A link to a sibling package README
  with a stale fragment is the likely case. Some failures are in links that
  compile writes itself, so editing shards won't clear them. A cross-output link
  to a `FIND-*` shard or to a heading with a `{#id}` marker is one. Compile
  rewrites it to `other.md#find-004` or `other.md#id`, but the heading in that
  output gets a slug from its text, such as `find-004--example-finding`.

  The `knownOutputBasenames` option is deprecated and ignored.
  `lintCompiledLinks` and `validateCompiledLinkTarget` take `knownOutputPaths`,
  the absolute paths of the run's outputs, instead. They also take
  `unwrittenOutputPaths` for configured outputs that the run doesn't write.

- 9bc05cd: Make the file extension lists broad, split and configurable

  The set of extensions that mark a link target or path claim as naming a file was
  a fixed regex covering about 30 mostly web-stack extensions. It is now two
  default lists. **Code** extensions span JVM, .NET, systems, scripting, template,
  schema and infrastructure formats: a symbol can cite a line in one of these.
  **Data** extensions cover configuration, tabular and serialized formats, which
  are validated for existence exactly like code but never cited by line, because
  an identifier found in inert content is an occurrence rather than a declaration.

  `lint.codeExtensions` and `lint.dataExtensions` extend the defaults for a project
  on a stack they do not list. Moving an extension into the code list is also how a
  repository asks for lines to be cited in a format that ships as data, its
  workflow YAML for instance. Entries are accepted with or without a leading dot,
  and matching is a set lookup rather than a generated pattern, so a configured
  value cannot change how matching behaves.

  Both lists together govern link validation and path resolution in prose, which
  additionally always accepts `.md` and `.mdx`. The `codeEvidence` compile hook
  rewrites links for either list and cites lines only from the code one.

  Broadening the defaults exposed a compile bug: `codeEvidence` rebased a file
  link relative to the output file only when it also added an `#L` line fragment,
  so a link to a data file stayed shard-relative and broke in output published
  from another directory. It now rebases whenever the target resolves.

- 9bc05cd: `resolveGuideDir` and `guideScanDirs` return absolute paths when `docsRoot` is relative. With a relative `--docs-root` such as `docs`, a guide with no `guides[].path` used to reach markdownlint as `docs/<guide>` when `lint.markdownlint.shardsGlobs` is unset. markdownlint-cli2 runs from the docs root, where `docs/<guide>` doesn't exist, so `merlon lint` and `merlon check` linted none of those guides' shards and passed. Those shards are linted now, so expect new markdownlint findings from them.

  Without `shardsGlobs`, `shardLintPaths` returns a glob for the `.md` and `.markdown` files in each guide directory, such as `<guide>/**/*.{md,markdown}`. It used to return the bare directory, which markdownlint-cli2 expands to every file in it, so an image or text file beside the shards was linted as Markdown. API callers that read the result as a list of directories should call `guideScanDirs` instead.

  `shardLintPaths` returns paths for markdownlint-cli2 running with the docs root as its cwd, as `merlon lint` and `merlon check` run it. API callers must run markdownlint-cli2 from the docs root with them. From any other cwd, markdownlint-cli2 resolves the relative paths against that directory, so it misses the guide shards and lints the wrong files or none. A guide under the docs root gets a glob relative to the docs root, which keeps the checkout path out of it. An absolute `--docs-root` used to put the checkout path into each guide directory, and each `shardsGlobs` entry was resolved to an absolute path, so under a directory whose name has glob characters, such as `repo (copy)` or `proj {a,b}`, the shard pass linted 0 files and passed.

  A guide outside the docs root, such as one at `guides[].path: "../pkg/guide"`, gets an absolute glob, so the shard preset's `!**/index.md` still reaches it next to in-root guides, and a symlinked docs root still finds it. Glob characters and quotes in each path that goes into a glob are escaped.

  `shardsGlobs` entries go to markdownlint-cli2 as written, and it resolves them against its cwd, the docs root. A negated entry such as `!legacy/**` excludes files now, where it used to become `<docsRoot>/!legacy/**` and exclude nothing. An entry that starts with `../` gets the escaped absolute directory those segments name in their place, followed by `/**` for a directory. The shard preset's exclusions then apply to it too. A negated `../` entry also gets `**` in front of that path, which lets it exclude files. A `.` entry becomes `**`, so markdownlint-cli2 still lints every file under the docs root.

  The same relative paths kept `merlon check` from reporting an orphan shard at the top of a guide when the manifest linked a nested shard with the same file name, such as `sub/a.md` next to an unlisted `a.md`. That orphan is reported now, and `checkOrphansForGuides` resolves a relative `dir` against the process cwd. A shard that a guide reaches in a sibling directory whose name starts with the guide's name, such as `guide-shared/x.md` from `guide`, no longer counts as listed in a `guide-shared` guide, so an orphan there is reported as it is for a sibling with any other name. The shard counts under its file name in `guide` instead, as a shard in a sibling with any other name does, so an unlisted `x.md` at the top of `guide` passes.

  The compiled markdownlint preset lists `_build/guides.md` as well as `guides.md`, so it lints a monolith named `guides.md` under the default `outputDir`. It used to list only `guides.md`, which matches only with `outputDir: "."`, so under the default layout the compiled pass linted 0 files and passed. Expect new findings from the compiled pass under that layout, from the rules both presets leave on, such as `MD022`, and from `MD052` and `MD053`, which check reference links and their definitions. A `guides.md` left at the docs root by an earlier `outputDir: "."` layout is linted too, so delete it. With no monolith, or a monolith with another name or path, copy the preset and point its `globs` at your compiled outputs.

  The compiled preset now keeps every rule setting of the shard preset, so a rule the shard pass turns off, such as `MD024` or `MD033`, no longer fails the compiled pass. With `outputDir: "."`, the compiled pass reports fewer findings than before, except from `MD003`, which now requires ATX headings as the shard preset does, so a monolith with setext or closed ATX headings fails it.

  The shard preset excludes `_build/**` as well as `guides.md`. A guide at `guides[].path: "."` gets `**/*.{md,markdown}`, and a `.` entry in `shardsGlobs` becomes `**`, so the shard pass also linted the compiled outputs under the default `outputDir`. An absolute `--docs-root` did that before. A relative one linted 0 files, so it shows up there only now. Any other compiled output, such as one under another `outputDir`, needs its own exclusion in a copy of the preset.

  The CLI README's in-scope guide fileset section says how both markdownlint passes resolve their paths.

- 9bc05cd: Add `merlon review`, a report-only command that flags documentation sprawl across guide shards: index groups with too many shard links (`index-size`), shards with too many prose words (`long-shard`), paragraphs repeated in two or more shards (`duplicate-paragraph`), and shards in one guide that share a title (`similar-titles`). Each finding names the files and a fix (with `fix:` printed once per signal group header in text output). Use `--json` for machine-readable output, `--strict` to exit 1 when there are findings, and `--guide <name>` to review one guide (duplicates shared with other guides included). Tune thresholds with the new optional `review` config object (`maxIndexEntries`, `maxShardWords`, `minDuplicateWords`); paths in `scan.ignore` are skipped. Core exports `reviewDocs` and `formatReviewReport`.
- 9bc05cd: Assemble a guide in the monolith once for its compiled guide and once for the monolith

  A guide without `compile.outputFile` is written to its own compiled guide and,
  when the config sets top-level `outputFile`, into the monolith too. Compile
  assembled it once, against the monolith, and wrote that text to both files.
  Its compiled guide then had paths and source tags relative to the monolith,
  so they broke whenever the monolith was in another directory. A link
  between two guides in the monolith compiled to a `#slug` that the linking
  guide's compiled guide doesn't have, so compile replaced it with a BROKEN LINK
  marker in both files and exited 1. In the monolith itself, a section link could
  point at an earlier guide's heading with the same title, and `merlon check`
  passed.

  Compile now assembles such a guide twice. Its compiled guide rebases paths and
  source tags relative to itself, and it links another guide in the monolith
  through that guide's compiled guide, such as `b.md#topic`, when that guide
  stitches the target shard. Otherwise it links the monolith. Its copy in the
  monolith rebases relative to the monolith and links the monolith's own
  headings. One slugger numbers every guide in the monolith, in `compileOrder`,
  so a section link there takes `#setup-1` when an earlier guide also has a Setup
  heading. A publish output that links a guide in the monolith takes the
  monolith's slug. An explicit `#fragment` is never renumbered, so a hand-written
  `#setup` can still point at an earlier guide's heading in the monolith.

  Compile marks broken links in a guide's copy in the monolith after every copy is
  assembled, against the headings of the whole monolith. So a link such as
  `../a/setup.md#details` to a sub-heading of another guide stays a link there.
  `lintLinks` reports a BROKEN LINK marker that appears only in the monolith. It
  matches each marker in a guide's copy in the monolith to the same marker in
  that guide's compiled guide, so a marker in both files is reported once, even
  when the rest of its line differs. A stale `#fragment` on a link to another
  guide in the monolith is reported once for each file: as a dead anchor in the
  linking guide's compiled guide and as a marker in the monolith.
  `LocaleBrokenLinkCopy` gains the optional `findMarkers` method, which returns
  each marker on a line, and `createLocalePack` provides it.

  `markBrokenLinks` now replaces each broken link where it stands, and its marker
  gives the target that link was written with. It used to pair a broken link
  with the first unused shard link of the same label among the broken ones, and
  to replace the first text that matched the link, which could be in an earlier
  code span. So a marker could name another link's target, or replace the text in
  the code span and leave the broken link as it was. It now pairs the k-th link
  with a label with the k-th provenance entry with that label. A link then gets
  the same marker in a compiled guide and in the monolith. `extractLinks` gives
  each link's `offset` in the markdown.

  `CompileGuideResult.text` is now each guide's own compiled guide. For a guide
  in the monolith it used to hold the monolith copy, so code that read it as the
  monolith copy should read the new optional `monolithText` instead.
  `compileGuidesFromResults` and `compileGuides` stitch the monolith from
  `monolithText`. `GuideLinkEntry` gains the optional `guideFile` and
  `monolithSlug` fields. Both are set only for a shard whose owner is in the
  monolith: `guideFile` only when the owner stitches the shard, and
  `monolithSlug` only when some copy in the monolith stitches it.
  `assembleGuide` and `rewriteCrossGuideFileLinks` take a `monolithFile` option.

  `merlon compile` and `merlon check` change with it. A link between two guides in the
  monolith no longer fails them, and a link that compile marks only in the
  monolith now does.

  Compile output changes for configs with a monolith. It can also change in a
  config without one, for a broken link that shares its label with an earlier
  link or whose text also appears in an earlier code span. A guide in the
  monolith takes about twice as long to assemble. Its compile hooks, a
  registered custom hook included, run twice for each shard, with fresh
  `hookState` for each assembly.

- 9bc05cd: Add opt-in path resolution for backtick paths in prose

  `merlon check` can now resolve backtick-quoted repository paths in shards and
  standalone guides, and fail on the ones that resolve nowhere. This catches a
  document describing code, files or a component that no longer exists — prose a
  link check never reads.

  Off by default (`lint.paths.severity: "off"`). Turning it on for a corpus
  written without it produces findings that are correct as written, so a
  repository enables it deliberately, cleans up once, and keeps it on.

  A claim needs a directory segment and a name, so a bare `index.md`, a single
  `src/`, a command line, a glob, a flag and a code identifier are not claims.
  Claims resolve against the file's own directory, the scan root, the docs root,
  each guide `scopeRoot`, and `lint.paths.searchRoots`.

  Two config lists declare why a path legitimately does not resolve, and they say
  which case they are rather than sharing one allow-list. `lint.paths.generated`
  covers paths that exist only after a build or install, matched as a prefix since
  nothing under one exists yet. `lint.paths.vocabulary` covers a name the
  repository documents without having, such as a tier the standard defines and a consumer creates,
  matched exactly so an invented file beneath that name still has to resolve.

  Because no pattern separates a stale path from an always-illustrative one, the
  discriminator is authorial: `<!-- merlon-paths: illustrative -->` exempts the file
  when it stands alone on a line, or one line when it trails content.

- 9bc05cd: List every compiled output in the refs registry, each slugged on its own

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

- 9bc05cd: Remove the unused llms-index helpers `parseLlmsIndexFilename`, `isLlmsIndexDraftFilename`, `expandProtocolVersion`, `abbreviateProtocolVersion` and `protocolVersionToReleaseRef`, which were left over from the removed `merlon export`, and drop `export.llm` from `merlon.config.schema.json`. Breaking for importers of those names.
- 58452d2: MDCP (MarkDown Context Protocol) is now Merlon Docs. The packages publish as `@merlon-docs/merlon-docs-cli`, `@merlon-docs/merlon-docs-core` and `@merlon-docs/merlon-docs-presets`, and the CLI command is `merlon`. The Agent Skill installs as `merlon-docs` with `npx skills add Merlon-Docs/merlon --skill merlon-docs`.

  The config file is `merlon.config.json`. Until 2.0.0, a CLI run that finds `mdcp.config.json` and no `merlon.config.json` upgrades the project itself. It writes the config to `merlon.config.json` with `protocolVersion` renamed to `standardVersion` and set to `1.0.0-draft.0`, deletes `mdcp.config.json` and prints a notice. The illustrative-paths marker is `<!-- merlon-paths: illustrative -->`, and the former `mdcp-paths` spelling still works until 2.0.0.

  The Vale style is `MerlonDocs`, so a rule reads `MerlonDocs.DatedClaim`. Compiled outputs carry `<!-- merlon-shard: … -->` markers. In the core API the config types are `MerlonConfig`, `MerlonConfigInput` and `MerlonConfigSchema`, and the `Mdcp*` names stay as deprecated aliases until 2.0.0.

  To migrate a project, install the new packages, run any `merlon` command once to upgrade the config file, and change `MDCP` to `MerlonDocs` in `.vale.ini`, in `<!-- vale MDCP.… -->` comments and in the `StylesPath` link to the presets.

- 9bc05cd: Validate source-file and directory link targets and link-lint standalone guides

  `merlon check` now fails on a link whose target names a source file or directory (`path/`) that does not
  resolve, in shard sources and in compiled output. Previously any target not
  ending in `.md` was skipped, so a link to a deleted module or directory passed the gate
  indefinitely.

  Files registered under `standaloneGuides` are now link-linted with the same
  checks a shard gets. They are never compiled, so no phase read their links
  before; the docs already claimed they were validated.

  Targets that name no resolvable file or directory class — a bare word —
  stay unvalidated, and external `http://`, `https://` and `//` URLs are skipped without network requests.

- 01b6d2b: The config key for the version of the Merlon Docs standard is now `standardVersion`, defaulting to `1.0.0-draft.0` with the 1.0 draft line (replacing the former `0.5.0.0` label and `protocolVersion` name). A config that still sets `protocolVersion` keeps working until 2.0.0: when `standardVersion` is absent, `loadConfig` and the new `parseConfig` migrate it to `1.0.0-draft.0` on `standardVersion`, and they fail when the two keys hold different values. A parsed config still has `protocolVersion`, set to the same value. The JSON schema marks `protocolVersion` as deprecated.

  The copyright line in each license now reads Merlon Docs. Code comments, the JSON schema and the docs now call the specification "the standard". The presets README now refers to the `MerlonDocs` Vale style, which the rename had missed.

### Patch Changes

- c71caad: Update runtime and development dependencies to the latest stable versions past the 7-day release-age gate (`cac` 7.0.1, `ignore` 7.0.12), publish the Agent Skill (`repo-readme` and `skills/merlon-docs/**`) as Part 1 on the documentation site ahead of the CLI guide (Part 2), and link `[Agent Skill]` in `why-merlon-docs-for-agents.md` directly to the Agent Skill spec and workflows.
- d4d05ac: The core README's section on the shard and peer tool exports comes from `docs/client-core/api-shard-and-peers.md`, the shard's new name. Its shard markers name that path.
- 9bc05cd: Find broken-link markers in linear time

  Link validation looks for a BROKEN LINK marker on each line of compiled output with `lineHasMarker`, and monolith link lint lists the markers on a line with `findMarkers`. Both ran a regex built from the locale's `markerTemplate`, with a lazy `.*?` for each variable but `markerLabel`. On a crafted line that regex tries every choice of where each variable ends, so with the four variables of the en-US template its time grew with about the fourth power of the line's length. A line of 733 characters took 115 ms, and one of 2,878 took 28 s.

  A scanner now finds the template's literal parts in order, with no line terminator between two of them, and returns the markers that the regex returned. Its time grows linearly with the line, and the 2,878-character line takes under 1 ms. The link pass of compiled link lint also asked about a line once for each link on it, so a line of 16,000 links with a marker at the end took 257 ms. That pass now asks once per line, and the line takes 12 ms. New cases in the ReDoS budget suite cover crafted marker lines and a marker line with many links.

- 3ef9c5e: The CLI README's Config essentials section keeps `--config` vs `--docs-root`, Minimal config and Path layout. Its reference material, Feature settings, Config key map, Review thresholds, Schema-only fields and Full schema and sample config, now sits in a Config reference section after Commands reference, and Shared glossary is its own section after Config essentials. The moved headings keep their anchors in the compiled README, and links into it still resolve. In the Merlon Docs repository, the shards are `docs/client-cli/config-reference.md` and `docs/client-cli/shared-glossary.md`.

  The core README's Compile API links Feature settings in Config reference.

- 1f7c2d8: The CLI README's Cross-links and refs says a standalone guide's headings are in the refs registry only when a guide stitches the file through its manifest or a `compile.scopeRoot` walk, and links Standalone guide behavior as the owner, where it said compile never writes those headings. Config essentials states the `--config` vs `--docs-root` rule once, and Global options in Commands reference and the Quick start link it instead of restating it. Each package README's Stability section opens with one sentence that says what can change before 1.0.0 and links the pre-1.0 policy. The CLI README's section also keeps the advice to read the changelog and release notes before upgrading, and the core README links it.
- 7cb8fd6: CLI README fixes from a doc review. Quick start begins with the minimal config. Once markdownlint-cli2 and the presets are installed, it shows the config again with the `lint` key that lints shards with the presets' shard config, and Config essentials' Minimal config keeps the field table and links that block. It says to fail CI on `git diff --exit-code` after `merlon compile` when a repository commits compiled outputs, because `merlon check` writes every output again and passes on a stale one. Its check commands pass `--skip-vale` until Vale is set up, because `merlon check` runs Vale whenever it finds `vale`, and Vale fails when the `.vale.ini` that `vale.config` names is missing. The verification checklist now ends Install and quick start. Requirements says the CLI needs Node.js 20.19.0 or later. Consumer migration documents the top-level `source` and each guide's `source`, which `merlon shard` needs, under `#map-the-document-to-guides`. It says to set `demoteFirstH1` on every `merge` part after the first, because a later part that keeps its H1 loses that heading and the text before its first `##` heading. It says `merlon shard` starts a new shard at each `##` heading whatever a guide's `splitLevel` says, and writes each guide to the directory named after the guide, ignoring `guides[].path`. A `directory` source's `path` must be outside the guide's own directory, because `merlon shard` deletes that directory first. Compile ignores the `compile-order.txt` file from `merlon shard`. It also documents a source's optional `preamble.promoteToH2`, which `merlon shard` reads from the first guide only.

  Config essentials states one rule for `compile.outputFile`, top-level `outputFile` and `refs.registryFile`. Each one resolves from `outputDir`, unless it is absolute or already lands inside `outputDir` when read from the docs root. A relative backup directory has no such exception. It also says that `--docs-root` defaults to the directory the command runs in, and its new Config key map section lists the page that documents each config key, with the core Compile hooks index beside Default compile hooks for `compile.hooks`. `protocolVersion` is listed as a schema-only field, and a new last section, Full schema and sample config, links the JSON Schema file and the sample guides' config. The table of peer tools in Optional linters gains an `merlon check` row. The page says Merlon Docs looks for `vale` in `node_modules/.bin` before `PATH`, names `lint.markdownlint.shardsConfig` and `lint.markdownlint.compiledConfig` and says their paths are read from the docs root. It says the shard pass takes its scope from the CLI and the compiled pass from the compiled config's `globs`, and that a relative `lint.links.target` is read from the docs root. It says `merlon fix` needs a markdownlint-cli2 config that lists `globs` and always exits 0. Project layout says `shards.md` is a manifest only when `compile.manifest` names it. Why Merlon Docs for coding agents moved into Get started, and the stitched glossary terms follow a Terms in this guide heading that links each one.

  These CLI README anchors are gone. Use `#repo-root-npm-scripts` in place of `#agent-integration`, and `#config-key-map` in place of `#compile-hooks-and-multi-guide-links`. `#end-user-value`, `#registry-location` and `#workflow` merged into the Compile and the refs registry section and Cross-links and refs.

  The core README links the pre-1.0 policy from Stability, and links the CLI README's Path layout where it describes how compiled outputs and the refs registry resolve. It says backup paths don't use `resolveUnderOutputDir`. Shard and peers links Consumer migration for where `merlon shard` splits a guide, where it said the split falls at `splitLevel`.

- 9bc05cd: README cleanup. The CLI README explains in one section, "Not the Agent Skill", how the CLI, the core library and the Agent Skill differ. The "LLM collaboration" and "Agent Skill (related)" sections that repeated it are gone. The core README folds its Overview section into About.

  Deep links to the CLI README's `#llm-collaboration` and `#agent-skill-related` anchors no longer resolve, so point them at `#not-the-agent-skill`. The core README's `#overview` anchor is gone too, and its content is now under `#about-merlon-docsmerlon-docs-core`.

  Both READMEs now put their related packages, further reading and license after the guide sections, just before the glossary. In the CLI README these sat inside the Agent integration section, and in the core README they came before the API sections. The related packages are a list instead of a table, and the presets entry describes the Merlon Docs Vale style as well as the markdownlint configs. The `#related-packages`, `#further-reading` and `#license` anchors don't change.

  The CLI README says once, in the `refs` glossary entry, that refs check links and do not find documents. Other CLI sections no longer repeat it, and the command reference links to that entry. The `refs` and `refs registry` glossary entries use the registered command names `merlon refs-gen` and `merlon refs-check`, and the config table calls `refs.registryFile` the refs registry file instead of a lookup table.

  The CLI README gives the output layout and its defaults once, under "Path layout" in Config essentials. Project layout and Consumer migration link there instead of repeating the outputs table, so links to `#generated-output-outputdir-default-_build` or `#output-layout` should point at `#path-layout`. Config essentials renames "Guide = one subdirectory" to "Resolution bases", and the refs registry section renames its own "Path layout" heading to "Registry location", so the README has one "Path layout" heading. In the core README, the Config API section says which defaults `loadConfig` fills and links to Config essentials for the output layout instead of listing it.

  Config essentials gives the minimal config and its top-level field table their own "Minimal config" section. They used to sit under "Link validation" and read as part of it. The "Opt-in output backup", "Link validation" and "`sectionsHeading`" subsections are gone. A new "Feature settings" section lists the default of each link, path and backup key, and links to the feature spec that explains each key. Links to `#opt-in-output-backup`, `#link-validation` or `#sectionsheading` should point at `#feature-settings`.

  The CLI README's Consumer migration section is now about moving an existing document into shards. Its "Steps for a new consumer repo" are gone: the Quick start already had the config and repo-root commands, and it now ends with adding the `docs:compile` and `docs:check` scripts (with `--require-lint`) and running them in CI. Links to `#steps-for-a-new-consumer-repo` should point at `#quick-start`. The manifest section is one paragraph that links to the Manifest compile order spec. The pointer to upgrade notes moved to Stability. The core README's Stability section now asks for the changelog and release notes of each Merlon Docs package you use, in the same words as the CLI README.

- 1966720: The core README's codeEvidence section states the rules the hook applies. Symbol lookup links the first line where the symbol appears as a whole word, which can be an import or a comment, and a line range cites the declaration. The hook skips a path to an extensionless file when the path has a `.` in it, such as `../../Makefile`. `compile.scopeRoot` and `compile.outputFile` resolve from the docs root and from `outputDir`, and the example config writes its output to the repository root as the compiled example shows. The example uses neutral file names.
- 9bc05cd: The publish-relative pass no longer rewrites a link that `codeEvidence` already rebased.

  `codeEvidence` writes a source link's path relative to the link base. The publish-relative pass then read that path as relative to the shard and looked it up from the shard's directory first. When that path led to another file from there, the link pointed at it, with a line fragment taken from the file the hook had read. A shard at `docs/a/sub/deep.md` that links `../../../src/foo.ts` compiled to `../src/foo.ts#L3` in `docs/_build/a.md` once `docs/src/foo.ts` existed. The link now keeps the path the hook wrote, `../../src/foo.ts#L3`.

  Assembly marks the links the hook rebased once every hook has run. The hook itself returns its links without a mark, to a direct `applyCompileHooks` call and to a hook that runs after it. Assembly finds each link by the text the hook wrote and by its place among the links with that text, so a link that the shard wrote with the same text and the hook left alone doesn't get a mark. When a hook listed after `codeEvidence` changes that text, or adds or removes a link with that text above it, the publish-relative pass can still rebase the hook's path, and leave another link with that text as it is.

  Link passes, `docs/features/compile-pipeline/link-passes.md` in the Features Guide's Compile pipeline group, states the rule, and Publish-relative link rewriting, `publish-relative-links.md` there, lists a link the hook rebased among its exclusions. The core README's codeEvidence section now says which `../` links the publish-relative pass rebases, and the publish-relative examples from Merlon Docs’ own docs show links that pass rebases.

- 9bc05cd: Path lookup order, `docs/features/compile-pipeline/path-lookup-order.md` in the Features Guide's Compile pipeline group, states each pass's path lookup order once, in a table that matches the code. The per-hook lists it replaces were wrong. No pass tries the shard's parent directory. The publish-relative rewrite tries `compile.scopeRoot` before the guide directory. `codeEvidence`, `inlineInserts` and the cross-guide rewrite try the working directory and its parent before `compile.scopeRoot`.

  The `codeEvidence` section now says what the hook does with the fragment of a link whose file it can't find. It keeps an existing `#L` fragment or adds one from a line range in the label or path, and it drops any other `#fragment`. Its exclusions list said such a link was left unchanged. The section also says a data file gets an `#L` fragment from a line range the shard writes, and never from symbol lookup. It said a data file never got one.

  Link passes, `docs/features/compile-pipeline/link-passes.md` in the same group, lists the three link passes in one table, and the Architecture diagram of the core README's compile hooks section shows the per-shard intra-guide pass. The Built-in hooks list links that shard in place of its entries for the cross-guide and publish-relative passes, which aren't hooks. The cross-guide section's "Link rewrite passes" table and the publish-relative section's "Division of labor" table are gone, so links to `#link-rewrite-passes-cross-guide-vs-intra-guide` or `#division-of-labor-three-link-passes` should point at `link-passes.md`. The "guideDir misaligned with shard tree" section is now "Guide directory apart from its shards" in `path-lookup-order.md`.

  Cross-guide link rewriting, `docs/features/compile-pipeline/cross-guide-links.md` in the same group, no longer describes which links the compile walk follows. The Manifest compile order spec in the features guide covers that now, so links to `#transitive-section-discovery` or `#what-the-walk-follows` should point at its "Linked shards and the file-name fallback" section. The ownership rules for the guide link index are under "Index ownership" in that shard, and its "Guide link index" section says which shards get an entry: each shard the walk compiles that opens with a heading, and each `FIND-*` finding. The core README's Config API section has a publish-outputs paragraph that links to the link passes instead of restating them.

  The matching and exclusions lists of Publish-relative link rewriting, `docs/features/compile-pipeline/publish-relative-links.md` in the same group, now match the code.

  The `inlineInserts` search root examples use `shared`, the parent of a `diagrams/` library. Compile resolves the whole link path, such as `diagrams/flow.md`, against each root, so a root named `diagrams` looks for `diagrams/diagrams/flow.md`.

- 9bc05cd: Read manifest, shard and insert links in linear time

  Compile reads the `.md` links and `](#slug)` links of a manifest, then the `.md` links of each shard it follows a link to. The `inlineInserts` hook reads links into an insert library. Both read the whole text at once. The regexes that did this read a link target with `[^)]`, which crosses line breaks. On a crafted text the `.md` and insert link regexes rescanned the rest of the text from each `[` and again after each `.md`, so their time grew with the cube of the text's length. A shard of 1,000 lines of `See [x](a.md#` took 4.5 s to compile, and an `inlineInserts` body of 21,600 characters took 8.4 s. The slug link regex rescanned the rest of a manifest from each `](#`, so its time grew with the square of the manifest's length.

  Linear scanners now find the same links, with the same labels, paths and fragments, and the same two inputs take 9 ms and under 1 ms. New cases in the ReDoS budget suite cover a shard, a manifest and an insert body whose link targets never close, and texts whose links share a label end or a target end.

  The `inlineInserts` section of the core package README now states the rule the hook matches links with. The target starts with a library directory, after an optional `./` or run of `../`, and the directory and the `.md` can take any case. A `#fragment` after the `.md` can't be empty.

- 40e2570: The core README keeps the API reference and what a hook author or config author uses: the compile hooks overview, the extension pattern and each built-in hook. The compile pipeline specs moved to a Compile pipeline group in the Features Guide, under `docs/features/compile-pipeline/`. The group lists Link passes, Path lookup order, Cross-guide link rewriting, Publish-relative link rewriting and Tables after link rewriting, and the core README links them. Its `#link-passes`, `#path-lookup-order`, `#guidedir-misaligned-with-shard-tree`, `#cross-guide-link-rewriting`, `#publish-relative-link-rewriting` and `#tables-after-link-rewriting` anchors are gone, with the anchors of their subsections. A link to one of them should point at the same heading in the moved shard. The guideDir section is now Guide directory apart from its shards, in Path lookup order. The move also renamed or dropped these subsections. In Cross-guide link rewriting, the section with the old anchor `#cross-guide-purpose` is now Guide link index, so a link to it should point at `cross-guide-links.md#guide-link-index`, and its dead-anchor and wrong-heading limits are under `#link-index-limits` there. The section with the old anchor `#default-_build-outputs-and-transitive-targets` is gone, since it didn't add a rule, and a link to it should point at `#same-compiled-output-preference`, the rule it pointed at. In Publish-relative link rewriting, the section with the old anchor `#why-this-pass-exists` is now Shard-relative paths and the one with `#repo-dogfood-examples` is now Examples from this repository, so a link to them should point at `publish-relative-links.md#shard-relative-paths` and `publish-relative-links.md#examples-from-this-repository`. The group also has a Fence scan shard and a Section slugs shard, split from the stripAnchors spec and the cross-guide spec.

  The CLI README links the moved shards where it linked those core README sections.

- 9bc05cd: Use "compiled guide" for the file compile writes for one guide, and keep "monolith" for the optional top-level `outputFile`. The `merlon compile` help text now reads "Stitch shards into compiled guides". The `ignoreGuides` type docs now say that links to a listed guide's shards keep source `.md` paths instead of `#slug` targets in the file that holds the target guide. The `standaloneGuides` schema description now says a standalone guide doesn't get compile output of its own. The `merlon shard` help text now reads "Split a source document into shards (md-tree)". The `merlon-docs` skill's context guardrails tell agents not to load whole compiled output (a compiled guide or the monolith).
- 08dd72e: The core README's API sections are titled Config API, Compile API, Refs and validation API, and Shard and peers API. Their anchors are now `#config-api`, `#compile-api`, `#refs-and-validation-api` and `#shard-and-peers-api`, and a link to one of the old `#api--` anchors should use the new one. The CLI README's link to the config API uses the new anchor.
- d19b745: The core README's API tables name more of the exports. Config adds `resolveDocsRoot`, `resolveUnderOutputDir`, `effectiveGuideOutputFile` and `resolveGuideLinkBase`, which the page says is the link base of only the assembly that writes that file. Compile adds the from-results and with-context functions, `buildGuideLinkIndex`, the shard cache, two link passes, `slugForSectionFile` and `stripExplicitAnchorMarkers`, and a Locale packs section lists the locale pack API. Validation lists the extension sets. The Compile order table on the refs and validation page is gone, since the Compile page lists the same exports.
- 42c9fef: The core README's Shard and peers API gives the `findPeerBinary` and `runPeer` contract, a `node_modules/.bin` binary found from `cwd` upward, then one on PATH, then `found: false` and a skip with an info line unless `require` is set, and links the peer linters design constraint as the policy. Config API no longer restates the shard glob rule. It links In-scope guide fileset in the CLI README and keeps what is specific to `shardLintPaths`. The codeEvidence, inlineInserts and stripAnchors specs open with a link to the developer guide's Spec-to-test map instead of a contributor test map, and the Compile hooks overview drops its sentence on docs-first specs with mapped tests. The developer guide's Spec-to-test map holds the mapping.
- 426dbe5: The core README's `compile.hooks` section keeps the `resolveCompileHooks` sentence and links Configuration in the compile hooks overview for the config keys, where it restated the forms `compile.hooks` takes, the `hooksConfig` key and `compile.stripAnchors`. The extension pattern links Explicit override in the Default compile hooks spec, which says the array form replaces the default pipeline. The `compileGuideResultsWithContext` row names `linkedFilesByGuide`, the fourth field of the context. The stray "Full spec" line after the `compile.title` paragraph is gone, since the backup paragraph already links Backup path layout. The codeEvidence section calls the rebase target the guide's link base, the term Publish-relative link rewriting defines. The inlineInserts section states the media-embed rule once, under layout. The refs validation section no longer restates the outputDir-relative path advice that Path layout in the CLI README owns.
- 04a4407: The core README links each rule's owner instead of restating it. Config API and the compile hooks overview link Default compile hooks in the Features Guide for the forms `compile.hooks` takes. The overview's "Opt out per hook" and "Explicit override" subsections are gone, so links to `#opt-out-per-hook` or `#explicit-override` should point at that spec's Configuration section. The rule for the strip after stitching is stated once, under "stripAnchors purpose".

  The Config API summary gives the `ignoreGuides` exception in one clause that links the glossary entry, and the glossary entry, which each README stitches, links the two rules behind it. A link to a shard the compiling guide stitches can still take its in-document anchor. Same compiled output preference says when the cross-guide pass gives it one, and `ignoreGuides` interaction says when the intra-guide pass does, for a `./` or bare link. The CLI README now stitches the `ignoreGuides` glossary entry, which its consumer migration steps link. Config API links Source tags and default banner for the per-guide banner and source tag keys, and Config essentials for the base of each generated path. Compile API says what `knownSlugs` and `monolithKnownSlugs` hold and links the BROKEN LINK marker spec for the fragments that pass.

  The core README no longer links the monolith glossary entry, which led to a chain of doc-authoring terms, so it stitches three glossary entries where it stitched fifteen. Compile API defines the monolith in one sentence instead.

- bb3dd57: A sentence in the core README's heading slug contract drops a semicolon, and the first line of its codeEvidence config section drops an em-dash. The rules they state are unchanged.
- ea7bbec: The core README's Further reading links the CLI commands reference in place of a second link to the CLI package page.
- f9a11eb: The core README's Extension pattern section says where a custom hook runs. A process registers the hook before it calls `compileGuideResults` or `compileGuides`, and the Merlon Docs CLI doesn't load one. Compile skips a name in `compile.hooks` that has no registered hook, without a warning. It shows a `compile.hooks` array that keeps the built-in hooks next to a custom one, and lists the `CompileHookContext` fields a hook gets.
- 9bc05cd: Keep headings inside fenced code in a CRLF shard

  Heading demotion skips the lines inside fenced code blocks, so a `# comment` in a shell example keeps its level. It found the fences with a regex that ended in `(.*)$` without the `m` flag, and on a line that ends in a carriage return that regex never matched. In a shard with CRLF line endings, compile and `demoteHeadings` demoted each heading-like line inside a fence. On a crafted CRLF line the regex also gave the backtick run back one character at a time, so a line of 40,000 backticks took 2.4 s.

  Demotion now finds fences with the scan that the slug registry's heading reader uses. A heading inside a fence of a CRLF shard stays as written, and the 40,000 backticks take under 1 ms. Since the scan follows GFM, a few lines that the regex misread now read as GFM renders them:

  - A run of backticks or tildes shorter than the one that opened the fence, or one followed by an info string, no longer closes it.
  - A line of three or more backticks followed by another backtick, such as `` ``` `x` ``` ``, no longer opens a fence.
  - A fence that starts one to three spaces in now counts as a fence.

  `demoteExceptFirstH1` changes the same way. On text that ends with a newline, both functions still add a blank line at the end.

- 9bc05cd: Write each `l` of a line fragment as `L`, and trim slashes and backticks in linear time

  `codeEvidence` keeps a line fragment that a link already has, such as `#L6-L8`. It wrote only the first `l` of that fragment in upper case, so `#l6-l8` compiled to `#L6-l8` instead of the `#L6-L8` form the hook writes for every other range. It now writes each `l` as `L`.

  `shardLintPaths` trimmed the slashes at the end of a `shardsGlobs` entry that starts with `../` with `/\/+$/`, and `codeEvidence` trimmed the backticks around a link label with ``/^`+|`+$/g``. When a run of slashes or backticks is followed by other text, each regex rescans the run from each of its characters. An entry with 80,000 slashes before a letter took 8.2 s, and so did a label with 80,000 backticks between two letters. Each trim is now a loop, and the same entry takes under 1 ms and the same label 6 ms in the hook. New cases in the ReDoS budget suite cover both.

- 3b4eb6f: Doc review corrections in sections that the READMEs stitch. The `orphan` entry in both READMEs links the new Orphan check scope section of the Manifest compile order spec, which says what the check reports and which files it doesn't read. The entry's second paragraph restated that scope and is gone.

  In the CLI README, the `refs registry` entry says that `merlon compile`, `merlon refs-gen` and `merlon check` rewrite `refs.json` from their own compile, and that only `merlon refs-check` fails on a stale file, as the new Stale registry check section of the Refs registry path spec says. It used to say that `merlon check` verifies the registry against the latest compile, which can't fail because `merlon check` writes the file first. The `refs` entry there drops "via `merlon check`" from its check refs row and links the registry entry from its own row.

  Both READMEs link the backup path layout in the Compile output backup spec instead of restating where `--backup` puts a prior output. The CLI README said prior output sits under `backups/`, but the backup of a publish output outside the docs root climbs out of that directory.

  The `locale pack` entry in both READMEs and the `authored GFM` entry in the core README now have lowercase titles, like the other common-noun glossary entries. Their anchors are unchanged.

- 196e879: The core README's `stripAnchors` section keeps the hook's own rules and links the fence scan, which moved to a Fence scan shard in the Features Guide's Compile pipeline group with its limits. The section's "stripAnchors limits" now names only what the scan's limits do to the strip. The heading slug notes under Refs and validation API link the Fence scan and Section slugs shards instead of the stripAnchors and cross-guide sections.
- 9bc05cd: The guide tier glossary entry in both READMEs links only to Default guide layout in the Merlon Docs 1.0 spec, which now holds the placement test as well as the four tiers.
- 9bc05cd: Cross-guide link rewriting, `docs/features/compile-pipeline/cross-guide-links.md` in the Features Guide's Compile pipeline group, now states how `compile.crossGuideLinks.ignoreGuides` and same compiled output preference interact. Compile behaves as before.

  A link to a shard that the compiling guide stitches takes the in-document anchor when the shard's owner in the guide link index is non-canonical, even when the compiling guide lists that owner in `ignoreGuides`. A non-canonical owner is only the first guide in `compileOrder` whose walk reached the shard. A `../` link to a shard whose canonical owner is listed keeps its shard path. A `./` or bare link to such a shard still takes the in-document anchor through the intra-guide pass when the compiling guide stitches the shard. The matching rules and the exclusions list read as if every link to a listed guide kept its shard path, and now link the precedence rule. The `ignoreGuides` summaries in the core README's Config API section, in the features overview and in the CLI README's consumer migration steps give the exception in one clause and link the glossary entry, which links both rules. The `compile.crossGuideLinks.ignoreGuides` section links both rules too. The type docs of `AssembleGuideOptions.ignoreGuides` and `CrossGuideLinkRewriteOptions.ignoreGuides` now name the same exceptions.

- 2970371: The core README's inlineInserts section names the check that catches a first reference in a table cell: MD056 in the compiled markdownlint pass, for the outputs that pass lints.
- 9bc05cd: `inlineInserts` now reads `hooksConfig.inlineInserts.searchRoots` for a guide whose `path` ends in a directory with a different name from its `name`, such as a guide named `architecture-review` with `path: review`. Assembly gave hooks the directory's name as the guide name, so the hook didn't find the guide's config and skipped its search roots. An insert link that only a search root could resolve stayed a plain link. Hooks now get the guide's configured name.
- dc99eac: The stripAnchors section of the core README drops its illustrative marker, and the codeEvidence and inlineInserts sections mark only their example lines. The path check now covers their test and source citations.
- 5951064: Read inline links as CommonMark does in every link reader

  Link lint, broken-link marking, the link passes, `codeEvidence`, the manifest walk and the `inlineInserts` hook ran a link's label to its first `]`. In a linked image, `[![Diagram](./d.png)](./page.md)`, they read the image's src and missed the outer target. Compile left `./page.md` as written and link lint didn't check it, and the walk didn't follow it to a shard. They didn't read a label with brackets in it, such as `[the arr[0] notes](./notes.md)`, at all.

  These readers now read a label as CommonMark reads link text, so a label can contain an image or balanced brackets. Compile rewrites the outer target of a linked image, and link lint checks it. Broken-link marking marks a dead `#fragment` there with the label and target the shard wrote, and the walk follows the target to a shard. A bracket after a backslash is text, so `\[x](./x.md)` isn't a link, and the walk no longer follows it. Link lint checks no image's src, so it no longer reports a missing src in a linked image, as it never did for an image alone. `inlineInserts` no longer reads an image as an insert link. In `codeEvidence`, the walk and `inlineInserts`, a target now ends at the first `)` on its line, as in link lint and the link passes. So an unfinished link such as `[x](see` no longer takes in the link on the next line.

- 9bc05cd: Compile no longer lets a later link pass rewrite a link that the cross-guide or publish-relative pass already wrote.

  The cross-guide pass writes a link to an output in the same directory as the output's file name alone, such as `glossary.md#term`. When the linking guide stitched a shard with that file name, the intra-guide pass turned the link into a dead `#term`, and compile marked it as a broken link. Guides without `compile.outputFile` all write to the output directory, so a link between two of them met this whenever the linking guide stitched a shard named like the other's compiled guide. The link now keeps the target the cross-guide pass wrote.

  The publish-relative pass also looked up a cross-guide target from the shard's directory, though that target is relative to the link base. When the path led to some other file from there, the pass pointed the link at that file, so `../../README.md#t` became `../../docs/README.md#t` once `docs/README.md` existed. It now leaves a cross-guide target as written.

  A path that `compile.crossGuideLinks.ignoreGuides` keeps is still rebased relative to the link base. The intra-guide run on the stitched body read that rebased path from the guide directory, and turned it into `#slug` when the guide stitched the shard and the path led to it from there. Whether it did depended on where each document sat, so a guide in the monolith could link the section in its compiled guide and the shard file in the monolith. Both documents now link the shard file, also in a layout where both used to link the section. A `./` or bare link to a shard the guide stitches still becomes `#slug`, because the intra-guide pass rewrites it per shard and the publish-relative pass only matches `../`.

  A direct `assembleGuide` call that sets `publishOutputFile` now keeps each path the publish-relative pass rebases. Without `linkIndex`, a `../` link to a shard the guide stitches used to become `#slug` when the rebased path also led to the shard from the guide directory. It now stays a path relative to `publishOutputFile`.

  The exported `rewriteCrossGuideFileLinks` doesn't mark the targets it writes. A caller that runs `rewriteIntraGuideFileLinks` on its output still lets the intra-guide pass read a target such as `glossary.md#term` as a shard link and turn it into `#term`.

  Link passes, `docs/features/compile-pipeline/link-passes.md` in the Features Guide's Compile pipeline group, states the new rule.

- 9bc05cd: The link passes, `codeEvidence`, broken-link marking and link lint now read fenced code the same way. The link passes, broken-link marking and link lint used to skip only the lines between two lines that start with three backticks, outside a blockquote. So they changed or checked a link in a fence of tildes or in a quoted fence. They missed a fence that opens a list item too, and a fence of four backticks ended for them at a line of three. The closing line of a fence that opens a list item started a fence for them, and so did a line of backticks in a fence of tildes, which hid every line after it up to the next line of backticks. They and `codeEvidence` now find fenced code with the scan that heading demotion and the slug registry use, which reads fences of backticks or tildes and follows list items. They also run it on the text of each blockquote, up to ten blockquotes deep. The link passes, `codeEvidence` and broken-link marking leave a link in fenced code as the shard wrote it. Link lint doesn't report a link or a BROKEN LINK example there. `merlon review` already skipped a fence of backticks or tildes before it read links. Its `index-size` check no longer counts a link in a quoted fence or in a fence that opens a list item.

  The scan reads an indented code block as prose, as link rewriting did before. A line of three backticks doesn't open a fence when it's indented four spaces or more outside a list, or four columns or more past the text of its list item. So it no longer hides the lines after it. In an indented code block, or after such a line in a paragraph, the link passes and broken-link marking now change the links on those lines, and link lint reports them. Link lint also reports the links on the lines that those lines of backticks used to hide. So `merlon check` can fail on a broken link that it passed before.

  Direct callers see the same change. The exported `extractLinks`, `markBrokenLinks`, `lintLinks`, `lintCompiledLinks`, `lintShardLinks`, `collectShardProvenance`, `rewriteCrossGuideFileLinks` and `rewriteIntraGuideFileLinks` skip the same fenced code, and so do the `links` and `provenance` that `loadShardSnapshot` returns.

  `codeEvidence` read its link pattern over the whole shard body, so it rewrote link syntax to a repository file in any fence and in a code span. It now skips fenced code and code spans, as the link passes and link lint do. A code span that shows link syntax keeps it as written, and a table with such a cell keeps its alignment. A link outside code still rewrites when its label wraps onto the next line. A label with a `]` in a code span now matches, as it does for the link passes.

  `inlineInserts` doesn't change. It still reads an insert link in fenced code or in a code span, so it can inline an insert in a code example.

  The core README's codeEvidence example now shows its shard input as written. Compile used to add `#L6-L8` to the link in that fenced example. Link passes, `docs/features/compile-pipeline/link-passes.md` in the Features Guide's Compile pipeline group, says the passes leave a link in fenced code or a code span as written, and so does the core README's codeEvidence section. Fence scan there states the fence reading. Cross-guide link rewriting and Publish-relative link rewriting in that group list link syntax in fenced code or a code span among their exclusions. Tables after link rewriting there says that the link passes leave the links of a table in fenced code as written, and that an insert link in fenced code or in a code span can still put the table out of line. The core README's inlineInserts section says the hook reads fenced code and code spans.

- 62c885c: Read inline links in linear time in link lint and the link passes

  Link lint, broken-link marking and the cross-guide, intra-guide and publish-relative link passes read each line's links with regexes, and `codeEvidence` read each run of lines between fenced code with one. Each regex matched `[label](target)` with negated character classes, so on a crafted line it read the rest of the line again from each `[`. Compiling a shard whose one line is `[a](b` repeated 8,000 times, then one `)`, took about 730 ms, and the same line with 100,000 copies took about 2 minutes.

  These readers now find links with a linear scanner in `compile/link-scan.ts`. Those shards now compile in under 20 ms and under 250 ms. New cases in the ReDoS budget suite cover each reader.

- 9bc05cd: Parse path claims without backtracking regexes

  The prose path probe trimmed `./`, trailing slashes and `#fragment` with
  regexes anchored at the end of the string. Those backtrack on a span holding a
  long run of slashes followed by a non-slash — measured 156 ms at 20,000 slashes,
  5.2 s at 120,000 — and a backtick span is documentation text, so the input is
  not ours to trust. CodeQL flagged the pattern as `js/polynomial-redos`.

  Trimming is now index arithmetic, which is linear whatever the input, with the
  timing covered in the existing ReDoS budget suite.

- 9bc05cd: Compile now rebases a link target made only of `../` segments. A bare `../` used to stay as written, so in the compiled guide it pointed away from the directory the shard meant. A target such as `../../` that resolves to the directory containing the guide's output compiled to an empty href, and `../../#top` lost its path and became the same-document link `#top`. These targets now compile to the directory path, or to `./` when that directory contains the output. Any other target that resolves to the output's own directory, such as `../../pkg/` in a guide that compiles to `pkg/README.md`, also compiles to `./` now.
- 9bc05cd: The publish-relative pass now rebases a shard's own link to an output of the run, such as `../../README.md` or `../../DEVELOPERS.md#setup`, like a link to any other file. It counts each compiled guide as existing before compile writes it, and the monolith too when a guide is stitched into it. A first compile then rebases the link as later ones do. When every guide sets `compile.outputFile`, the run never writes the configured monolith. The pass then treats a path to the monolith as missing, even when an earlier run left the file on disk. Such a link used to keep its shard-relative path on a fresh tree and be rebased once the file was there.

  The pass used to skip a target whenever an entry in the guide link index named it as its output file. An entry's output file is its owner's publish output, or the monolith for a monolith guide. In a config without a monolith, it is the owner's compiled guide. A shard's link to one of them kept its shard-relative path and broke in a compiled guide at another depth than the shard. The skip was meant for links the cross-guide pass writes. The pass now tells those links apart from the shard's own and leaves only them alone.

  Publish-relative link rewriting, `docs/features/compile-pipeline/publish-relative-links.md` in the Features Guide's Compile pipeline group, says the pass rebases a link to an output, and Path lookup order there says when the monolith counts as missing. The core README's Config API section and the features overview give a path that leads to no file as their example of a link the pass leaves as written.

- 5fe1d37: The core README's quick example opens with what it does and writes the compiled outputs with `writeCompiledGuidesFromResults`. It loads the config with `process.cwd()` as `configBase`, as the Config API says. It shows `checkRefsRegistry` as the CI alternative to regenerating the registry, and links the Compile and Config API pages.
- 9bc05cd: README corrections from a doc review: the CLI README documents the `--backup` options, `refs-list --format`, the `lint.codeExtensions`, `lint.dataExtensions` and `lint.paths.*` config keys, and the registered `refs-gen`/`refs-check`/`refs-list` names. Code examples that showed empty code where a heading id was stripped now render. The core README lists `computeCoverage` and `probeDocumentPaths`.
- 9bc05cd: Compile re-aligns a GFM table whose links it rewrote. Compile can rewrite a link target to a path or anchor of another length, and a broken link becomes a longer marker. Either change moved the pipes of an aligned table from a shard, and markdownlint's MD060 rule failed on the table in the compiled guide. The last step of each assembly now prints such a table as Prettier does with its default `proseWrap` setting. It measures a wide or fullwidth East Asian character, or an emoji shown as an emoji, as two columns, and a nonspacing mark or a format character as none. A text-style emoji such as ☝ counts one column, as markdownlint counts it.

  Compile re-aligns a table whose cells without a link still match the width of their column's delimiter cell, and that pads some cell with more than one space. A compact or tight table stays as written, and so does a table in more than ten nested blockquotes. Compile doesn't re-align a table in fenced code, though it can still change a link there. A table in a list item or a blockquote keeps its indentation and its quote markers. In a tight list, the table ends at the next list item, and a table that opens its list item keeps the marker on its header row. Prettier and markdownlint measure some text differently, such as Hindi or pointed Hebrew. When a cell without a link contains such text, MD060 flags the table in the shard and in the compiled guide.

- 9bc05cd: Number section links with every heading in the compiled guide

  A link to a shard compiles to the anchor of the heading that opens the shard's section. Compile used to number only those opening headings, and it skipped sub-headings and the guide's H1. When an earlier heading had the same title, the link pointed at that earlier heading, and `merlon check` passed. One slugger now numbers every ATX heading at column 0 in stitch order, starting with `compile.title` or the manifest's H1. The link gets the heading's numbered anchor, such as `-1`. The guide link index takes each slug from the numbering of the shard's owner, so a link that goes to the owner's compiled guide matches the anchor there. A `FIND-*` shard or a first heading with `{#id}` keeps its declared id, and later headings with the same title count its heading. When `compile.stripAnchors` is `false` and the `stripAnchors` hook doesn't run, the compiled headings keep their `{#id}` markers, and each heading is numbered by the title it renders, marker included.

  A line inside a fenced code block is no longer a heading anywhere Merlon Docs numbers headings: section slugs, `buildSlugRegistry` and the same-shard `#fragment` check all skip it. A `# comment` in a shell example no longer takes a slug or shifts a later anchor, and `refs.json` no longer files the headings after it under a guide named after the comment.

  Compiled anchors change only where an earlier heading or a fenced line took a section heading's slug first. A cross-guide link also changes when the index took its slug from a guide whose transitive walk includes the shard. It now takes the slug from the shard's owner.

- 08c56ac: The core README states what `shardLintPaths` returns, for the default globs and for `shardsGlobs` entries, and leaves the reasons for each form to the code.
- 7ad6950: The core README's heading slug contract links `github-slugger` on npm and no longer links a third-party repository.
- 9bc05cd: The README's standalone guide glossary entry says that the Standalone guide behavior section covers which checks read a standalone guide, as well as how compile treats it. That section now says that `merlon prose` and `merlon check` run Vale over standalone guides.
- 9bc05cd: Strip `{#id}` markers from a long line in linear time

  `stripExplicitAnchorMarkers`, which backs the `stripAnchors` hook and the post-stitch strip, trims the whitespace before each marker it removes. `stripPandocAnchors` with `trimPrecedingWhitespace` did that by reading the end of the output it had built so far, and V8 copied that whole output on each read. A line with many markers took time that grew with the square of its length. A line of 40,000 `a{#x}` markers took 135 ms to strip, and one of 160,000 took 6.7 s.

  The helper now keeps its output as ranges of the input and trims the last range. Its time grows linearly with the line, and the same two lines take 8 ms and 30 ms. A new case in the ReDoS budget suite covers a line of many markers between words. The output is the same.

- 9bc05cd: Keep `{#id}` examples inside code when compile strips anchor markers

  `stripExplicitAnchorMarkers`, which backs the `stripAnchors` hook and the post-stitch strip, removed every `{#id}` marker in the document. When a guide quoted the syntax in an inline code span, the span compiled to an empty pair of backticks, and a fenced example lost its ids too. The strip now keeps a marker inside an inline code span or a fenced code block.

  Heading lines keep the old rule. A line that parses as an ATX heading at column 0 loses every marker, even inside a fence or a code span. Merlon Docs computes heading slugs from titles with every marker removed. Stripping the whole line keeps the compiled heading on the slug that refs and rewritten links use, however a fence is read. To show the syntax on a heading inside a fenced example, start the heading line one to three spaces in. Merlon Docs doesn't read that line as a heading, so it keeps its marker.

  Fences are found line by line. A fence counts when it starts at most three columns in, measured from the text of the innermost list item around it, or right after a list marker, and the scan doesn't read blockquotes or HTML. It misses a fence behind `>`. A marker in such a fence still goes unless a code span on its line holds it. Code spans are paired within each line, so a span that wraps onto the line, or a backslash-escaped backtick before it, can shift the pairing. A shifted pairing can drop a quoted marker or keep a prose one.

  The strip itself works line by line too. It trims whitespace only on the marker's own line, so a marker that opens a paragraph leaves the blank line above it in place. When a marker opens a line's text, the whitespace after it goes instead, and the line keeps its indent. The strip still drops a line that contains only a marker. With the markers on separate lines, the time grows linearly with the document.

  `merlon compile` output changes the same way. The CLI and core READMEs quote the syntax again, and the core README gives `stripAnchors` its own section, which states the heading-line and code rules. Fence scan, `docs/features/compile-pipeline/fence-scan.md` in the Features Guide's Compile pipeline group, states the fence reading and its limits.

- 9bc05cd: Tables after link rewriting is a shard of its own, `docs/features/compile-pipeline/tables-after-link-rewriting.md` in the Features Guide's Compile pipeline group, where it was a subsection of the core README's compile hooks overview. The core README links it.

## 0.8.1

### Patch Changes

- 95a0120: Update runtime dependencies: `zod` 4.6.5, `ignore` 7.0.10 and `semver` 7.8.5.
- 9039614: Remove bare digit-range matching from `lineRangeFromText` — `1-2` no longer produces `#L1-L2`. An explicit prefix (`L`, `:`, or a locale word cue) is required to avoid ambiguity with non-line-range number ranges.
- a9342ce: Audit remaining regexes for ReDoS risk: linear line-range scanner and Phase B inventory after prose cues moved to Vale (#201, #230). Line-range word cues (`line`/`lines`) and the about-this-guide preamble title come from the en-US locale pack (single `locales/en-US.json`) so other locales can supply their own; `#L…` output stays GitHub protocol shape.

## 0.8.0

### Minor Changes

- 715047b: Ship the `MDCP` Vale style (en-US unlinked heading-mention prose) from `@bwilliamson/mdcp-presets`, keep compile-time locale strings in mdcp-core (BCP 47 JSON + shared formatters), document Pandoc ID removal as dogfood Vale (`MDCP-PandocId`), keep slugify language-agnostic, and document GFM heading recognition as an ATX subset with a generic `parseHeading` API (setext not yet).

### Patch Changes

- 9424c5b: Update all dependencies to latest versions and fix transitive high-severity audit failures via pnpm-workspace.yaml overrides (fast-uri, js-yaml, brace-expansion, nanoid, browserslist, postcss, smol-toml, dompurify, @hono/node-server). Bump packageManager to pnpm@11.25.0 (11.13.0 was a broken release). Pin GitHub Actions SHAs to latest patch releases. Declare unfixable image-size advisories in audit.ignore.

## 0.7.3

### Patch Changes

- 473954d: Clarify pre-1.0 stability as per-package (independent versioning); stop gating docs on a single npm 1.0.

## 0.7.2

### Patch Changes

- 095b710: Index every `linkedSectionFiles` path (including transitive `scopeRoot` shards outside `guideDir`) and prefer same-output `#anchor` rewrite for non-canonical co-compiled targets so `../` links under default `_build` outputs resolve correctly.

## 0.7.1

### Patch Changes

- 7fb748f: Bare sibling `.md` links from shards outside the guide directory now rewrite to in-document anchors during compile. Parent-traversal (`../`) links are left unchanged for cross-guide and `ignoreGuides` handling.

## 0.7.0

### Minor Changes

- Fix coverage scan to honor the repository-root `.gitignore` when `scan.root` is nested inside a git working tree (bounded by `.git`), and never climb parent directories for `.gitignore` when not inside git.

  Replace polynomial-risk heading and Pandoc `{#id}` regexes with linear shared markdown helpers, clearing CodeQL `js/polynomial-redos` alerts (#200). Includes intentional heading/anchor edge-case tightening and newline `\s` parity for compiled strip.

  Add a repository-wide markdown coverage scan plus `standaloneGuides` config, honoring `.gitignore`. `mdcp check` reports uncaptured paths; `scan.strict` fails the gate (dogfooded in this repo).

## 0.6.1

### Patch Changes

- Fix Agent Skill YAML frontmatter corrupted by release version sync (`---name:`), which broke `npx skills add`. Require `pnpm skill:validate` after version sync in `release:tag` and again in the release workflow before npm publish.

## 0.6.0

### Minor Changes

- Require Atomic commit groups in parent `mdcp` QA and point day-to-day helper plan steps at that rule so agents deliver one concern per commit.

  Print a stderr failure summary at the end of `mdcp check` when gates fail after peer linters, so CI logs show which step failed and how to fix it instead of only a bare exit code after peer “0 errors” output.

  Docs: explicitly branded the default 4-tier directory layout (\`features/\`, \`client/\`, \`developer/\`, \`glossary/\`) as the "Code Repository Archetype". This frames the default structure as a specific, fundamental "battery type" for code projects, helping enforce boundaries without limiting the flexibility of the core MDCP protocol for other documentation domains.

  Getting-started helper: optional first-feature tutorial (design → feature → UX → doc-only), EXAMPLE_MODE, and Closing CTA (star/review, DORA, dora.community/join).

  Switch CLI framework from Commander to CAC to drop minimum Node.js requirement from Node 24 down to Node 18.0.0. Closes #57.

  Refactor: migrated subagents from bash wrapper scripts inside the mdcp parent skill into independent helper skills (e.g. \`mdcp-feature-level\`). The \`mdcp\` skill documentation has been updated to instruct agents to use the installed CLI directly.

  Refactor: removed legacy \`spec/extensions\` and \`spec/llms-index\` references in docs, updating them to point directly to the implemented \`skills/\` layout and correctly referencing the repo structure.

  Added `sourceTags` to `MdcpConfigSchema` (defaults to `true`) to wrap compiled shards in HTML comments indicating their source path. Source tags are emitted with a blank line before the closing tag so compiled output stays Prettier-stable, and can be disabled per guide via `compile.sourceTags: false`.
  Updated `banner` to default to a warning message, and enabled it by default for all compiled outputs (`compile.includeBanner` still overrides per guide).

  Remove monorepo-only commands and package paths from the parent skill docs so install/usage guidance stands alone for consumers.

  Remove out-of-date references to Open alpha (0.4.0) and use NPM badges for latest release version.

## 0.5.0

### Minor Changes

- **BREAKING CHANGE: Migration to Agent Skills & Removal of `spec/`**

  We have replaced the legacy `mdcp.config.json` extension packs system and dynamic prompt fetching (`.caches/mdcp/prompts/`) with portable [Agent Skills](https://agentskills.io/). The built-in meta-prompts and workflows are now shipped as Agent Skills available locally at `.agents/skills/`.

  As an evolving standard in alpha, this is a breaking change to how prompts and agent instructions are delivered. Old configurations relying on the `prompts-mdcp-defaults` extension pack will no longer dynamically fetch the prompts. The `spec/` folder has been entirely removed, and legacy HTTP `GET` requests to these paths and `llms-index` artifacts will now result in a `404 Not Found`.

  **Update: remove `mdcp.v*.llms.txt` — prefer the skill**

  The parent Agent Skill (`npx skills add betsalel-williamson/mdcp --skill mdcp`) is the **only** supported agent entrypoint. Do **not** keep, regenerate, or hand-edit `mdcp.v*.llms.txt` bootstrap files in your docs root. On upgrade:

  1. Delete any `mdcp.v*.llms.txt` (and draft variants) from the docs root.
  2. Install or refresh the skill: `npx skills add betsalel-williamson/mdcp --skill mdcp` (or `pnpm skill:install` in this monorepo).
  3. Start agent bootstrap with `/mdcp help me get started` (not the old index file).
  4. Stop using `mdcp export` entirely (`--llm`, `--llms-index`, `--fetch`) — removed; use the skill + one-shard reads + `mdcp compile` / `mdcp check` instead.

  **Migration Guide for Early Adopters:**

  1. **Update Config**: Remove the `"extensions": { "packs": [...] }` block and the `"protocol": { "llmsIndex": { ... } }` block from your `mdcp.config.json`.
  2. **Clean Cache & Legacy Files**: Delete the legacy `.caches/` directory from your documentation root (which contained downloaded prompts and artifacts), as well as any generated `mdcp.v*.llms.txt` bootstrap files.
  3. **Handle Removed CLI Commands**: `mdcp export` (including `--llm`, `--llms-index`, and `--fetch`) is removed and exits with an error pointing at the Agent Skill and shard reads.
  4. **Install New Skills**: Run `npx skills add betsalel-williamson/mdcp --skill mdcp` to install the new parent skill directly into your repository.
  5. **Update Workflows**: Point your agents at `.agents/skills/mdcp/` (invoke `/mdcp`) rather than `.caches/mdcp/prompts/` or `mdcp.v*.llms.txt`.

  This new "vendoring" approach replaces the hidden cache directory with explicit, version-controlled files, making agent instructions reviewable in your pull requests alongside code changes.

  CI runs on pull requests to any target branch; dogfood tests no longer require the full glossary TOC in lean npm package READMEs.

  Honor `protocolVersion` in `buildLlmsIndex` output. Widen default prompts extension `protocolVersionRange` to `^0.4.0.0` so patch protocol indexes (for example `0.4.0.1`) remain compatible.

  Trim overlapping client docs: CLI README stays command-focused, core stays API-focused, and skill/agent workflow points at the Agent Skill / root README instead of duplicating it in package guides.

  Clarify QA principle **Current docs only**: durable shards describe as-built behavior; remove stale guidance (git keeps history; changesets notify consumers).

  Remove `mdcp refs lookup` and the `lookupHeadings` export. Discover shards with host search; validate cross-links with `mdcp check` / `refs list`. This is a breaking change for callers of the removed API.

  Remove the `review` task subagent (`skills/mdcp/agents/review.md`) from the MDCP Agent Skill pack.

  Security/architecture review with `REVIEW_NODE` manifests, findings ledgers, and a directed review graph is not core MDCP docs-as-code (compile / check / shards). Findings also need to land in a work tracker (GitHub Issues, Jira, Linear, etc.), and MDCP CLI does not yet model review nodes or programmatic progress tracking. We will revisit a review skill or complementary pack once tracker export and systematic review-graph support exist.

## 0.4.1

### Patch Changes

- Fix `mdcp compile` so it writes `refs.json` under `outputDir` (via `refs.registryFile`) instead of omitting the registry when guides use nested `compile.outputFile` paths. `mdcp refs-list` now works immediately after compile.

  Closes #62

  Performance (#64): compile once per `mdcp compile`/`check` (P0) and compile-scoped shard cache so each shard is read once per command (P1). Dogfood meets Tier 1–4 SLOs at ~64 shards.

  Require Node.js **>= 24.0.0** (#57). Node 22 is no longer supported; upgrade your runtime before updating these packages.

  **llms-index fetch — profile pointer indirection:** On tagged releases (e.g. `v0.4.0`), `spec/llms-index/valpha` and `vdev` are git symlinks. GitHub raw returns only the target filename (`mdcp.v0.4.llms.txt`), not the bootstrap content. `mdcp export --llms-index --fetch` now detects that response and re-fetches the versioned file under `spec/llms-index/`.

  **Consumer docs:** Day-zero bootstrap examples use `npx @bwilliamson/mdcp-cli` (there is no `mdcp` package on npm). llms-index spec artifacts synced.

  **Monorepo:** pnpm-only settings moved from `.npmrc` to `pnpm-workspace.yaml` to silence npm 11 warnings when running `npx`.

## 0.4.0-build.3

Add a "So what — how do I use this in my project?" section to npm READMEs and the root README, pointing to the getting-started bootstrap prompt and clarifying that mdcp is stack-agnostic.

## 0.4.0-build.2

Expand Why MDCP documentation in npm READMEs: scope boundaries (what MDCP does not replace), flow-state framing, and complement to checked-in prompts and playbooks.

## 0.4.0-build.1

Add Why MDCP overview to root README and compiled npm package READMEs — problem statement, alternatives comparison, adopt-today benefits, and OpenAPI-style future vision for documentation context.

## 0.4.0

### Minor Changes

- Add built-in internal link validation with BROKEN LINK markers, publish-only link policy, and publish-relative path rewriting.

  **Added:**

  - First-party link validation in `@bwilliamson/mdcp-core` — dead `.md` paths and `#anchor` fragments caught at shard and compiled-guide level
  - **`BROKEN LINK`** markers in compiled output by default (`compile.links.markBroken`) — visible prose with original shard target and broken resolved target instead of silent dead links
  - Built-in link gate in `mdcp check` (after refs, before xrefs) — enabled by default (`lint.links.enabled`)
  - Non-zero exit codes on broken links for `mdcp compile` and `mdcp check` — CI pipelines halt before downstream steps
  - Global `--warn-broken-links` flag and `lint.links.severity: "warn"` config — report `link-warn:` diagnostics but exit 0
  - **Publish-only link policy** — guides with `compile.outputFile` reject `.md` links into shard trees for unpublished guides not listed in `compile.crossGuideLinks.ignoreGuides` (`missing publish path`); `ignoreGuides` targets keep shard paths and pass validation when the file exists
  - **Publish-relative link rewriting** — per-shard `rewritePublishRelativeLinks` rebases remaining `../` file links from `sourceFile` to paths relative to the publish output (replaces bulk `publishPathRewrite` string substitution)
  - **GitHub heading slugs** — `githubSlugify` and `buildSlugRegistry` delegate to [`github-slugger`](https://www.npmjs.com/package/github-slugger) (html-pipeline `TableOfContentsFilter` algorithm); fixes anchors that previously collapsed whitespace or stripped trailing dashes
  - Manifest-first guide link index ownership — cross-guide shards attributed to owning guide, fixing publish-path rewrite collisions
  - Path-keyed `buildSectionSlugMap` — nested `index.md` shards get distinct intra-guide anchors (e.g. `compile-hooks/index.md` → `#compile-hooks--overview`)
  - Scoped guide link index — transitive shard crawl limited to compiling guides (plus glossary); out-of-tree links no longer pollute publish-path rewrite
  - Inline-code-safe link rewriters — labels containing `]` inside backticks no longer break cross-guide and publish-relative regex passes
  - Cross-publish README validation — when multiple publish outputs share `README.md`, fragment matching disambiguates sibling package links (e.g. `../mdcp-core/README.md#cross-guide-link-rewriting`)

  **Changed (breaking):**

  - Remove `compile.publishPathRewrite` — geometry now comes from per-shard resolution against `compile.outputFile`
  - `mdcp check` now fails on dead internal links without requiring `markdown-link-check` or `lint.links.config`
  - `mdcp compile` exits 1 when broken links are present unless `--warn-broken-links` or `lint.links.severity: "warn"`
  - Repo dogfood: published guides (`developer`, `client-cli`, `client-core`) use `crossGuideLinks.ignoreGuides: ["features"]` so cross-guide links keep live `docs/features/` shard paths; publish-relative rewrite rebases geometry; lint accepts those targets

  Peer `mdcp links` / `markdown-link-check` remains optional for external URL HTTP checks. Opt out of the built-in gate with `lint.links.enabled: false`.

  Add opt-in compile output backup before overwrite.

  **Added:**

  - Global `--backup`, `--backup-dir`, and `--backup-ext` CLI flags
  - Optional top-level `backup` config object (`enabled`, `dir`, `ext`) — CLI flags override config
  - `writeOutputFile` in `@bwilliamson/mdcp-core` — when enabled, moves existing compile or export targets to `{outputDir}/.caches/backups/` (docsRoot-relative mirror path) before writing

  Default behavior is unchanged: `mdcp compile` and `mdcp export` overwrite existing output files. Use `--backup` or `backup.enabled` when working outside version control or before overwriting publish paths such as `README.md`.

  Replace `reviewLinks` compile hook with assembly-time `compile.crossGuideLinks.ignoreGuides`.

  **Changed (breaking):**

  - Remove `reviewLinks` from the default compile hook pipeline
  - Remove `hooksConfig.reviewLinks` and `targetMonolith`
  - Unified output layout: `--cwd` → **`--docs-root`**; default `outputDir` **`_build`**; guide shards under **`{docsRoot}/{name}/`**; per-guide outputs default to `{name}.md`; monolith opt-in via top-level `outputFile`; refs at **`.caches/refs.json`**
  - Legacy bash/Python scripts (`compile_sections.py`, `validate.sh`, etc.) replaced by `@bwilliamson/mdcp-core` and `mdcp check`

  **Added:**

  - `compile.crossGuideLinks.ignoreGuides` on the compiling guide — cross-guide links to listed guides keep source `.md` shard paths instead of rewriting to monolith `#slug` targets

  Cross-guide link rewriting remains automatic at assembly from `compileOrder` and per-guide `compile.outputFile`. Multi-output layouts route each link to the correct compiled document by default.

  Sharded glossary layout and compile manifest scope behavior (docs dogfood; protocol 1.0 glossary profile).

  **Changed:**

  - `compile.scopeRoot` limits **transitive** shard crawl only — it no longer filters manifest links on the compiling guide's own `index.md`
  - Co-compiled glossary shards: `rewriteIntraGuideFileLinks` resolves same-output `.md` links by shard basename (e.g. `./gfm.md` → `#gfm` when glossary terms are stitched into a publish output)

  **Docs:**

  - Glossary terms are one shard per entry; sub-index manifests (`index-protocol.md`, `index-format.md`) group entries for large glossaries
  - Guides that stitch glossary set `compile.scopeRoot: "glossary"` and link `../glossary/index.md` from the guide manifest

  Add `mdcp export --llms-index` to generate a versioned agent bootstrap file (`mdcp.v0.4.llms.txt`, protocol 0.4.0.0) in the docs root. Config gains `protocolVersion` and flat `protocol.profile` / `protocol.ref` (optional `protocol.repo`, `protocol.path`, `protocol.llmsIndex.outputFile`) for `--fetch`.

  `mdcp export --llms-index --fetch` pulls the canonical bootstrap from `spec/llms-index/` on GitHub — `valpha` (open alpha), `vdev` (draft), or `--fetch-ref` for pinned tags. Draft files use `mdcp.v{n}--draft.llms.txt` until adopted. `vstable` is reserved for npm 1.0.0.

  **Removed before 0.4.0 publish (no backward compat):** `protocol.fetch`, `protocol.source`, `export.llmsIndex.upstream`, `export.llmsIndex.outputFile`, `extensions.protocolVersion`, `extensions.defaultSource` — use flat `protocol.*` fields and root `protocolVersion` instead.

  ## 0.4.0 — first open alpha

  First public alpha release for external testers. MDCP is pre-1.0: **no API stability guarantee** — pin `@bwilliamson/mdcp-cli@0.4.0` and read changelogs before upgrading.

  **Since 0.3.0 (breaking changes allowed in 0.x):**

  - Built-in link validation, BROKEN LINK markers, publish-relative rewriting, GitHub slug algorithm
  - Cross-guide link assembly via `compile.crossGuideLinks.ignoreGuides` (replaces `reviewLinks` hook)
  - Unified output layout (`--docs-root`, `_build`, per-guide outputs)
  - Sharded glossary manifest and compile scope behavior
  - `mdcp export --llms-index` and `--fetch` for versioned agent bootstrap
  - Opt-in compile output backup (`--backup`, `backup` config)

  **Protocol:** npm 0.4.0 implements the **draft** protocol profile (`0.4.0.0`, `mdcp.v0.4.llms.txt`). First published llms-index spec. Pre-0.4 doc-style and compile evolution is recorded in this release batch's sibling changesets (`.changeset/*.md`) and existing package changelogs — not in prior `spec/llms-index/` artifacts. Use `mdcp export --llms-index --fetch --fetch-profile dev` for the in-progress bootstrap. Stable artifact promotion waits for npm 1.0.0.

  **Removed config fields (0.4.0 alpha):** `protocol.fetch`, `protocol.source`, `export.llmsIndex.upstream`, `export.llmsIndex.outputFile`, `extensions.protocolVersion`, `extensions.defaultSource` → flat `protocol.profile` / `protocol.ref` (+ optional `repo`, `path`, `protocol.llmsIndex.outputFile`). Extension manifests: `minProtocolVersion` / `maxProtocolVersion` → `protocolVersionRange` only.

  Feedback welcome via GitHub Issues before the 1.0 stable release.

## 0.3.0

### Minor Changes

- Enable built-in compile hooks by default (`stripAnchors`, `codeEvidence`, `inlineInserts`, `reviewLinks`). Omit `guides[].compile.hooks` for the common case; opt out per hook with an object (`{ "codeEvidence": false }`) or replace the pipeline with a string array. Previously, every hook had to be listed explicitly on each guide.

  Expand the published npm README with LLM collaboration prompt templates.

  The compiled `packages/mdcp-cli/README.md` now opens with developer pain and which mdcp commands address it, plus docs-first feature workflow (tracker scope, feature and client shards, TDD), task-type prompts, and getting-started setup. Standalone copy-paste files live under `examples/prompts/`.

  Rename the MDCP expansion from Markdown Command Line Interface Processor to MarkDown Context Protocol.

  User-facing updates include npm package descriptions, `mdcp --help` text, and the compiled CLI README opening. The new name reflects mdcp as a protocol for repository documentation context — not only a CLI wrapper.

  Restructure the published npm README for LLM-first adoption.

  The compiled `packages/mdcp-cli/README.md` now opens with a value proposition for coding agents, the copy-paste bootstrap prompt (within the first ~80 lines), and follow-up prompt templates. Install, config, and command reference content is unchanged but moved below agent onboarding.

  **What changed:** shard order in `docs/client-cli/` — new `why-mdcp-for-agents.md` opening shard; `llm-collaboration.md` leads with bootstrap and follow-up prompts; glossary and reference sections compile later in the README.

  **Old behavior that no longer applies:** the npm README previously opened with install/quick start and placed the bootstrap prompt ~370 lines down under LLM collaboration. Deep links to `#llm-collaboration` still resolve; the bootstrap anchor is now `#bootstrap-prompt-copy-paste` near the top.

  Document preprocessor and templating as intentionally out of scope.

  MDCP does not run variable substitution, template engines, or macro-style transforms on shard source. Compile hooks remain documentation-assembly transforms on [authored GFM](https://github.com/Merlon-Docs/merlon/blob/main/docs/glossary/authored-gfm.md) — not a substitute for Handlebars, Nunjucks, or similar.

  **Consumer guidance:** wire optional stages as `preprocess → mdcp compile / check → postprocess` in your repo. There is no behavior change to compile or hooks; this release clarifies boundaries that were previously implicit.

## 0.2.0

### Minor Changes

- b42ea7b: Compound consumer migration parity release (closes #19).

  **Breaking changes:**

  - `outputDir` default `.` → `_build`
  - Guide shard dir `{outputDir}/{name}` → `{docsRoot}/{name}`
  - Default compile output: monolith `guides.md` → per-guide `{name}.md` (or `guide.md` when one guide)
  - Monolith is opt-in via top-level `outputFile`
  - `refs.registryFile` default `refs.json` → `.caches/refs.json`
  - CLI `--cwd` removed; use `--docs-root`
  - `mdcp sections` and `sections.txt` removed — compile order from manifest links (`compile.sectionsHeading` when needed)
  - All generated paths resolve under `outputDir` unless absolute

  **Added:**

  - Compile hooks: `inlineInserts` (diagram/table/figure inlining), `codeEvidence`, `reviewLinks` with cross-guide link rewriting
  - In-scope shard lint and Vale prose (`guideScanDirs`, optional `lint.markdownlint.shardsGlobs`)
  - `vale.strictMinAlertLevel` config; directory shard source support in `mdcp shard`

  **Fixed:**

  - CLI `--config` resolves from invocation directory, not docs root
  - `refs.registryFile` no longer double-joined with `outputDir`
  - Blank line after injected compile title

  **Migration:** preserve pre-0.2.0 layout with explicit `"outputDir": "."`, `"outputFile": "guides.md"`, `"refs": { "registryFile": "refs.json" }`. See `docs/client-cli/consumer-migration.md`.

## 0.1.5

### Patch Changes

- Version sync for release; no library API changes.

## 0.1.4

### Patch Changes

- Split intra-guide and publish-path link rewriting: intra-guide `./section.md` links rewrite on every compile; `compile.publishPathRewrite` drives repo-root path rewrites for publish outputs. Fix `compileGuides` to return an empty string when all guides have `outputFile`. Export `GuideConfigInput`, `MdcpConfigInput`, and `CompileOptionsInput`.

## 0.1.3

### Patch Changes

- fc5719b: Add LLM collaboration guide for agent workflows, bootstrap prompt, and Cursor agent rule. Recompile repository docs and package READMEs.

## 0.1.2

### Patch Changes

- Support mixed monolith and per-guide publish outputs: guides with `compile.outputFile` write to a separate path and are excluded from the monolith; guides without `outputFile` still compile into `guides.md`. Add optional `compile.includeBanner` per guide (defaults to false when `outputFile` is set).

  `mdcp sections` now writes guide-relative paths in `sections.txt` (regenerated from `index.md`) instead of absolute filesystem paths.

## 0.1.1

### Patch Changes

- Rename packages to the `@bwilliamson/mdcp-*` npm scope and add registry READMEs for CLI, core, and presets.
