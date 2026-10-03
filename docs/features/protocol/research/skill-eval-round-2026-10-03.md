# Skill eval round: measured changes to the mdcp skill

Evidence shard: which changes to the `mdcp` skill beat run-to-run noise in live headless eval runs, and which did not. Parent: [Vision and roadmap](../00-vision-and-roadmap.md). The durable position this record feeds is the intake contract in [Skill workflows](../skill-workflows.md).

Measured on October 3, 2026 against the skill as it stood before the changes. This record is not updated afterwards. A later round gets a new record.

## Caveats first

- Every run is a headless agent session in a throwaway copy of an eval fixture: one prompt, and nobody answers
  questions. These results cover that setting only, not sessions where a person answers.
- Every run used the model from the October 2 runs, and a separate call to that model grades each run from the
  prompt, the tool-call list, the final message and the git diff. The transcript decides two assertions directly:
  whether the run read the expected workflow file, and whether the skill loaded at all.
- The fixtures, the new evals and the changes were all written by the same author in the same session.
- Project memory leaked into the eval agents. The host session's memory store was visible to the agents, and
  122 of the 199 runs had one or more project memory notes recalled into context. Both arms were exposed, and no run wrote to
  memory. The harness now disables memory for eval agents, but none of the runs below had that fix.
- After measurement, the wording of the layout table was edited for style: the heading changed, "shape" became
  "layout", and two verbs changed. The committed wording was not re-measured.
- With three runs per arm, the decision rule below guards against noise but is not a significance test.

## Method

- Arms: the current skill and one variant per change. Each variant differs from the current skill
  by one change. Each change ran three times on every eval it targets, plus evals it could make worse.
- Decision rule, fixed before any variant ran: sum the scores of the affected evals within each run, giving three
  totals per arm. A change is kept when the mean gain is larger than the baseline's range across its three totals,
  and at least one assertion.
- Budget: two rounds of 100 runs, with a stop and a token report after the first.
- Harness: a reworked copy of the October 2 scripts that prepares each sandbox, runs the agent with edits
  accepted and a command allowlist, six runs in parallel, then grades and sums. The harness, raw results and
  variant diffs are kept with the project's working files, outside the repository.

## Eval gaps closed

Added to `tests/skills/mdcp/evals/` in the same change:

- A doc-review suite (4 evals) with a sprawl fixture. `mdcp review` reports two findings on the fixture, and the
  reviewer lenses have to find two more.
- Routing evals parent 11 to 16, whose prompts name neither the skill nor a workflow.
- Fixtures for parent evals 1 to 5, which had none.

Baseline on the new evals, three runs each (assertions passed per run):

| Eval                                  | Runs         | Main failure                                     |
| ------------------------------------- | ------------ | ------------------------------------------------ |
| doc-review 1, whole-set review        | 6/6 ×3       |                                                  |
| doc-review 2, "edit all three copies" | 2/3 ×3       | edits every copy instead of linking to one owner |
| doc-review 3 and 4, routine question  | 3/3 ×3 each  |                                                  |
| parent 1, bootstrap                   | 0/3 ×3       | stops to ask intake questions; no files          |
| parent 2, compile and validate        | 2/2 ×3       |                                                  |
| parent 3, heading link                | 0/1 ×3       | checks the link by hand, never runs `mdcp check` |
| parent 4, load context                | 0/2 ×3       | reads indexes only                               |
| parent 5, remove backlog              | 2, 2, 1 of 2 |                                                  |
| parent 11, routing: getting-started   | 4/4 ×3       |                                                  |
| parent 12, routing: doc-only          | 3, 3, 4 of 4 | skill not loaded in two runs                     |
| parent 13, routing: design            | 3/4 ×3       | stops to ask intake questions                    |
| parent 14, routing: feature-level     | 3/4 ×3       | skill not loaded in any run                      |
| parent 15, routing: ux                | 2/4 ×3       | stops to ask intake questions                    |
| parent 16, routing: doc-review        | 4/4 ×3       |                                                  |

## Changes and results

Scores are the summed totals of the affected evals, one per run.

