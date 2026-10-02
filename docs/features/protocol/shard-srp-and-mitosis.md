# Shard single responsibility and idea mitosis

MDCP treats documentation as library science for software product intent: settle a concept, give it one place to live, and keep that place small enough that a human or agent can load it alone without being misled.

The focal rule is **[shard single responsibility](../../glossary/shard-single-responsibility.md) for a documentation shard**. How shards assemble into guides is secondary. Frameworks that informed this thinking are listed in [Acknowledgments](./acknowledgments.md) — they are provenance, not the instruction set.

## Shard single responsibility

A documentation shard has **one primary concern**, for **one audience tier**, serving **one job**:

| Axis     | Question                                              | Failure mode                                        |
| -------- | ----------------------------------------------------- | --------------------------------------------------- |
| Concern  | What one settled idea does this file own?             | Two capabilities that drift on different schedules  |
| Audience | Who needs this — consumer or contributor?             | Mixing client usage with maintainer runbooks        |
| Job      | Explain, instruct how-to, or define/look up — not all | Explanation pasted into a step list, or the reverse |

**Reason to change:** a shard should have one main reason to be edited. If product contract language and “run these five commands” must change for different events, they do not belong in the same file.

**Complete for that job:** the shard is finished when a reader can use it for its job without the rest of the monolith _and_ without being misled. Completeness is not a line-count budget. Glossary leaves may be three lines; a single contract may need a longer section and still be one responsibility.

## Idea mitosis

When pressure builds along more than one axis, **split** the shard — [idea mitosis](../../glossary/idea-mitosis.md) — instead of growing a mini-monolith.

### Split when

1. **Dual audience** — consumers and contributors both “need this paragraph” → apply the [placement test](./mdcp-1.0-spec.md#2-default-guide-layout-code-repository-archetype); usually `features`/`client` vs `developer`.
2. **Dual job** — understanding _why_ mixed with _how to do it_ or with look-up facts → separate explanation, how-to/runbook, and reference/definition shards.
3. **Dual concern** — two independent capabilities or decisions → one shard each.
4. **Load failure** — reading the file alone misleads → extract the missing concern or merge with the sibling that must travel with it (mitosis can also mean “these two were never separate organisms”).
5. **Unsettled next to settled** — discovery notes, spikes, or time-bound reactions sitting beside current durable truth → discovery stays in the issue tracker; durable shards stay [current only](../agent-skill.md#quality-assurance-qa-principles).

### Do not split when

Headings that are still **one** reason to change (for example Inputs and Outputs of the same contract, or Preconditions and Steps of the same how-to). That is structure inside one responsibility, not a second organism.

### After a split

1. Update the guide `index.md` (or `shards.md`) so compile order stays intentional.
2. Cross-link daughter shards; do not leave orphaned halves.
3. Run [two-level review](#two-level-review): each shard in isolation, then the guide as a whole.

## Guides (secondary)

A **guide** is an ordered constellation of shards for **one audience job family** (in the Code Repository Archetype: features, client, developer, glossary). Compile stitches them for reading; shards remain the source of truth.

**Organize a guide so that:**

- Each shard still passes single responsibility.
- Manifest order tells a coherent story for that audience without requiring every reader to load every shard.
- Placement stays by audience and job, not by topic keyword alone (the same subject may appear in more than one tier with different responsibilities).

The MDCP engine is domain-agnostic. Other archetypes may use different guide names; the SRP and mitosis rules still apply.

## Two-level review

When a change touches documentation (or code whose behavior a guide documents):

1. **In isolation** — each changed idea or shard is locally correct for its single responsibility.
2. **Comprehensively** — against related shards and guides: duplication, better splits/merges/relocations, and agreement between what guides promise and what the change does.

A review is complete only when the change and its guides agree. Guide-specific application for this repository: [Comprehensive review when guides are involved](../../developer/docs-dogfooding.md#comprehensive-review-when-guides-are-involved).

## Supporting maps (optional depth)

Use these maps when judging _job_ or _settledness_. Agents do not need the full frameworks to obey SRP — the tables are aids.

### Documentation job (needs)

| Job                          | Typical durable home                      |
| ---------------------------- | ----------------------------------------- |
| Learn by doing (guided)      | Client getting-started / onboarding       |
| Achieve a goal (steps)       | Client how-tos; developer runbooks        |
| Look up facts                | CLI/config reference; glossary; contracts |
| Understand why / how it fits | Features, ADRs, design constraints        |

Mixing two jobs in one shard is a mitosis signal. Named lineage: [Acknowledgments](./acknowledgments.md).

### Settledness

| State                         | Durable shard?                                      |
| ----------------------------- | --------------------------------------------------- |
| Known, short definition       | Yes — often glossary or a small reference leaf      |
| Analyzable contracts / design | Yes — feature/client/developer shard                |
| Only knowable by probing      | Not yet — spike, issue, draft; promote when settled |
| Incident / crisis notes       | No — tracker / ops, not durable guides              |

## Extensions beyond this archetype

GTM/marketing/sales documentation is a separate WIP archetype (`mdcp-arch-gtm`), not part of the Code Repository Archetype — see [Extensions and archetypes](./extensions-and-archetypes.md).

## Acceptance

- Authors and agents can state a shard’s single responsibility in one sentence.
- Mitosis decisions cite audience, job, or concern — not file length alone.
- Guide indexes reflect splits; two-level review runs when guides are involved.
- Provenance for external frameworks lives in [Acknowledgments](./acknowledgments.md), not in the operative skill rules.

## Related

- [Agent Skill — QA principles](../agent-skill.md#quality-assurance-qa-principles)
- [Extensions and archetypes](./extensions-and-archetypes.md)
- [Skill workflows](./skill-workflows.md)
- [Acknowledgments](./acknowledgments.md)
