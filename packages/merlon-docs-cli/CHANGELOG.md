# @merlon-docs/merlon-docs-cli

## 1.0.0-draft.0

### Major Changes

- 5ab62e8: This is the 1.0 draft of Merlon Docs. The CLI, the core library, the presets and the Agent Skills publish as `1.0.0-draft.N` prereleases under the npm `draft` tag. Install the newest draft with `npm install @merlon-docs/merlon-docs-cli@draft`. The interfaces can still change between drafts. 1.0.0 is the first release with a stability guarantee, and from 1.0.0 on a breaking change needs a major version.

### Minor Changes

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

- 9bc05cd: Add `merlon review`, a report-only command that flags documentation sprawl across guide shards: index groups with too many shard links (`index-size`), shards with too many prose words (`long-shard`), paragraphs repeated in two or more shards (`duplicate-paragraph`), and shards in one guide that share a title (`similar-titles`). Each finding names the files and a fix. Use `--json` for machine-readable output, `--strict` to exit 1 when there are findings, and `--guide <name>` to review one guide (duplicates shared with other guides included). Tune thresholds with the new optional `review` config object (`maxIndexEntries`, `maxShardWords`, `minDuplicateWords`); paths in `scan.ignore` are skipped. Core exports `reviewDocs` and `formatReviewReport`.
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

- 58452d2: MDCP (MarkDown Context Protocol) is now Merlon Docs. The packages publish as `@merlon-docs/merlon-docs-cli`, `@merlon-docs/merlon-docs-core` and `@merlon-docs/merlon-docs-presets`, and the CLI command is `merlon`. The Agent Skill installs as `merlon-docs` with `npx skills add Merlon-Docs/merlon --skill merlon-docs`, and the archetypes are `merlon-docs-arch-*`.

  The config file is `merlon.config.json`. Until 2.0.0, a CLI run that finds `mdcp.config.json` and no `merlon.config.json` upgrades the project itself. It writes the config to `merlon.config.json` with `protocolVersion` renamed to `standardVersion`, deletes `mdcp.config.json` and prints a notice. The illustrative-paths marker is `<!-- merlon-paths: illustrative -->`, and the former `mdcp-paths` spelling still works until 2.0.0.

  The Vale style is `MerlonDocs`, so a rule reads `MerlonDocs.DatedClaim`. Compiled outputs carry `<!-- merlon-shard: … -->` markers. In the core API the config types are `MerlonConfig`, `MerlonConfigInput` and `MerlonConfigSchema`, and the `Mdcp*` names stay as deprecated aliases until 2.0.0.

  To migrate a project, install the new packages, run any `merlon` command once to upgrade the config file, and change `MDCP` to `MerlonDocs` in `.vale.ini`, in `<!-- vale MDCP.… -->` comments and in the `StylesPath` link to the presets.

- 9bc05cd: Validate source-file link targets and link-lint standalone guides

  `merlon check` now fails on a link whose target names a source file that does not
  resolve, in shard sources and in compiled output. Previously any target not
  ending in `.md` was skipped, so a link to a deleted module passed the gate
  indefinitely.

  Files registered under `standaloneGuides` are now link-linted with the same
  checks a shard gets. They are never compiled, so no phase read their links
  before; the docs already claimed they were validated.

  Targets that name no resolvable file class — a bare word, a directory path —
  stay unvalidated.

