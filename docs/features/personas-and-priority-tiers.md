# Personas and priority tiers

mdcp splits, compiles, and validates sharded Markdown for repos where **LLMs help write docs**, **humans review them**, and **compiled output serves feature work and end-user guides**.

## Adoption archetypes

Four goals — not job titles. Interns and students map to **Learner**; technical writers and domain SMEs map to **Author**; foundation reviewers map to **Champion**. Do not enumerate roles on landing pages. Each archetype gets one [WIIFM](../glossary/wiifm.md) line (landing-safe):

| Archetype    | Goal                                     | WIIFM (landing-safe)                                       | Typical path                |
| ------------ | ---------------------------------------- | ---------------------------------------------------------- | --------------------------- |
| **Builder**  | Integrate mdcp into repo scripts and CI  | One gate for humans, agents, and CI; smaller doc PRs       | Paste prompt or `mdcp init` |
| **Learner**  | Try mdcp before mastering every CLI flag | Paste a prompt; agent runs setup                           | Getting started prompt      |
| **Author**   | Own content, not the toolchain           | One topic per file; load the section that matches the task | Paste prompt + usage model  |
| **Champion** | Evaluate or sponsor adoption             | Slash MTTR and accelerate onboarding with instant context  | Vision and claims shards    |

Paths: [CLI README](../../packages/mdcp-cli/README.md), [getting-started workflow](../../skills/mdcp/references/workflows/getting-started.md), [usage model](./protocol/usage-model.md), [vision](./protocol/00-vision-and-roadmap.md), [claims policy](./protocol/benefit-claims-and-evidence.md).

Once a pipeline exists, adoption archetypes map to **tool operator personas** below (for example Author → LLM doc author; Builder → wires CI `check`).

### Archetype signals (non-landing)

Anonymous goal patterns — do not copy job titles onto landing pages:

- **Champion** — CPTO/CTO or platform lead assessing whether MDCP's shard contract fits agentic delivery governance; reads vision and claims shards before CLI setup. First external Champion validation (2026-06, anonymous) confirmed [Vision and roadmap](./protocol/00-vision-and-roadmap.md) was sufficient for onboarding; the landing one-liner alone was not.
- **Builder** — wires `mdcp check` into CI after Champion sign-off.
- **Author / Learner** — unchanged from the table above.

Maintainers dogfooding the mdcp monorepo are **not** an adoption archetype — see [This repository](../repo-readme/this-repository.md) and [DEVELOPERS.md](../../DEVELOPERS.md).

### Messaging guardrails

Public copy uses [Benefit claims and evidence](./protocol/benefit-claims-and-evidence.md) tiers only. Landing pages (root [README](../../README.md)) allow Tier A/B claims — never Tier C without adoption-story evidence.

### Publish landing style

Reference: [`docs/repo-readme/`](../repo-readme/index.md) → `README.md`.

- What this tool is (one-liner + vision link for evaluators), then [WIIFM](../glossary/wiifm.md); four archetypes max
- WIIFM table does not replace the vision shard for Champions
- Dual equal get-started paths (A/B); Champion eval path in get-started; routing explains fit, not priority
- Want to know more = archetype link hub; keep landing scannable — Mermaid only in the short **MDCP 101** section (not elsewhere on the landing)

## Tool operator personas

| Persona                | Job                             | Command                                        |
| ---------------------- | ------------------------------- | ---------------------------------------------- |
| **LLM doc author**     | Edit shards, insert cross-links | `shard`, `compile`, `check` (broken `#` links) |
| **LLM feature agent**  | Read doc context while coding   | Host search → one shard read                   |
| **Human doc reviewer** | PR quality gate                 | `check`, `prose`, `lint`, `links`              |
| **End-user reader**    | Read glossary, guides, reviews  | `compile` output                               |

## P0 adoption — evaluator onboarding (validated 2026-06)

| Need                                           | Evidence                                   | Action                                                       |
| ---------------------------------------------- | ------------------------------------------ | ------------------------------------------------------------ |
| Champion can understand MDCP without prior use | First external Champion review (anonymous) | Vision link on landing; Champion eval path in get-started    |
| Landing blurb alone insufficient               | Same                                       | Do not revert WIIFM order; augment with vision link and path |

Aligns with GitHub project **Track: 0.5 Spec & adoption** — see [Agent work item tracking](../developer/agent-work-item-tracking.md).

## P0 — LLM can read docs and write correct links

| Feature       | CLI                   | Core module          | Status      |
| ------------- | --------------------- | -------------------- | ----------- |
| Compile       | `mdcp compile`        | `compile/`           | Implemented |
| Refs registry | `mdcp refs` / `check` | `refs/`              | Implemented |
| Check (core)  | `mdcp check`          | orphans, refs, links | Implemented |

Dogfood: `mdcp check` on `docs/` and `examples/sample-guides`.

## P1 — LLM can write docs in shards safely

| Feature             | CLI            | Core module           | Status      |
| ------------------- | -------------- | --------------------- | ----------- |
| Manifest link order | `mdcp compile` | `compile/assemble.ts` | Implemented |
| Shard split         | `mdcp shard`   | `shard/`              | Implemented |
| Orphan check        | `mdcp check`   | `validate/orphans.ts` | Implemented |

**Dogfood:** Edit a shard under `docs/features/` or `docs/developer/` → `mdcp check`.

## P2 — Human reviewers trust the output

| Feature       | CLI                                  | Core module        | Status                       |
| ------------- | ------------------------------------ | ------------------ | ---------------------------- |
| Peer linters  | `mdcp lint`, `prose`, `links`, `fix` | `peers/`           | Implemented                  |
| Compile hooks | config `compile.hooks`               | `compile/hooks.ts` | Implemented (built-in hooks) |

**Dogfood:** `pnpm docs:check` (markdownlint + Vale on `PATH`).

## P3 — Enabler

| Feature | Role                                             |
| ------- | ------------------------------------------------ |
| Config  | `mdcp.config.json` wires all commands            |
| Presets | `@bwilliamson/mdcp-presets` starter lint configs |
