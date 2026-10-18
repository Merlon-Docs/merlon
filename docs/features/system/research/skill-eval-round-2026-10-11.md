# Skill eval round: harm check after aligning the skill with its docs

Evidence shard: whether aligning the `mdcp` skill's text with the docs it repeats changed what the skill does in live headless eval runs. Parent: [vision and roadmap](../00-vision-and-roadmap.md). The durable positions this record feeds are the skill contract in [Agent Skill](../../agent-skill.md) and the intake contract in [Skill workflows](../skill-workflows.md). The round before it is [Skill eval round: measured changes to the mdcp skill](./skill-eval-round-2026-10-03.md).

Measured on October 11, 2026, after the text changes were made. This record is not updated afterwards. A later round gets a new record.

## Caveats first

- The setting is the one the [October 3 record](./skill-eval-round-2026-10-03.md#caveats-first) describes: a
  headless agent session in a throwaway copy of an eval fixture, with one prompt and nobody to answer a question.
  The results cover that setting only.
- Every run used the model from the October 3 round, and a separate call to that model grades each run from the
  prompt, the tool-call list, the final message and the git diff. The transcript decides two assertions directly:
  whether the run read the expected workflow file, and whether the skill loaded at all.
- The harm checks ran once per arm. One run per arm can show a regression. It cannot prove a gain, and it cannot
  tell a regression from run-to-run noise. The October 3 round measured a range of up to 4 points across six
  runs of the same arm on the same evals, and up to 1 point across three.
- The changes under test align the skill's wording with its docs owners. They target the wording, not an eval, and no
  score was expected to move.
- The host had Vale on `PATH` and the eval fixtures have no `.vale.ini`, so `mdcp check` fails in every fixture
  where the agent runs it without `--skip-vale`. The `check_passes` assertion failed in 8 of 36 runs, every time
  with that Vale message and in both arms. Those failures measure the fixtures, not the skill.
- The grader sees each tool call cut at 200 characters. A commit message written in a heredoc passes that length
  before its hit list, so the grader cannot see whether the commit lists the files a search hit.
- The changes, the plan and the record were all written by the same author in the same session.
- Project memory was kept out of the eval agents, which the October 3 runs did not have.

## Method

- Arms: the current skill before the changes and the new skill after them. The arms differ in six
  files. `SKILL.md` says "one audience" in place of "one audience tier", its layout table takes the wording of
  the specification's default guide layout, its routing diagram sends design work to `docs/features/` and
  `docs/features/adr/`, and its weekly routine criterion counts docs changes only. The doc-only,
  design-architecture, feature-level and ux workflows branch from the integration branch that the delivery
  conventions name. The doc-only writing step allows a source link as evidence for a claim. The getting-started
  workflow seeds the terms the inclusion bar allows.
- Plan, fixed before any run: 36 runs. The evals that had never run against the current concept-removal text ran
  on the new arm only, three times each: parent 17 to 19 and doc-review 5. The harm checks ran once per arm:
  getting-started 3, doc-only 1, doc-review 1, parent 11 to 16, design-architecture 1, feature-level 1 and ux 1.
- Decision rule, fixed before any run: a change is kept unless the new arm scores below the current arm on an
  eval. When it does, both transcripts are read and the record says what changed.
- Harness: the October 3 scripts, with memory disabled for eval agents. The sandbox builder gained one fix: the
  dated docs commits that doc-review 5 needs touch the fixture's first shard when the fixture has no glossary. The
  harness, raw results and the variant diff are kept with the project's working files, outside the repository.
- After the pre-registered runs, ux 1 ran twice more per arm, because it was the one eval where the new arm
  scored lower. Those four runs are reported apart from the plan.

## Harm checks, one run per arm

Assertions passed per run.

| Eval                  | Current | New | Failed assertion                                   |
| --------------------- | ------- | --- | -------------------------------------------------- |
| getting-started 3     | 5/5     | 5/5 |                                                    |
| doc-only 1            | 5/5     | 5/5 |                                                    |
| doc-review 1          | 5/6     | 5/6 | `check_passes`, Vale, both arms                    |
| parent 11             | 3/4     | 4/4 | `compile_check_succeed`, current arm               |
| parent 12             | 4/4     | 4/4 |                                                    |
| parent 13             | 4/4     | 4/4 |                                                    |
| parent 14             | 4/4     | 4/4 |                                                    |
| parent 15             | 4/4     | 4/4 |                                                    |
| parent 16             | 4/4     | 4/4 |                                                    |
| design-architecture 1 | 5/6     | 5/6 | `advises_design_thinking_pairing`, both arms       |
| feature-level 1       | 4/4     | 4/4 |                                                    |
| ux 1                  | 5/5     | 2/5 | `primary_edits_under_client` and two more, new arm |

Every run read the expected workflow file, and the skill loaded in every run. The routing evals (parent 11
to 16) passed their routing assertions in both arms. The parent 11 difference is within the noise the October 3
round measured: the current-arm run reported a passing check without showing it.

## Evals never run against the current removal text, new arm only

| Eval                              | Runs         | Main failure                                                                                           |
| --------------------------------- | ------------ | ------------------------------------------------------------------------------------------------------ |
| parent 17, worker deleted today   | 4, 4, 5 of 5 | `commit_gives_search_and_hits` in two runs: the grader saw the commit command cut before the hit list  |
| parent 18, ADR before the removal | 3/4 ×3       | `check_passes`, Vale, in every run                                                                     |
| parent 19, ADR after the removal  | 3, 5, 4 of 5 | the same cut in two runs; in one of them the grader also counted the links to the new ADR as a mention |
| doc-review 5, untriggered routine | 1, 3, 2 of 4 | the rewrite assigns the run to "any contributor", which the eval counts as an invented role, and Vale  |

Parent 18 kept the live worker's docs and deferred the removal steps in every run, which is the behavior the
concept-removal text asks for. `commit_gives_search_and_hits` failed in 4 of 6 runs on parent 17 and 19. The grade
evidence for each failure says the commit command is cut before any hit list, and the six sandbox commits all list
the search command and the files it hit. Those failures measure the harness, not the skill. The parent 19 run that
also failed `removed_worker_docs_fixed` had removed the worker from the shards and linked the new ADR, whose file
name carries the removed concept, from the digests shard and the features index.

## The ux 1 difference

Both runs read the ux workflow file. The current-arm run created a branch, wrote a numbered happy path and a
recovery page under `docs/client/`, expanded the engine shard under `docs/features/` and said in its final
message that the wizard's states and resume behavior were its own assumptions, because the fixture holds no
wizard. The new-arm run read the same fixture, didn't find a wizard to describe, and stopped with a plan and a list of
the step names and transitions it needed from the user. It didn't change a file.

The branch step is the sentence that differs between the arms in the ux workflow file, and the new-arm run stopped
before it. `SKILL.md` differs too, in its layout table and the three other passages the method section lists,
and it was in context before the stop, since the skill loaded in every run. The record cannot attribute the stop
to one changed sentence. The stop is the "input only the user can give" pause that
[Skill workflows](../skill-workflows.md) allows, applied to invented product behavior. Whether that pause is the
right call on a fixture with no product is a question for the eval. The follow-up runs below say how often each arm
stops.

### Follow-up: two more runs per arm

| Arm     | Runs         | What the lower runs did                                                                         |
| ------- | ------------ | ----------------------------------------------------------------------------------------------- |
| Current | 5, 3, 5 of 5 | one run rewrote the engine shard and left the client quick start as a one-line pointer          |
| New     | 2, 4, 5 of 5 | one run stopped to ask for the wizard's steps; one run put most of its text in the engine shard |

Across three runs each, the current arm ranges over 2 points and the new arm over 3, and the two ranges overlap.
Both arms stopped or wrote only part of the request in one run or more, each time saying that the fixture contains
nothing to describe. The one-run regression in the plan is inside that spread. These four runs were added after
the plan. They read the noise around one eval. They are not a second pre-registered test.

## Cost

| Runs           | Agent runs | Run tokens | Run cost (API-equivalent) | Grading tokens | Grading cost |
| -------------- | ---------- | ---------- | ------------------------- | -------------- | ------------ |
| Plan           | 36         | 22.7M      | $8.14                     | 0.49M          | $0.92        |
| ux 1 follow-up | 4          | 2.2M       | $0.76                     | 0.05M          | $0.11        |

## What this feeds

- The changed skill files are kept as committed. Ux 1 is the one harm check whose new-arm run scored lower. The
  follow-up runs put the difference inside the arm's own spread, and that spread is what the decision rests on.
- Ux 1's fixture has no product behind the request. A run that refuses to invent one scores 2 of 5, and a run
  that invents one and says so scores 5 of 5. The eval measures willingness to invent, which the suite's owner
  can decide to keep or change.
- The grader needs the commit message, not the cut commit command. Giving the grader the sandbox's `git log -1`
  output, or raising the trace cut for commit commands, would let `commit_gives_search_and_hits` measure the
  commit.
- A `.vale.ini` in each fixture, or a `--skip-vale` note in the prompts, would let `check_passes` measure the
  skill on a host that has Vale installed.
