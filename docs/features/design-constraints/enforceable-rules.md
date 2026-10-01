# Enforceable rules

Authoring constraint for MDCP's own rules: every rule MDCP states is either **gated** or **advisory**, and says which.

## Rule

A documentation rule is **gated** when a check can fail on it — `mdcp check`, a peer linter, or a named CI step. A rule is **advisory** when correctness depends on a reader's judgement.

Both kinds are legitimate. What is not legitimate is a rule that reads as gated and is not, because that is the shape that silently stops holding:

- **State the gate.** A gated rule names the check that fails on it, so an agent can verify that it did.
- **Label the rest.** An advisory rule says it is advisory, and says who applies it and what evidence a run leaves behind.
- **Prefer narrowing to exempting.** When only part of a rule can be mechanized, gate that part rather than leaving the whole rule to discipline. A mechanical fragment that fails is worth more than a complete rule that never does.
- **Avoid exceptions with a single resolution.** An exception whose two sides carry different costs is not an exception; every reader resolves it the same way. Either remove it or gate the condition that would justify it.

## Why

In a repository with a human in the commit path, an ungated rule degrades slowly: reviewers catch some violations and the rest accumulate at a survivable rate. In a repository where agents author every commit, an ungated rule does not degrade — it is simply absent. Agents stop when the gate is green, so a green gate is the whole definition of done that the corpus can express.

Measured evidence for this, including a rule that held structurally while failing semantically for two weeks: [Field report: a fully automated repository](../protocol/field-report-automated-repository.md).

This constraint is why MDCP invests in the [check gate](../feature-catalog.md#check-gate-p04) rather than in longer skill prose. Prose that no check enforces competes for an agent's context without changing its behavior.

## Current status of MDCP's own rules

| Rule                                          | Status                               | Gate                                           |
| --------------------------------------------- | ------------------------------------ | ---------------------------------------------- |
| A shard in a guide directory is in a manifest | Gated                                | Orphan check                                   |
| Internal links and anchors resolve            | Gated                                | Built-in link validation                       |
| Compiled output matches the shards            | Gated                                | `mdcp check` compile diff in CI                |
| The refs registry is current                  | Gated                                | `mdcp check` refs step                         |
| Every markdown file is accounted for          | Gated when `scan.strict: true`       | Coverage scan                                  |
| Markdown structure and en-US prose cues       | Gated when peer linters are required | Peer linters                                   |
| Shards describe the product as it works now   | **Advisory**                         | None                                           |
| One primary concern per shard                 | **Advisory**                         | None                                           |
| No implementation detail in durable docs      | **Advisory**                         | None                                           |
| No temporary information or backlogs in docs  | **Advisory**                         | Partial: pending changeset links fail the gate |

Where the gated rows are specified: [orphan check](../feature-catalog.md#orphan-check-p13), [link validation](../link-validation.md), [documentation coverage scan](../coverage-scan.md), [peer linters](./peer-linters.md).

The advisory rows are stated in the [Agent Skill](../agent-skill.md#quality-assurance-qa-principles). They are the rows worth moving, in whole or in fragments, as checks become possible.

## Applies to

- Rules stated in the MDCP Agent Skill and its workflows
- Rules a consuming repository layers on top of MDCP in its own skills or contributor docs
- Proposed CLI verbs and checks: a proposal that makes an advisory rule partly gated clears the [direct value bar](./direct-value-bar.md) more easily than one that restates the rule

Parent: [Design constraints](./index.md).