- 9bc05cd: `merlon prose` and `merlon check` run Vale over the files that `standaloneGuides` registers, as well as the guide directories. They add the standalone files when `vale.scanGlobs` is set too, because that setting replaces only the guide directories. Each standalone guide is linted once, even when it is inside a scanned directory or two `standaloneGuides` entries match it. The exception is a guide that a scanned directory also reaches through a symlinked subdirectory, which Vale lints under both names.

  Vale gets absolute paths in every setup. Vale runs from the docs root, so when `vale.scanGlobs` is unset and a guide has no `guides[].path`, a relative `--docs-root` such as `docs` used to give Vale `docs/<guide>`, which resolves nowhere from there. When that was Vale's only path, Vale read it as text and passed without linting anything. With any other path next to it, such as a second guide, Vale stopped with a runtime error. Those guide shards are linted now in both cases, so expect new alerts from them as well as from the standalone guides.

  When `vale.scanGlobs` is unset and a guide has no `guides[].path`, `--docs-root .` used to give Vale relative paths such as `guide`, so a relative `.vale.ini` section such as `[guide/*.md]` matched. That section stops matching now. The files it named get the settings of the Markdown section, such as `[*.md]`, instead, and Vale prints absolute file paths. Start such a section with `**/`, as in `[**/guide/*.md]`, which matches before and after this change.

  With Vale installed, `merlon check` and `merlon prose` fail after this upgrade, with or without `--require-vale`, when a standalone guide or a newly linted shard breaks an error-level Vale rule. A `vale.scanGlobs` entry for a missing path, such as a glob, can fail them too, because Vale does not expand globs. When a missing path is Vale's only argument, Vale reads it as text and passes without linting anything. With more than one path, as when standalone guides are added, a missing one stops Vale with a runtime error. `merlon check` points a runtime error at `.vale.ini` and `vale.scanGlobs`, and points alerts at the opt-out below.

  To keep Vale off one file, such as vendored text, give it a section at the end of `.vale.ini`, after every section that matches the file, such as `[*.md]` or `[*.{md,mdx}]`:

  ```ini
  [**/CODE_OF_CONDUCT.md]
  BasedOnStyles =
  ```

  Start the section with `**/`, because Merlon Docs passes Vale absolute paths, and a section such as `[CODE_OF_CONDUCT.md]` never matches. A rule that an earlier section sets by name, such as `MerlonDocs.DatedClaim = warning`, stays on until this section sets it to `NO`. The CLI README's "Opt a standalone guide out of Vale" section has the full example.

  `standaloneGuides` globs match without the coverage scan's ignore list, so a broad glob such as `**/README.md` also sends files under `node_modules` to Vale. List narrower globs.

### Patch Changes

- 9bc05cd: The CLI README links the new Check gate spec in the features guide, which lists the `merlon check` stages in order and says which ones stop the run. The command summary row for `merlon check` no longer gives a stage list. That list left out the path stage and called coverage non-fatal, though coverage fails the run under `scan.strict: true`. The daily workflow section and the consumer verification checklist link the spec instead of listing stages. The checklist's `--require-lint` item says that the flag requires markdownlint-cli2 for each configured markdownlint stage, the compiled one included. The README also says that coverage under `scan.strict: true` stops the run before the failure summary prints. The optional linters section says that `merlon links` exits 1 when the config sets neither `lint.links.target` nor top-level `outputFile`. With a target set, the command prints an info line and exits 0 when markdown-link-check is missing, where the section said it skips quietly.
- 3ef9c5e: The CLI README's Config essentials section keeps `--config` vs `--docs-root`, Minimal config and Path layout. Its reference material, Feature settings, Config key map, Review thresholds, Schema-only fields and Full schema and sample config, now sits in a Config reference section after Commands reference, and Shared glossary is its own section after Config essentials. The moved headings keep their anchors in the compiled README, and links into it still resolve. In the Merlon Docs repository, the shards are `docs/client-cli/config-reference.md` and `docs/client-cli/shared-glossary.md`.

  The core README's Compile API links Feature settings in Config reference.

