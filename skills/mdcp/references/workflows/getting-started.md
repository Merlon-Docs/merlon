# Getting-started workflow

> Loaded by the `mdcp` skill. Its hard rules, QA principles, and **What
> belongs where** apply throughout. The `mdcp` CLI must be installed.

Bootstrap MDCP, then optionally guide a **first feature** through the other
workflows. After onboarding, the `mdcp` skill routes day-to-day work to the
matching workflow.

## Role

Documentation Architect: bootstrap config, guide layout, and initial shards;
then orchestrate an optional first-feature tutorial (design → feature → UX →
doc-only). Adapt teaching depth to **EXPERIENCE**.

**Bootstrap out of scope:** inventing TDD rituals or atomic commit grouping
during scaffold only — the day-to-day workflows own those when the tutorial runs.

## Intake

Ask only for values the request does not give, and only when someone can answer; otherwise follow **When nobody can answer** in `SKILL.md` (default **EXPERIENCE** is expert).

1. **FEATURE** — feature or project name for initial docs
2. **PERSONA** — primary audience for the client / end-user guide
3. **EXPERIENCE**
   - **novice** — first skill / unsure about Markdown → tutorial shards + short
     concept pauses
   - **expert** — read the docs / automating → concise scaffold; no lectures

After bootstrap succeeds, ask tutorial intake (see
[first-feature-tutorial.md](first-feature-tutorial.md)):

4. **RUN_FIRST_FEATURE_TUTORIAL** — yes/skip (default **yes** for novice)
5. **EXAMPLE_MODE** — **recommended** (`hello-greeting`) or **bring-your-own**

## Process

### 1. Inspect (greenfield vs brownfield)

Discover package manager and existing docs before editing.

- **Greenfield** — no meaningful docs tree → scaffold cleanly.
- **Brownfield** — legacy docs exist:
  - Do **not** delete or overwrite legacy files.
  - Scaffold the four-tier MDCP layout **alongside** them.
  - Pull useful content into new shards.
  - Mark each migrated legacy file **ready to archive after review** (banner).
    Never auto-delete.

### 2. Install

Add `@bwilliamson/mdcp-cli` and `@bwilliamson/mdcp-presets` with this repo's
package manager. Optional peers only if needed: `markdownlint-cli2`, `prettier`,
`vale` (on `PATH`; `.vale.ini` + `vale sync`).

### 3. Config and scripts

Add `mdcp.config.json` under the docs root (`compileOrder`, guides, lint paths).
Wire `mdcp compile` / `mdcp check` into the script runner. CI with optional
linters: `--require-lint` / `--require-vale`.

### 4. Guide layout

- `docs/glossary/` — one term per shard; index lists terms; link from guides
- `docs/features/` — capabilities, design, contracts
- `docs/developer/` — setup, layout, validation
- `docs/client/` — end-user guide; `about-this-guide.md` states **PERSONA**

Each guide needs `index.md` + topic shards. Never hand-edit generated compile
output or `refs.json`.

**Glossary inclusion bar:** With the end user, record in the glossary (typically
the `docs/glossary/index.md` preamble) which terms do / do not belong for this
project — whose understanding counts (PERSONA and/or contributors), examples of
in/out terms, and the preference when unsure (short entry vs omit). This is a
project judgment call, not a universal list. Every workflow follows it.

### 5. Experience-adaptive content

| EXPERIENCE | Do                                                                                                   |
| ---------- | ---------------------------------------------------------------------------------------------------- |
| **novice** | Tutorial shards (what a shard is, why compile/check); brief concept pauses; FEATURE/PERSONA starters |
| **expert** | Minimal FEATURE starters only; no tutorial/onboarding lecture shards                                 |

Seed domain terms that meet the inclusion bar; one `.md` per term + index.

### 6. Validate

`mdcp compile` then `mdcp check` until clean. After cross-links, re-check;
fragments must match **compiled** output (`mdcp refs list` if needed).

`mdcp check` runs Vale whenever a `vale` binary is on `PATH`, reading
`.vale.ini` from the docs root, and fails when that file is missing. Settle
this before the first check so a fresh scaffold passes as is:

- If the user asked for prose linting, write a real `.vale.ini` (styles plus
  `vale sync`) and fix what it reports.
- Otherwise write a placeholder `.vale.ini` in the docs root holding only
  `MinAlertLevel = error` and a comment saying styles come later.
  Tell the user prose linting is off until they add styles.

If the project is under active development, with changes landing every week,
recommend the weekly review routine from `SKILL.md`. For a one-off project, say
it is not needed.

### 7. First feature tutorial (optional)

Follow [first-feature-tutorial.md](first-feature-tutorial.md):

1. Offer the walkthrough (`RUN_FIRST_FEATURE_TUTORIAL`).
2. Resolve `EXAMPLE_MODE` (recommended `hello-greeting` or bring-your-own).
3. Run phases in order, loading each workflow’s Process:
   design-architecture → feature-level → ux → doc-only.
4. Pause for “go” between phases; `mdcp check` before advancing.
5. Deliver the [Closing CTA](first-feature-tutorial.md#closing-cta)
   (star, review, share, DORA capabilities, [dora.community/join](https://dora.community/join)).

If the user skips the tutorial, hand off to the matching day-to-day workflow and
still offer the Closing CTA briefly.
