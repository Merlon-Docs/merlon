# Personas and priority tiers

mdcp splits, compiles, and validates sharded Markdown for repos where **LLMs help write docs**, **humans review them**, and **compiled output serves feature work and end-user guides**.

## Audience priority

Public pages speak first to the people who can make documentation a required policy.

- **Primary: people with authority over reliability.** Platform and DevOps leads, engineering and technical managers, QA and reliability engineers, and the person responsible for the team's AI skill stack. They can require the skill and the check across repositories. The landing page lists these roles and gives them a short path to policy.
- **Secondary: people who already value docs.** Technical writers and engineers who write things down adopt the skill for themselves and argue for it inside their teams.
- **Anti-persona: the engineer who keeps the system in their head.** This engineer doesn't see a problem with undocumented knowledge, even though that knowledge leaves when they do. Public copy addresses the risk this creates for the primary audience instead of arguing with this reader. It stays respectful, because winning them over later is still the goal.

## Adoption archetypes

Four goals — not job titles. Interns and students map to **Learner**; technical writers and domain SMEs map to **Author**; foundation reviewers map to **Champion**. The landing page names the primary audience's roles; archetype tables and WIIFM lines stay goal-based. Each archetype gets one [WIIFM](../glossary/wiifm.md) line (landing-safe):

| Archetype    | Goal                                     | WIIFM (landing-safe)                                       | Typical path                                |
| ------------ | ---------------------------------------- | ---------------------------------------------------------- | ------------------------------------------- |
| **Builder**  | Integrate mdcp into repo scripts and CI  | One gate for humans, agents, and CI; smaller doc PRs       | Paste prompt or `/mdcp help me get started` |
| **Learner**  | Try mdcp before mastering every CLI flag | Paste a prompt; agent runs setup                           | Getting started prompt                      |
| **Author**   | Own content, not the toolchain           | One topic per file; load the section that matches the task | Paste prompt + usage model                  |
| **Champion** | Evaluate or sponsor adoption             | Slash MTTR and accelerate onboarding with instant context  | Vision and claims shards                    |

Paths: [CLI README](../../packages/mdcp-cli/README.md), [getting-started workflow](../../skills/mdcp/references/workflows/getting-started.md), [usage model](./protocol/usage-model.md), [vision](./protocol/00-vision-and-roadmap.md), [claims policy](./protocol/benefit-claims-and-evidence.md).

Once a pipeline exists, adoption archetypes map to **tool operator personas** below (for example Author → LLM doc author; Builder → wires CI `check`).

### Archetype signals (non-landing)

Anonymous goal patterns — do not copy job titles onto landing pages:

- **Champion**: a CPTO/CTO or platform lead who assesses whether MDCP's shard contract fits agentic delivery governance, and who reads the vision and claims shards before CLI setup.
- **Builder**: wires `mdcp check` into CI after Champion sign-off.
- **Author / Learner**: unchanged from the table above.

Maintainers dogfooding the mdcp monorepo are **not** an adoption archetype — see [This repository](../repo-readme/this-repository.md) and [DEVELOPERS.md](../../DEVELOPERS.md).

### Messaging guardrails

Public copy uses [Benefit claims and evidence](./protocol/benefit-claims-and-evidence.md) tiers only. Landing pages (root [README](../../README.md)) allow Tier A/B claims — never Tier C without adoption-story evidence.

### Publish landing style

Reference: [`docs/repo-readme/`](../repo-readme/index.md) → `README.md`.

- What this tool is (one-liner + vision link for evaluators), then [WIIFM](../glossary/wiifm.md); four archetypes max
- WIIFM table does not replace the vision shard for Champions
- Dual equal get-started paths (A/B); Champion eval path in get-started; routing explains fit, not priority
- Want to know more = archetype link hub; keep landing scannable — Mermaid only in the short **MDCP 101** section (not elsewhere on the landing)

The evidence behind the vision link and the Champion eval path is in [Field report: a first external evaluator](./protocol/research/field-report-first-evaluator.md).

## Tool operator personas

| Persona                | Job                             | Command                                        |
| ---------------------- | ------------------------------- | ---------------------------------------------- |
| **LLM doc author**     | Edit shards, insert cross-links | `shard`, `compile`, `check` (broken `#` links) |
| **LLM feature agent**  | Read doc context while coding   | Host search → one shard read                   |
| **Human doc reviewer** | PR quality gate                 | `check`, `prose`, `lint`, `links`              |
| **End-user reader**    | Read glossary, guides, reviews  | `compile` output                               |

## Priority tiers

Capabilities are ranked in three tiers, most important first:

1. **An agent can read the docs and write correct links.** This tier covers compile, the refs registry, and the check gate.
2. **An agent can write docs in shards safely.** This tier covers manifest link order, shard split, and the orphan check.
3. **A human reviewer can trust the output.** This tier covers peer linters and compile hooks.

Below the tiers are the enablers: `mdcp.config.json` wires all commands, and the optional `@bwilliamson/mdcp-presets` package holds the starter markdownlint configs and the MDCP Vale style. Commands for each capability are in the [Feature catalog](./feature-catalog.md).
