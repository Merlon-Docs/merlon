# `mdcp` doc-review workflow live evals

Fixtures and prompts for the optional [skill-creator](../../../../../.agents/skills/skill-creator/SKILL.md) loop against the `mdcp` skill's doc-review workflow. Not a CI gate.

Parent suite: [`tests/skills/mdcp/evals/`](../README.md).

## Layout

| Path                    | Purpose                                                                |
| ----------------------- | ---------------------------------------------------------------------- |
| `evals.json`            | Prompts, `expected_output`, named `assertions`, and optional `setup`   |
| `files/sprawl-fixture/` | Docs tree with the sprawl `mdcp review` reports, plus two quieter ones |

The fixture passes `mdcp check --skip-vale`. `mdcp review` reports two findings on it:
`index-size` on `docs/features/index.md` (15 links, no headings) and `duplicate-paragraph` for
the 30-day retention rule in three guides. The reviewer lenses have to find the rest:
`docs/features/sync-engine.md` also holds end-user reconnect steps, and `docs/client/faq.md`
narrates release history.

## Evals

1. **Whole-set review**: acting on `mdcp review` and the lenses. Expected edits are listed in the eval's `expected_output`
2. **"Edit all three copies" pressure**: change the rule once in its owner and link to it from the other two shards
3. **Active project**: review one guide, then recommend the weekly per-guide routine
4. **Rarely changing project**: the same prompt, with `setup` dating the docs commits five months back. The routine is not needed here

## `setup`

`setup.docs_commit_weeks_ago` lists commits the runner makes after the fixture commit, each
dated that many weeks before the run, touching a file under `docs/`. With `setup` present the
fixture commit itself is dated 30 weeks back. Evals 3 and 4 share a prompt and differ only in
this history.
