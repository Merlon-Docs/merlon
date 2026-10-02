# `mdcp` getting-started workflow live evals

Fixtures and prompts for the optional [skill-creator](../../../../../.agents/skills/skill-creator/SKILL.md) loop against the `mdcp` skill's getting-started workflow. Not a CI gate.

Parent suite: [`tests/skills/mdcp/evals/`](../README.md).

## Layout

| Path                     | Purpose                                                                 |
| ------------------------ | ----------------------------------------------------------------------- |
| `evals.json`             | Prompts, `expected_output`, and named `assertions` for bootstrap checks |
| `files/greenfield-npm/`  | Empty npm project (no docs root) — evals 1 and 3                        |
| `files/greenfield-pnpm/` | Empty pnpm project (no docs root) — eval 2                              |
| `files/brownfield/`      | Legacy monolith docs, no MDCP layout — eval 4                           |

## What the suite covers

1. **Expert greenfield (npm)** — concise bootstrap; no tutorial shards; compile/check
2. **Novice greenfield (pnpm)** — tutorial shards + concept explanations; prefer pnpm
3. **Intake skip + glossary seed** — FEATURE/PERSONA/EXPERIENCE already given; glossary term; validate
4. **Brownfield** — preserve legacy files, migrate into shards, mark ready to archive after review
5. **First-feature tutorial** — after novice bootstrap, recommended `hello-greeting` walkthrough (design → feature → UX → doc-only) + Closing CTA (star/feedback, dora.dev/ai, dora.community/join)

## Run path (skill-creator)

1. Ensure `.agents/skills/skill-creator/` is present (vendored in this repo).
2. Load the subject skill from `skills/mdcp/` (workflow: `references/workflows/getting-started.md`).
3. Copy the listed `files` into an isolated working tree per run (do not bootstrap inside this monorepo’s real `docs/`).
4. Follow skill-creator: spawn **with_skill** and **without_skill** baselines together.
5. Write results under `.agents/skills/mdcp-getting-started-workspace/iteration-N/` (gitignored via `*-workspace/`).

```text
.agents/skills/mdcp-getting-started-workspace/
  iteration-1/
    eval-1-expert-greenfield-npm/
      eval_metadata.json
      with_skill/outputs/
      without_skill/outputs/
    eval-2-novice-greenfield-pnpm/
    eval-3-intake-glossary/
    eval-4-brownfield/
    eval-5-first-feature-tutorial/
    benchmark.json
```

6. Grade assertions; aggregate; open the viewer (`eval-viewer/generate_review.py`, use `--static` when headless).
7. If skill body fixes are needed, edit `skills/mdcp/references/workflows/getting-started.md` then sync via `pnpm skill:install`.

**Improving the skill:** snapshot the prior pack under `skill-snapshot/` and compare `with_skill` (new) vs `old_skill` (snapshot), not blank without_skill.