- 1f7c2d8: The CLI README's Cross-links and refs says a standalone guide's headings are in the refs registry only when a guide stitches the file through its manifest or a `compile.scopeRoot` walk, and links Standalone guide behavior as the owner, where it said compile never writes those headings. Config essentials states the `--config` vs `--docs-root` rule once, and Global options in Commands reference and the Quick start link it instead of restating it. Each package README's Stability section opens with one sentence that says what can change before 1.0.0 and links the pre-1.0 policy. The CLI README's section also keeps the advice to read the changelog and release notes before upgrading, and the core README links it.
- 7cb8fd6: CLI README fixes from a doc review. Quick start begins with the minimal config. Once markdownlint-cli2 and the presets are installed, it shows the config again with the `lint` key that lints shards with the presets' shard config, and Config essentials' Minimal config keeps the field table and links that block. It says to fail CI on `git diff --exit-code` after `merlon compile` when a repository commits compiled outputs, because `merlon check` writes every output again and passes on a stale one. Its check commands pass `--skip-vale` until Vale is set up, because `merlon check` runs Vale whenever it finds `vale`, and Vale fails when the `.vale.ini` that `vale.config` names is missing. The verification checklist now ends Install and quick start. Requirements says the CLI needs Node.js 20.19.0 or later. Consumer migration documents the top-level `source` and each guide's `source`, which `merlon shard` needs, under `#map-the-document-to-guides`. It says to set `demoteFirstH1` on every `merge` part after the first, because a later part that keeps its H1 loses that heading and the text before its first `##` heading. It says `merlon shard` starts a new shard at each `##` heading whatever a guide's `splitLevel` says, and writes each guide to the directory named after the guide, ignoring `guides[].path`. A `directory` source's `path` must be outside the guide's own directory, because `merlon shard` deletes that directory first. Compile ignores the `compile-order.txt` file from `merlon shard`. It also documents a source's optional `preamble.promoteToH2`, which `merlon shard` reads from the first guide only.

  Config essentials states one rule for `compile.outputFile`, top-level `outputFile` and `refs.registryFile`. Each one resolves from `outputDir`, unless it is absolute or already lands inside `outputDir` when read from the docs root. A relative backup directory has no such exception. It also says that `--docs-root` defaults to the directory the command runs in, and its new Config key map section lists the page that documents each config key, with the core Compile hooks index beside Default compile hooks for `compile.hooks`. `protocolVersion` is listed as a schema-only field, and a new last section, Full schema and sample config, links the JSON Schema file and the sample guides' config. The table of peer tools in Optional linters gains an `merlon check` row. The page says Merlon Docs looks for `vale` in `node_modules/.bin` before `PATH`, names `lint.markdownlint.shardsConfig` and `lint.markdownlint.compiledConfig` and says their paths are read from the docs root. It says the shard pass takes its scope from the CLI and the compiled pass from the compiled config's `globs`, and that a relative `lint.links.target` is read from the docs root. It says `merlon fix` needs a markdownlint-cli2 config that lists `globs` and always exits 0. Project layout says `shards.md` is a manifest only when `compile.manifest` names it. Why Merlon Docs for coding agents moved into Get started, and the stitched glossary terms follow a Terms in this guide heading that links each one.

  These CLI README anchors are gone. Use `#repo-root-npm-scripts` in place of `#agent-integration`, and `#config-key-map` in place of `#compile-hooks-and-multi-guide-links`. `#end-user-value`, `#registry-location` and `#workflow` merged into the Compile and the refs registry section and Cross-links and refs.

  The core README links the pre-1.0 policy from Stability, and links the CLI README's Path layout where it describes how compiled outputs and the refs registry resolve. It says backup paths don't use `resolveUnderOutputDir`. Shard and peers links Consumer migration for where `merlon shard` splits a guide, where it said the split falls at `splitLevel`.

- 962de8e: The CLI README's glossary entry for the monolith states when compile writes it: when the config sets top-level `outputFile` and at least one guide in `compileOrder` has no `compile.outputFile`.
- 121b168: The CLI README's Stability section no longer ends with a Get involved block. That block asked readers to star and share the repository, open issues and join an outside community. The call to action is in the repository README, and the npm README has none. The `#get-involved` anchor is gone, and the lint install lines that sat under it are in Optional linters.
- 74ff628: The CLI README states what compile does with the preamble shard's heading once, in the `about-this-guide.md` row of Project layout. Consumer migration links that row where it said the shard is stitched without its heading.
- ec1d959: The CLI README's Coverage in check and Cross-links and refs link Standalone guide behavior in the features guide's new Standalone guides page, which now holds what compile, the refs registry, link validation, Vale, markdownlint and `merlon fix` do with a registered file. The coverage scan page keeps the scan itself.
- 1fdeec7: In the CLI README, the Command summary lists `merlon refs-gen`, `merlon refs-check` and `merlon refs-list` in one row that points at Refs subcommands, which keeps the per-command descriptions. The table in Why Merlon Docs for coding agents heads its third column What helps, because one row gives a reading habit and another a package. The `merlon prose` row in Optional linters says the command runs the Vale styles your `.vale.ini` names, and the row no longer gives a style package as an example.
- 9bc05cd: README cleanup. The CLI README explains in one section, "Not the Agent Skill", how the CLI, the core library and the Agent Skill differ. The "LLM collaboration" and "Agent Skill (related)" sections that repeated it are gone. The core README folds its Overview section into About.

  Deep links to the CLI README's `#llm-collaboration` and `#agent-skill-related` anchors no longer resolve, so point them at `#not-the-agent-skill`. The core README's `#overview` anchor is gone too, and its content is now under `#about-merlon-docsmerlon-docs-core`.

  Both READMEs now put their related packages, further reading and license after the guide sections, just before the glossary. In the CLI README these sat inside the Agent integration section, and in the core README they came before the API sections. The related packages are a list instead of a table, and the presets entry describes the Merlon Docs Vale style as well as the markdownlint configs. The `#related-packages`, `#further-reading` and `#license` anchors don't change.

  The CLI README says once, in the `refs` glossary entry, that refs check links and do not find documents. Other CLI sections no longer repeat it, and the command reference links to that entry. The `refs` and `refs registry` glossary entries use the registered command names `merlon refs-gen` and `merlon refs-check`, and the config table calls `refs.registryFile` the refs registry file instead of a lookup table.

  The CLI README gives the output layout and its defaults once, under "Path layout" in Config essentials. Project layout and Consumer migration link there instead of repeating the outputs table, so links to `#generated-output-outputdir-default-_build` or `#output-layout` should point at `#path-layout`. Config essentials renames "Guide = one subdirectory" to "Resolution bases", and the refs registry section renames its own "Path layout" heading to "Registry location", so the README has one "Path layout" heading. In the core README, the Config API section says which defaults `loadConfig` fills and links to Config essentials for the output layout instead of listing it.

  Config essentials gives the minimal config and its top-level field table their own "Minimal config" section. They used to sit under "Link validation" and read as part of it. The "Opt-in output backup", "Link validation" and "`sectionsHeading`" subsections are gone. A new "Feature settings" section lists the default of each link, path and backup key, and links to the feature spec that explains each key. Links to `#opt-in-output-backup`, `#link-validation` or `#sectionsheading` should point at `#feature-settings`.

  The CLI README's Consumer migration section is now about moving an existing document into shards. Its "Steps for a new consumer repo" are gone: the Quick start already had the config and repo-root commands, and it now ends with adding the `docs:compile` and `docs:check` scripts (with `--require-lint`) and running them in CI. Links to `#steps-for-a-new-consumer-repo` should point at `#quick-start`. The manifest section is one paragraph that links to the Manifest compile order spec. The pointer to upgrade notes moved to Stability. The core README's Stability section now asks for the changelog and release notes of each Merlon Docs package you use, in the same words as the CLI README.