| Change                                   | Affected evals                                           | Current skill          | Variant                | Range | Verdict |
| ---------------------------------------- | -------------------------------------------------------- | ---------------------- | ---------------------- | ----- | ------- |
| Vale placeholder in getting-started      | getting-started 1, 3 (of 12)                             | 11, 11, 11             | 12, 12, 12             | 0     | kept    |
| When nobody can answer (headless intake) | ux 1, parent 1, 13, 15 (of 16)                           | 7, 7, 7                | 15, 15, 13             | 0     | kept    |
| Requested-layouts table                  | design 1, 2, doc-review 2, ux 3 (of 21)                  | 10, 10, 11             | 19, 19, 18             | 1     | kept    |
| Trigger description                      | parent 12, 14 (of 8)                                     | 6, 6, 7                | 8, 8, 8                | 1     | kept    |
| Squash note in atomic commit groups      | doc-only 4, ux 4, feature 6, design 4, parent 10 (of 20) | 17, 14, 17, 18, 14, 17 | 17, 19, 20, 18, 19, 18 | 4     | lost    |

Harm checks:

- The headless change was also run on ux 4 and doc-only 4, which ask for a plan and a stop. Both still stopped in
  every run. Ux 4 scored 2, 3, 2 against the current skill's six-run range of 1 to 3. Doc-only 4 scored 3, 3, 3
  against a range of 2 to 4.
- The trigger change was run on four unrelated requests (a CSS colour, a dependency bump, a Python function, an API
  status check) in a fixture with a `docs/` folder. The skill loaded in none of the 12 variant runs and none of the 4
  current-skill runs.
- The layout table did not move ux 3: both arms edited the decoy source file named in the prompt, in all three
  runs.

### What lost

- **Squash note.** One sentence in the atomic commit groups principle, saying that a request for one squash commit
  is about how history lands and does not remove the groups from the plan. Over six runs per arm, the mean rose
  from 16.2 to 18.5 of 20, a gain smaller than the current skill's range of 4.
  Most of the remaining failures are doc-only 4, where the plan still lists one group in five of six variant runs.

### All kept changes together

One run per eval with all four kept changes applied, 18 evals. Every eval scored at least its single-change
result except two:

- Parent 10 scored 1 of 4: the plan dropped the commit groups section under squash pressure. That is below all six
  current-skill runs (3 to 4). One run cannot separate an interaction from noise.
- Doc-review 2 scored 2 of 3, failing `says_31_days`, as one of the three layout-variant runs also did.

## Research that shaped the changes

Each change follows published guidance.

- **Explain the reason instead of adding all-caps rules.** The layout table gives a reason ("comes from time
  pressure rather than a decision about the docs") instead of more NEVER lines.
  [skill-creator](https://raw.githubusercontent.com/anthropics/skills/main/skills/skill-creator/SKILL.md);
  [prompting best practices](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices).
- **Keep gotchas in `SKILL.md`.** The layout table and the headless section are near the top of `SKILL.md`,
  not in a workflow file the agent may not open.
  [agentskills best practices](https://raw.githubusercontent.com/agentskills/agentskills/main/docs/skill-creation/best-practices.mdx);
  [Claude Code skills](https://code.claude.com/docs/en/skills).
- **Show the case, not only the rule.** The table pairs each request with what to do instead.
  [Agent Skills best practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices).
- **Proceed when nobody is watching.** The headless section takes its pause list from Anthropic's guidance: stop
  only for a destructive step, a real change of scope, or input only the user can give.
  [Prompting guide](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-fable-5).
- **Descriptions undertrigger, so list the contexts.** The description now names plain feature, bugfix and docs-fix
  requests "even when the user never mentions docs or MDCP".
  [skill-creator](https://raw.githubusercontent.com/anthropics/skills/main/skills/skill-creator/SKILL.md).
- **Solve, don't punt.** A missing `.vale.ini` gets a default file instead of a failed check.
  [Agent Skills best practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices).

## Tracker findings from this round

- #282: `mdcp check` passes a cross-shard link whose `#fragment` doesn't match a heading.
- #283: `mdcp check` fails a fresh scaffold when Vale is installed and `.vale.ini` is missing.
- #284: the Vale step gets the wrong scan paths when `--docs-root` is relative.

## Cost

| Round | Agent runs | Run tokens | Run cost (API-equivalent) | Grading tokens | Grading cost |
| ----- | ---------- | ---------- | ------------------------- | -------------- | ------------ |
| 1     | 99         | 45.9M      | $21.88                    | 1.58M          | $3.28        |
| 2     | 100        | 37.8M      | $19.23                    | 1.13M          | $2.23        |

## What this feeds

- The intake contract in [Skill workflows](../skill-workflows.md), changed in the same branch to match the headless
  behaviour.
- The live-eval suite inventory in the developer guide's live skill evals page.
- The squash weakness is unresolved; a check that fails a plan without a commit groups section (plan-validate-execute)
  is the untested next idea.
