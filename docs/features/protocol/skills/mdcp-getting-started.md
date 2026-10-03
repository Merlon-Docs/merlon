# Getting-started helper

Product capability: the **`mdcp-getting-started`** helper skill bootstraps MDCP
in a greenfield or brownfield repository — config, four-tier guide layout, and
initial shards — then optionally walks a **first feature** through
design → feature → UX → doc-only so teams learn the full helper circuit.

Invoke (after the parent skill is installed):

```text
/mdcp-getting-started
```

Upstream pack: [`skills/mdcp-getting-started/`](../../../../skills/mdcp-getting-started/SKILL.md)
(tutorial script:
[`skills/mdcp-getting-started/references/first-feature-tutorial.md`](../../../../skills/mdcp-getting-started/references/first-feature-tutorial.md)).
Shared helper contract (intake, guide placement, glossary): [Helper Skills](../agent-task-prompts.md).

## End-user value

Contributors get a working MDCP layout (guides, compile/check scripts, glossary
hooks) without inventing structure from scratch. Brownfield repos keep legacy
docs until review instead of destructive overwrite. The project’s glossary
**inclusion bar** is recorded up front so later helpers know which terms belong.
An optional first-feature tutorial shows how the day-to-day helpers fit together
before handing off to normal delivery.

## What this helper is for

| Obligation                  | As-built expectation                                                                                                               |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Bootstrap intake            | Ask for `FEATURE`, `PERSONA`, and `EXPERIENCE` (novice vs expert) before editing                                                   |
| Inspect repo state          | Detect greenfield vs brownfield; discover package manager and existing docs before scaffolding                                     |
| Install toolchain           | Add CLI/presets with the repo’s package manager; wire `mdcp compile` / `mdcp check` into scripts                                   |
| Scaffold four-tier guides   | Create `docs/features/`, `docs/client/`, `docs/developer/`, `docs/glossary/` with indexes and starter shards                       |
| Glossary inclusion bar      | With the end user, record the project inclusion bar in the glossary index preamble (what terms do / do not belong)                 |
| Seed domain terms           | Add initial glossary entries that meet the bar; link from starter shards                                                           |
| Brownfield migration        | Scaffold **alongside** legacy docs; mark migrated legacy files ready to archive — never auto-delete                                |
| Experience-adaptive depth   | Novice: tutorial shards and concept pauses; expert: concise FEATURE starters only                                                  |
| Validate                    | Run `mdcp compile` / `mdcp check` until clean                                                                                      |
| First-feature tutorial      | After bootstrap, offer walkthrough (default yes for novice); resolve `EXAMPLE_MODE`; run helper phases in order                    |
| EXAMPLE_MODE                | **recommended** (`hello-greeting`) or **bring-your-own** (user FEATURE / PERSONA; one small slice)                                 |
| Closing CTA                 | Star, review/feedback, share; explore [dora.dev/ai](https://dora.dev/ai/); join [dora.community/join](https://dora.community/join) |
| Hand off when tutorial skip | State next steps for feature-level, doc-only, design-architecture, or UX                                                           |

## What this helper is not

- **Day-to-day feature delivery outside the optional tutorial** — use
  [mdcp-feature-level](./mdcp-feature-level.md) directly after onboarding.
- **Docs-only cleanup with no bootstrap** — use
  [mdcp-doc-only](./mdcp-doc-only.md).
- **Architecture-as-shards / ADR drafting alone** — use
  [mdcp-design-architecture](./mdcp-design-architecture.md).
- **End-user / client journey design alone** — use [mdcp-ux](./mdcp-ux.md).
- **Code TDD rituals, [Atomic commit groups](../../../glossary/atomic-commit-groups.md), or local engineering process during bootstrap scaffold** —
  out of scope for scaffold; when the first-feature tutorial runs, each phase
  follows the matching day-to-day helper (including commit groups in plans).
- **Inventing the inclusion bar without the end user** — the bar is project
  judgment recorded with the people who own the docs, not a one-size-fits-all list.
- **Auto-running all four helpers without user pauses** — phases require “go”
  between steps.

When the user asks for ongoing feature or docs work in the same session as
bootstrap, this helper **MUST** finish setup (or ask to narrow scope), then
either run the first-feature tutorial or state next steps for the matching
day-to-day helper.

## Acceptance (as-built)

A successful getting-started session typically:

1. Leaves a configured docs root (`mdcp.config.json`, compile/check scripts)
2. Creates or updates the four-tier guide layout with discoverable indexes
3. Records the project glossary inclusion bar in the glossary (end-user agreed)
4. Seeds any initial domain terms that meet that bar
5. Preserves brownfield legacy files (archive banners only — no auto-delete)
6. Passes `mdcp check` (and repo docs validation)
7. Offers the first-feature tutorial (or clear handoff if skipped)
8. When the tutorial runs: completes design → feature → UX → doc-only for the
   chosen example, with `mdcp check` between phases
9. Delivers Closing CTA (star / review / share / DORA / community join)

Optional local with/without-skill grading for this helper:
[mdcp-getting-started live evals](../../../../tests/skills/mdcp-getting-started/evals/README.md)
(maintainer workflow — not a CI gate). See [Live skill evals](../../../developer/live-skill-evals.md).