- 40e2570: The core README keeps the API reference and what a hook author or config author uses: the compile hooks overview, the extension pattern and each built-in hook. The compile pipeline specs moved to a Compile pipeline group in the Features Guide, under `docs/features/compile-pipeline/`. The group lists Link passes, Path lookup order, Cross-guide link rewriting, Publish-relative link rewriting and Tables after link rewriting, and the core README links them. Its `#link-passes`, `#path-lookup-order`, `#guidedir-misaligned-with-shard-tree`, `#cross-guide-link-rewriting`, `#publish-relative-link-rewriting` and `#tables-after-link-rewriting` anchors are gone, with the anchors of their subsections. A link to one of them should point at the same heading in the moved shard. The guideDir section is now Guide directory apart from its shards, in Path lookup order. The move also renamed or dropped these subsections. In Cross-guide link rewriting, the section with the old anchor `#cross-guide-purpose` is now Guide link index, so a link to it should point at `cross-guide-links.md#guide-link-index`, and its dead-anchor and wrong-heading limits are under `#link-index-limits` there. The section with the old anchor `#default-_build-outputs-and-transitive-targets` is gone, since it didn't add a rule, and a link to it should point at `#same-compiled-output-preference`, the rule it pointed at. In Publish-relative link rewriting, the section with the old anchor `#why-this-pass-exists` is now Shard-relative paths and the one with `#repo-dogfood-examples` is now Examples from this repository, so a link to them should point at `publish-relative-links.md#shard-relative-paths` and `publish-relative-links.md#examples-from-this-repository`. The group also has a Fence scan shard and a Section slugs shard, split from the stripAnchors spec and the cross-guide spec.

  The CLI README links the moved shards where it linked those core README sections.

- 9bc05cd: Use "compiled guide" for the file compile writes for one guide, and keep "monolith" for the optional top-level `outputFile`. The `merlon compile` help text now reads "Stitch shards into compiled guides". The `ignoreGuides` type docs now say that links to a listed guide's shards keep source `.md` paths instead of `#slug` targets in the file that holds the target guide. The `standaloneGuides` schema description now says a standalone guide doesn't get compile output of its own. The `merlon shard` help text now reads "Split a source document into shards (md-tree)". The `merlon-docs` skill's context guardrails tell agents not to load whole compiled output (a compiled guide or the monolith). The product docs site archetype skill now says "one large file" instead of "monolith" for an oversized authoring tree.
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

