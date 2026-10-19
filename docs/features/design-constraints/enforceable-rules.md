# Enforceable rules

Authoring constraint for Merlon Docs’ own rules: every rule Merlon Docs states is either **gated** or **advisory**, and says which.

## Rule

A documentation rule is **gated** when a check can fail on it — `merlon check`, a peer linter, or a named CI step. A rule is **advisory** when correctness depends on a reader's judgement.

Both kinds are legitimate. What is not legitimate is a rule that reads as gated and is not, because that is the shape that silently stops holding:

- **State the gate.** A gated rule names the check that fails on it, so an agent can verify that it did.
- **Label the rest.** An advisory rule says it is advisory, and says who applies it and what evidence a run leaves behind.
- **Prefer narrowing to exempting.** When only part of a rule can be mechanized, gate that part rather than leaving the whole rule to discipline. A mechanical fragment that fails is worth more than a complete rule that never does.
- **Avoid exceptions with a single resolution.** An exception whose two sides carry different costs is not an exception; every reader resolves it the same way. Either remove it or gate the condition that would justify it.

## Why

In a repository with a human in the commit path, an ungated rule degrades slowly: reviewers catch some violations and the rest accumulate at a survivable rate. In a repository where agents author every commit, an ungated rule does not degrade — it is simply absent. Agents stop when the gate is green, so a green gate is the whole definition of done that the corpus can express.

Measured evidence for this, including a rule that held structurally while failing semantically for two weeks: [Field report: a fully automated repository](../system/research/field-report-automated-repository.md).

Because of this constraint, Merlon Docs invests in the [check gate](../check-gate.md) more than in skill prose. Prose that no check enforces competes for an agent's context without changing its behavior.

## Current status of Merlon Docs’ own rules

| Rule                                          | Status                               | Gate                                                                                                                                    |
| --------------------------------------------- | ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| A shard in a guide directory is in a manifest | Gated                                | Orphan check                                                                                                                            |
| Internal links and anchors resolve            | Gated                                | Built-in link validation                                                                                                                |
| Compiled output matches the shards            | Gated                                | CI runs `docs:compile`, then `git diff --exit-code`                                                                                     |
| Skill install dir has no carrier files        | Gated                                | `pnpm skill:validate` (`scripts/lint-skill-frontmatter.mjs`)                                                                            |
| Skill `metadata.version` matches its carrier  | Gated                                | `pnpm skill:validate` (`scripts/lint-skill-frontmatter.mjs`)                                                                            |
| The refs registry on disk matches the compile | Gated when `refs.json` is committed  | A CI step that runs `merlon refs-check` before any compile, or the compile-and-diff gate of the previous row with `refs.json` committed |
| Every markdown file is accounted for          | Gated when `scan.strict: true`       | Coverage scan                                                                                                                           |
| Markdown structure and en-US prose cues       | Gated when peer linters are required | Peer linters                                                                                                                            |
| Shards describe the product as it works now   | **Advisory**                         | Partial: source-file links, `lint.paths`, Vale                                                                                          |
| One primary concern per shard                 | **Advisory**                         | None                                                                                                                                    |
| No implementation detail in durable docs      | **Advisory**                         | None                                                                                                                                    |
| No temporary information or backlogs in docs  | **Advisory**                         | Partial: this repo's changeset-link lint, Vale                                                                                          |
| Current docs drop a removed or old name       | **Advisory**                         | Partial: `lint.paths`, link validation                                                                                                  |
| A review routine states trigger and evidence  | **Advisory**                         | None                                                                                                                                    |

[Stale registry check](../refs-registry-path.md#stale-registry-check) says why the refs stage of `merlon check` can't gate the refs row, and which CI steps catch a stale file.

The [check gate](../check-gate.md) lists the `merlon check` stages behind most gated rows. Their own specs are the [orphan check](../manifest-compile-order.md#orphan-check-scope), [link validation](../link-validation.md), the [documentation coverage scan](../coverage-scan.md) and the [peer linters](./peer-linters.md) page.

A partial gate checks one fragment of an advisory rule. Link validation fails on a link to a missing source file. With `lint.paths.severity` set to `error`, `merlon check` also fails on a backtick path that resolves nowhere. With peer Vale required, the `MerlonDocs.DatedClaim` rule fails on `as of <date>`, a claim pinned to its date, and on `until <date>`, a temporary note. The rule checks the files Vale scans, which [In-scope guide fileset](../../client-cli/optional-linters.md#in-scope-guide-fileset) lists. A shard outside those paths, such as a glossary that only `compile.scopeRoot` reaches, is not checked. The path probe skips such a glossary too, because it reads only the guide directories in `compileOrder` and the standalone guides. The path probe is specified in [path resolution](../path-resolution.md), and the Vale rule in [Locale and language boundary](./locale-and-language.md).

The advisory rows are stated in the [Agent Skill](../agent-skill.md#quality-assurance-qa-principles). They are the rows worth moving, in whole or in fragments, as checks become possible.

## Applies to

- Rules stated in the Merlon Docs Agent Skill and its workflows
- Rules a consuming repository layers on top of Merlon Docs in its own skills or contributor docs
- Proposed CLI verbs and checks: a proposal that makes an advisory rule partly gated clears the [direct value bar](./direct-value-bar.md) more easily than one that restates the rule

Part of [Design constraints](./index.md).
