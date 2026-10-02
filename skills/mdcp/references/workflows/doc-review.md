# Doc-review workflow

> Loaded by the `mdcp` skill. Its hard rules, QA principles, and **What
> belongs where** apply throughout. The `mdcp` CLI must be installed.

A shard read alone usually looks fine. Sprawl only shows across shards. The same rule
turns up in five places, or a guide index grows into a flat list, or a shard
takes on a second job and needs [idea mitosis](../shard-responsibility.md). This workflow reviews the docs as a
set and then consolidates, splits, moves, or rewords.

Run it when the user asks for a docs review, cleanup, or reorganization, and also
**without being asked** when one of the sprawl triggers in `SKILL.md` matches. Nobody
should have to notice the sprawl first.

## Role

You are four reviewers in one pass: product manager, staff engineer, technical
writer, and designer. Each catches what the others miss.

## Intake

Ask only for what you cannot discover:

1. **SCOPE**: the whole docs root (default), one guide, or the shards a recent
   change touched. For one guide, run `mdcp review --guide <name>` in Step 1
   and read that guide in Step 2. Its duplicates with other guides still count.
2. **WORK_ITEM_LOOKUP**: where delivery conventions live (branching, review),
   when you will commit changes.

## Process

### Step 1: Mechanical pass

```bash
mdcp compile
mdcp check
mdcp review
mdcp review --json
```

Fix `mdcp check` failures first. They are errors. Treat each `mdcp review`
finding as a candidate for a decision:

| Signal                | What it means                                               |
| --------------------- | ----------------------------------------------------------- |
| `index-size`          | A guide index lists many entries with no grouping headings  |
| `long-shard`          | A shard is long enough that it may be doing two jobs        |
| `duplicate-paragraph` | The same paragraph appears in more than one shard           |
| `similar-titles`      | Shards in one guide share a title, so they may need merging |

Give each finding a decision from Step 3. "Leave" is a valid decision when the
hit is correct where it is, such as a long reference table that is one job.

### Step 2: Read as four reviewers

Read each guide `index.md` first, then the shards the findings point at, then
sample the rest. The checklists are in [review lenses](../review/lenses.md).

| Lens             | Asks                                                                                           |
| ---------------- | ---------------------------------------------------------------------------------------------- |
| Product manager  | Can a new reader learn what this is, why it matters, and what it does for them in a few pages? |
| Staff engineer   | Is it true of the code today? Is each rule stated once, with the enforcing check named?        |
| Technical writer | Does each shard have one audience, one job, and canonical glossary words?                      |
| Designer         | Can a reader find any page in two clicks? Does each index read as a map?                       |

### Step 3: Decide each finding

Pick one action per finding and record why in one line:

| Action | When                                                                   |
| ------ | ---------------------------------------------------------------------- |
| Merge  | Shards with the same job and audience; keep the better-placed one      |
| Split  | One shard with two audiences, two jobs, or two concerns (idea mitosis) |
| Move   | The shard's audience or job belongs to a different guide               |
| Reword | Wrong term, history narration, or a person's name used for a role      |
| Link   | A rule restated elsewhere; keep it in its owner and link from the rest |
| Delete | Superseded text, temporary status, or a backlog in a durable shard     |
| Leave  | The finding is correct where it is                                     |

How to do each without breaking links is the
[consolidation playbook](../review/consolidation.md).

### Step 4: Apply in commit groups

Plan [atomic commit groups](../../SKILL.md#quality-assurance-qa-principles) before
editing, one concern per group: moves, then merges and splits, then rewording,
then index changes. After each group:

```bash
mdcp compile
mdcp check
mdcp review
```

A group is done when `mdcp check` passes and the findings you acted on are gone
from `mdcp review`.

### Step 5: Raise the floor

When the same finding keeps coming back, make it mechanical so the next review
does not depend on someone reading closely: tune the `review` thresholds in
`mdcp.config.json`, add a glossary entry for the term that keeps drifting, or add
a Vale rule for the wording. Narrow a rule that flags the wrong thing; do not
switch it off wholesale.

## Weekly routine

For a project whose docs change every week, the `mdcp` skill recommends running
this workflow weekly, once per guide, with **SCOPE** set to that guide (see
**Weekly review routine** in `SKILL.md`). Reviewing guides one at a time keeps
each run small enough to read every shard. Duplicates are the main target:
pick the one shard that states each repeated rule and link to it from the others.
Skip the routine for one-off projects and projects that change only now and
then.

## Never

- Edit compiled output. Fix the shard and recompile.
- Rename or move a shard without updating every link to it in the same commit.
- Leave a superseded paragraph beside its replacement.
- Put tickets, dated status, or backlogs in a durable shard.
- Rename an identifier in code to match a prose term. Code keeps its names.