- 08dd72e: The core README's API sections are titled Config API, Compile API, Refs and validation API, and Shard and peers API. Their anchors are now `#config-api`, `#compile-api`, `#refs-and-validation-api` and `#shard-and-peers-api`, and a link to one of the old `#api--` anchors should use the new one. The CLI README's link to the config API uses the new anchor.
- 04a4407: The core README links each rule's owner instead of restating it. Config API and the compile hooks overview link Default compile hooks in the Features Guide for the forms `compile.hooks` takes. The overview's "Opt out per hook" and "Explicit override" subsections are gone, so links to `#opt-out-per-hook` or `#explicit-override` should point at that spec's Configuration section. The rule for the strip after stitching is stated once, under "stripAnchors purpose".

  The Config API summary gives the `ignoreGuides` exception in one clause that links the glossary entry, and the glossary entry, which each README stitches, links the two rules behind it. A link to a shard the compiling guide stitches can still take its in-document anchor. Same compiled output preference says when the cross-guide pass gives it one, and `ignoreGuides` interaction says when the intra-guide pass does, for a `./` or bare link. The CLI README now stitches the `ignoreGuides` glossary entry, which its consumer migration steps link. Config API links Source tags and default banner for the per-guide banner and source tag keys, and Config essentials for the base of each generated path. Compile API says what `knownSlugs` and `monolithKnownSlugs` hold and links the BROKEN LINK marker spec for the fragments that pass.

  The core README no longer links the monolith glossary entry, which led to a chain of doc-authoring terms, so it stitches three glossary entries where it stitched fifteen. Compile API defines the monolith in one sentence instead.

- 9bc05cd: The coverage section of the README now says the scan does not follow symbolic links, so a `standaloneGuides` entry whose path is a symlink is reported as missing. Register the file the link points to.
- a922454: Drop the npm keyword `mdcp` from the CLI and presets packages. The old name stays only on the compatibility aliases that a project still needs: `mdcp.config.json` upgrades to `merlon.config.json` until 2.0.0, `protocolVersion` still fills `standardVersion`, the `MdcpConfig` names stay as deprecated exports, and `<!-- mdcp-paths: illustrative -->` is still read.
- 3b4eb6f: Doc review corrections in sections that the READMEs stitch. The `orphan` entry in both READMEs links the new Orphan check scope section of the Manifest compile order spec, which says what the check reports and which files it doesn't read. The entry's second paragraph restated that scope and is gone.

  In the CLI README, the `refs registry` entry says that `merlon compile`, `merlon refs-gen` and `merlon check` rewrite `refs.json` from their own compile, and that only `merlon refs-check` fails on a stale file, as the new Stale registry check section of the Refs registry path spec says. It used to say that `merlon check` verifies the registry against the latest compile, which can't fail because `merlon check` writes the file first. The `refs` entry there drops "via `merlon check`" from its check refs row and links the registry entry from its own row.

  Both READMEs link the backup path layout in the Compile output backup spec instead of restating where `--backup` puts a prior output. The CLI README said prior output sits under `backups/`, but the backup of a publish output outside the docs root climbs out of that directory.

  The `locale pack` entry in both READMEs and the `authored GFM` entry in the core README now have lowercase titles, like the other common-noun glossary entries. Their anchors are unchanged.

- 9bc05cd: The guide tier glossary entry in both READMEs links only to Default guide layout in the Merlon Docs 1.0 spec, which now holds the placement test as well as the four tiers.
- 9bc05cd: Cross-guide link rewriting, `docs/features/compile-pipeline/cross-guide-links.md` in the Features Guide's Compile pipeline group, now states how `compile.crossGuideLinks.ignoreGuides` and same compiled output preference interact. Compile behaves as before.

  A link to a shard that the compiling guide stitches takes the in-document anchor when the shard's owner in the guide link index is non-canonical, even when the compiling guide lists that owner in `ignoreGuides`. A non-canonical owner is only the first guide in `compileOrder` whose walk reached the shard. A `../` link to a shard whose canonical owner is listed keeps its shard path. A `./` or bare link to such a shard still takes the in-document anchor through the intra-guide pass when the compiling guide stitches the shard. The matching rules and the exclusions list read as if every link to a listed guide kept its shard path, and now link the precedence rule. The `ignoreGuides` summaries in the core README's Config API section, in the features overview and in the CLI README's consumer migration steps give the exception in one clause and link the glossary entry, which links both rules. The `compile.crossGuideLinks.ignoreGuides` section links both rules too. The type docs of `AssembleGuideOptions.ignoreGuides` and `CrossGuideLinkRewriteOptions.ignoreGuides` now name the same exceptions.

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

