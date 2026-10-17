# @merlon-docs/merlon-docs-presets

## 1.0.0-draft.0

### Major Changes

- 5ab62e8: This is the 1.0 draft of Merlon Docs. The CLI, the core library, the presets and the Agent Skills publish as `1.0.0-draft.N` prereleases under the npm `draft` tag. Install the newest draft with `npm install @merlon-docs/merlon-docs-cli@draft`. The interfaces can still change between drafts. 1.0.0 is the first release with a stability guarantee, and from 1.0.0 on a breaking change needs a major version.

### Minor Changes

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

- 58452d2: MDCP (MarkDown Context Protocol) is now Merlon Docs. The packages publish as `@merlon-docs/merlon-docs-cli`, `@merlon-docs/merlon-docs-core` and `@merlon-docs/merlon-docs-presets`, and the CLI command is `merlon`. The Agent Skill installs as `merlon-docs` with `npx skills add Merlon-Docs/merlon --skill merlon-docs`, and the archetypes are `merlon-docs-arch-*`.

  The config file is `merlon.config.json`. Until 2.0.0, a CLI run that finds `mdcp.config.json` and no `merlon.config.json` upgrades the project itself. It writes the config to `merlon.config.json` with `protocolVersion` renamed to `standardVersion`, deletes `mdcp.config.json` and prints a notice. The illustrative-paths marker is `<!-- merlon-paths: illustrative -->`, and the former `mdcp-paths` spelling still works until 2.0.0.

  The Vale style is `MerlonDocs`, so a rule reads `MerlonDocs.DatedClaim`. Compiled outputs carry `<!-- merlon-shard: … -->` markers. In the core API the config types are `MerlonConfig`, `MerlonConfigInput` and `MerlonConfigSchema`, and the `Mdcp*` names stay as deprecated aliases until 2.0.0.

  To migrate a project, install the new packages, run any `merlon` command once to upgrade the config file, and change `MDCP` to `MerlonDocs` in `.vale.ini`, in `<!-- vale MDCP.… -->` comments and in the `StylesPath` link to the presets.

- 9bc05cd: Add the `MerlonDocs.DatedClaim` Vale rule

  The `MerlonDocs` style now flags a claim pinned to a date: `as of` or `until` followed by an ISO date such as `2026-07-27`, in body text, headings, tables and lists. An ISO date-time such as `2026-07-27T12:00:00Z` counts too. A durable doc should say what is true now. The history behind a rule that still holds belongs in an ADR that the doc links, and a temporary note belongs in the tracker. Text that only describes removed behavior is deleted, and the release notes give its notice. An ADR keeps the rule on and writes each date on its own, without `as of` or `until`. Code and inline link labels are skipped.

  The rule is error level, so `merlon check --require-vale` fails on a dated claim. It flags every dated claim whatever its age, because a Vale rule can't compare a date with today. To report dated claims without failing the check, set the level in `.vale.ini`:

  ```ini
  MerlonDocs.DatedClaim = warning
  ```

  A plain `merlon prose` shows the warning. To see it in `merlon check` too, set `vale.strictMinAlertLevel` to `warning` in `merlon.config.json`.

  Set it to `NO` in a path section to exempt files that are dated by design, such as research records. Put that section last, after every section that matches the same files. Merlon Docs passes Vale absolute paths, so start the section with `**/`, as in `[**/research/*.md]`. To exempt one passage, wrap it in `<!-- vale MerlonDocs.DatedClaim = NO -->` and `<!-- vale MerlonDocs.DatedClaim = YES -->`.

  The `TokenIgnores` pattern in the package config now ends each match at the link's closing parenthesis, and it reads a backslash-escaped bracket in a label as text. The old pattern could start at a task-list checkbox and stop at the next link later in the file, which hid the text between them from every `Merlon Docs` rule. If your `.vale.ini` repeats the old pattern, copy the new one from `vale/package/.vale.ini`.

### Patch Changes

- a922454: Drop the npm keyword `mdcp` from the CLI and presets packages. The old name stays only on the compatibility aliases that a project still needs: `mdcp.config.json` upgrades to `merlon.config.json` until 2.0.0, `protocolVersion` still fills `standardVersion`, the `MdcpConfig` names stay as deprecated exports, and `<!-- mdcp-paths: illustrative -->` is still read.
- 01b6d2b: The config key for the version of the Merlon Docs standard is now `standardVersion`, defaulting to `1.0.0-draft.0` with the 1.0 draft line (replacing the former `0.5.0.0` label and `protocolVersion` name). A config that still sets `protocolVersion` keeps working until 2.0.0: `loadConfig` and the new `parseConfig` copy its value to `standardVersion`, and they fail when the two keys hold different values. A parsed config still has `protocolVersion`, set to the same value. The JSON schema marks `protocolVersion` as deprecated.

  The copyright line in each license now reads Merlon Docs. Code comments, the JSON schema and the docs now call the specification "the standard". The presets README now refers to the `MerlonDocs` Vale style, which the rename had missed.

## 0.8.0

### Minor Changes

- 715047b: Ship the `MDCP` Vale style (en-US unlinked heading-mention prose) from `@bwilliamson/mdcp-presets`, keep compile-time locale strings in mdcp-core (BCP 47 JSON + shared formatters), document Pandoc ID removal as dogfood Vale (`MDCP-PandocId`), keep slugify language-agnostic, and document GFM heading recognition as an ATX subset with a generic `parseHeading` API (setext not yet).

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

## 0.1.5

### Patch Changes

- Version sync for release; no preset changes.

## 0.1.4

### Patch Changes

- Split intra-guide and publish-path link rewriting: intra-guide `./section.md` links rewrite on every compile; `compile.publishPathRewrite` drives repo-root path rewrites for publish outputs. Fix `compileGuides` to return an empty string when all guides have `outputFile`. Export `GuideConfigInput`, `MdcpConfigInput`, and `CompileOptionsInput`.

## 0.1.3

## 0.1.2

### Patch Changes

- Support mixed monolith and per-guide publish outputs: guides with `compile.outputFile` write to a separate path and are excluded from the monolith; guides without `outputFile` still compile into `guides.md`. Add optional `compile.includeBanner` per guide (defaults to false when `outputFile` is set).

  `mdcp sections` now writes guide-relative paths in `sections.txt` (regenerated from `index.md`) instead of absolute filesystem paths.

## 0.1.1

### Patch Changes

- Rename packages to the `@bwilliamson/mdcp-*` npm scope and add registry READMEs for CLI, core, and presets.