- 9bc05cd: README corrections from a doc review: the CLI README documents the `--backup` options, `refs-list --format`, the `lint.codeExtensions`, `lint.dataExtensions` and `lint.paths.*` config keys, and the registered `refs-gen`/`refs-check`/`refs-list` names. Code examples that showed empty code where a heading id was stripped now render. The core README lists `computeCoverage` and `probeDocumentPaths`.
- 01b6d2b: The config key for the version of the Merlon Docs standard is now `standardVersion`, defaulting to `1.0.0-draft.0` with the 1.0 draft line (replacing the former `0.5.0.0` label and `protocolVersion` name). A config that still sets `protocolVersion` keeps working until 2.0.0: `loadConfig` and the new `parseConfig` copy its value to `standardVersion`, and they fail when the two keys hold different values. A parsed config still has `protocolVersion`, set to the same value. The JSON schema marks `protocolVersion` as deprecated.

  The copyright line in each license now reads Merlon Docs. Code comments, the JSON schema and the docs now call the specification "the standard". The presets README now refers to the `MerlonDocs` Vale style, which the rename had missed.

- 9bc05cd: Keep `{#id}` examples inside code when compile strips anchor markers

  `stripExplicitAnchorMarkers`, which backs the `stripAnchors` hook and the post-stitch strip, removed every `{#id}` marker in the document. When a guide quoted the syntax in an inline code span, the span compiled to an empty pair of backticks, and a fenced example lost its ids too. The strip now keeps a marker inside an inline code span or a fenced code block.

  Heading lines keep the old rule. A line that parses as an ATX heading at column 0 loses every marker, even inside a fence or a code span. Merlon Docs computes heading slugs from titles with every marker removed. Stripping the whole line keeps the compiled heading on the slug that refs and rewritten links use, however a fence is read. To show the syntax on a heading inside a fenced example, start the heading line one to three spaces in. Merlon Docs doesn't read that line as a heading, so it keeps its marker.

  Fences are found line by line. A fence counts when it starts at most three columns in, measured from the text of the innermost list item around it, or right after a list marker, and the scan doesn't read blockquotes or HTML. It misses a fence behind `>`. A marker in such a fence still goes unless a code span on its line holds it. Code spans are paired within each line, so a span that wraps onto the line, or a backslash-escaped backtick before it, can shift the pairing. A shifted pairing can drop a quoted marker or keep a prose one.

  The strip itself works line by line too. It trims whitespace only on the marker's own line, so a marker that opens a paragraph leaves the blank line above it in place. When a marker opens a line's text, the whitespace after it goes instead, and the line keeps its indent. The strip still drops a line that contains only a marker. With the markers on separate lines, the time grows linearly with the document.

  `merlon compile` output changes the same way. The CLI and core READMEs quote the syntax again, and the core README gives `stripAnchors` its own section, which states the heading-line and code rules. Fence scan, `docs/features/compile-pipeline/fence-scan.md` in the Features Guide's Compile pipeline group, states the fence reading and its limits.

- 9bc05cd: Honor `vale.strictMinAlertLevel` in `merlon check` and stop hiding warnings in `merlon prose`

  `merlon check` always ran Vale with `--minAlertLevel=error` and ignored `vale.strictMinAlertLevel`. It now passes that setting, which still defaults to `error`, and so does `merlon prose --strict`. A plain `merlon prose` passed `vale.strictMinAlertLevel` (default `error`) whenever the config had a `vale` block, so by default it hid every warning and suggestion. It now passes no level, and the `MinAlertLevel` in `.vale.ini` decides what it shows. The setting now applies only to strict runs. If you set it below `error` to see more in a plain `merlon prose`, set `MinAlertLevel` in `.vale.ini` instead.

  Exit codes are unchanged. Of Vale's alerts, only error-level ones make it exit non-zero. A lower level adds alerts to the output and doesn't fail either command.

  The README's Vale section also names the new `MerlonDocs.DatedClaim` rule of the `MerlonDocs` style.

- Updated dependencies [d4d05ac]
- Updated dependencies [9bc05cd]
- Updated dependencies [3ef9c5e]
- Updated dependencies [1f7c2d8]
- Updated dependencies [7cb8fd6]
- Updated dependencies [9bc05cd]
- Updated dependencies [1966720]
- Updated dependencies [9bc05cd]
- Updated dependencies [9bc05cd]
- Updated dependencies [9bc05cd]
- Updated dependencies [40e2570]
- Updated dependencies [9bc05cd]
- Updated dependencies [9bc05cd]
- Updated dependencies [9bc05cd]
- Updated dependencies [9bc05cd]
- Updated dependencies [08dd72e]
- Updated dependencies [d19b745]
- Updated dependencies [42c9fef]
- Updated dependencies [426dbe5]
- Updated dependencies [04a4407]
- Updated dependencies [bb3dd57]
- Updated dependencies [ea7bbec]
- Updated dependencies [f9a11eb]
- Updated dependencies [9bc05cd]
- Updated dependencies [9bc05cd]
- Updated dependencies [3b4eb6f]
- Updated dependencies [196e879]
- Updated dependencies [9bc05cd]
- Updated dependencies [9bc05cd]
- Updated dependencies [2970371]
- Updated dependencies [9bc05cd]
- Updated dependencies [dc99eac]
- Updated dependencies [5951064]
- Updated dependencies [9bc05cd]
- Updated dependencies [9bc05cd]
- Updated dependencies [62c885c]
- Updated dependencies [9bc05cd]
- Updated dependencies [9bc05cd]
- Updated dependencies [5ab62e8]
- Updated dependencies [9bc05cd]
- Updated dependencies [9bc05cd]
- Updated dependencies [9bc05cd]
- Updated dependencies [9bc05cd]
- Updated dependencies [9bc05cd]
- Updated dependencies [5fe1d37]
- Updated dependencies [9bc05cd]
- Updated dependencies [9bc05cd]
- Updated dependencies [9bc05cd]
- Updated dependencies [9bc05cd]
- Updated dependencies [58452d2]
- Updated dependencies [9bc05cd]
- Updated dependencies [08c56ac]
- Updated dependencies [7ad6950]
- Updated dependencies [9bc05cd]
- Updated dependencies [9bc05cd]
- Updated dependencies [01b6d2b]
- Updated dependencies [9bc05cd]
- Updated dependencies [9bc05cd]
- Updated dependencies [9bc05cd]
  - @merlon-docs/merlon-docs-core@1.0.0-draft.0

## 0.7.6

### Patch Changes

- Updated dependencies [95a0120]
- Updated dependencies [9039614]
- Updated dependencies [a9342ce]
  - @bwilliamson/mdcp-core@0.8.1

## 0.7.5

### Patch Changes

- 715047b: Ship the `MDCP` Vale style (en-US unlinked heading-mention prose) from `@bwilliamson/mdcp-presets`, keep compile-time locale strings in mdcp-core (BCP 47 JSON + shared formatters), document Pandoc ID removal as dogfood Vale (`MDCP-PandocId`), keep slugify language-agnostic, and document GFM heading recognition as an ATX subset with a generic `parseHeading` API (setext not yet).
- 9424c5b: Update all dependencies to latest versions and fix transitive high-severity audit failures via pnpm-workspace.yaml overrides (fast-uri, js-yaml, brace-expansion, nanoid, browserslist, postcss, smol-toml, dompurify, @hono/node-server). Bump packageManager to pnpm@11.25.0 (11.13.0 was a broken release). Pin GitHub Actions SHAs to latest patch releases. Declare unfixable image-size advisories in audit.ignore.
- Updated dependencies [715047b]
- Updated dependencies [9424c5b]
  - @bwilliamson/mdcp-core@0.8.0

## 0.7.4

### Patch Changes

- 473954d: Clarify pre-1.0 stability as per-package (independent versioning); stop gating docs on a single npm 1.0.
- Updated dependencies [473954d]
  - @bwilliamson/mdcp-core@0.7.3

## 0.7.3

### Patch Changes

- 3e608b6: Drop unused `commander` dependency — the CLI already runs on CAC only.

## 0.7.2

### Patch Changes

- Updated dependencies [095b710]
  - @bwilliamson/mdcp-core@0.7.2

## 0.7.1

### Patch Changes

- Updated dependencies [7fb748f]
  - @bwilliamson/mdcp-core@0.7.1

## 0.7.0

### Minor Changes

- Fix coverage scan to honor the repository-root `.gitignore` when `scan.root` is nested inside a git working tree (bounded by `.git`), and never climb parent directories for `.gitignore` when not inside git.

  Replace polynomial-risk heading and Pandoc `{#id}` regexes with linear shared markdown helpers, clearing CodeQL `js/polynomial-redos` alerts (#200). Includes intentional heading/anchor edge-case tightening and newline `\s` parity for compiled strip.

  Add a repository-wide markdown coverage scan plus `standaloneGuides` config, honoring `.gitignore`. `mdcp check` reports uncaptured paths; `scan.strict` fails the gate (dogfooded in this repo).

### Patch Changes

- Updated dependencies
  - @bwilliamson/mdcp-core@0.7.0

## 0.6.1

### Patch Changes

- Fix Agent Skill YAML frontmatter corrupted by release version sync (`---name:`), which broke `npx skills add`. Require `pnpm skill:validate` after version sync in `release:tag` and again in the release workflow before npm publish.
- Updated dependencies
  - @bwilliamson/mdcp-core@0.6.1

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

### Patch Changes

- Updated dependencies
  - @bwilliamson/mdcp-core@0.6.0

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

### Patch Changes

- Updated dependencies
  - @bwilliamson/mdcp-core@0.5.0

## 0.4.1

### Patch Changes

- Fix `mdcp compile` so it writes `refs.json` under `outputDir` (via `refs.registryFile`) instead of omitting the registry when guides use nested `compile.outputFile` paths. `mdcp refs-list` now works immediately after compile.

  Closes #62

  Performance (#64): compile once per `mdcp compile`/`check` (P0) and compile-scoped shard cache so each shard is read once per command (P1). Dogfood meets Tier 1–4 SLOs at ~64 shards.

  Require Node.js **>= 24.0.0** (#57). Node 22 is no longer supported; upgrade your runtime before updating these packages.

  **llms-index fetch — profile pointer indirection:** On tagged releases (e.g. `v0.4.0`), `spec/llms-index/valpha` and `vdev` are git symlinks. GitHub raw returns only the target filename (`mdcp.v0.4.llms.txt`), not the bootstrap content. `mdcp export --llms-index --fetch` now detects that response and re-fetches the versioned file under `spec/llms-index/`.

  **Consumer docs:** Day-zero bootstrap examples use `npx @bwilliamson/mdcp-cli` (there is no `mdcp` package on npm). llms-index spec artifacts synced.

  **Monorepo:** pnpm-only settings moved from `.npmrc` to `pnpm-workspace.yaml` to silence npm 11 warnings when running `npx`.

- Updated dependencies
  - @bwilliamson/mdcp-core@0.4.1

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

### Patch Changes

- Updated dependencies
  - @bwilliamson/mdcp-core@0.4.0

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

### Patch Changes

- Updated dependencies
  - @bwilliamson/mdcp-core@0.3.0

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

### Patch Changes

- Updated dependencies [b42ea7b]
  - @bwilliamson/mdcp-core@0.2.0

## 0.1.5

### Patch Changes

- Drop `@vvago/vale` from documented dev dependencies; install Vale separately so `vale` is on your `PATH`. Update bootstrap prompt, LLM collaboration guide, and compiled README for a three-tier docs layout (`docs/features/`, `docs/developer/`, `docs/client/`).
- Updated dependencies
  - @bwilliamson/mdcp-core@0.1.5

## 0.1.4

### Patch Changes

- Split intra-guide and publish-path link rewriting: intra-guide `./section.md` links rewrite on every compile; `compile.publishPathRewrite` drives repo-root path rewrites for publish outputs. Fix `compileGuides` to return an empty string when all guides have `outputFile`. Export `GuideConfigInput`, `MdcpConfigInput`, and `CompileOptionsInput`.
- Updated dependencies
  - @bwilliamson/mdcp-core@0.1.4

## 0.1.3

### Patch Changes

- fc5719b: Add LLM collaboration guide for agent workflows, bootstrap prompt, and Cursor agent rule. Recompile repository docs and package READMEs.
- Updated dependencies [fc5719b]
  - @bwilliamson/mdcp-core@0.1.3

## 0.1.2

### Patch Changes

- Support mixed monolith and per-guide publish outputs: guides with `compile.outputFile` write to a separate path and are excluded from the monolith; guides without `outputFile` still compile into `guides.md`. Add optional `compile.includeBanner` per guide (defaults to false when `outputFile` is set).

  `mdcp sections` now writes guide-relative paths in `sections.txt` (regenerated from `index.md`) instead of absolute filesystem paths.

- Updated dependencies
  - @bwilliamson/mdcp-core@0.1.2

## 0.1.1

### Patch Changes

- Rename packages to the `@bwilliamson/mdcp-*` npm scope and add registry READMEs for CLI, core, and presets.
- Updated dependencies
  - @bwilliamson/mdcp-core@0.1.1
