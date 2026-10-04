# Weekly issue triage

This run is **advisory**, because no workflow in this repo schedules it. Run it about once a week (a maintainer, or a coding agent with project scope). Goal: board and labels match reality, and stale or duplicate tickets get a **human verification prompt** instead of a silent close. It checks issues against the conventions in [Agent work-item tracking](./agent-work-item-tracking.md).

A run that changes something leaves its evidence in the tracker. Step 5 leaves a **Triage** comment on each stale candidate, and step 6 leaves a comment that links the canonical issue. Whatever steps 2 to 4 change shows in each issue's history. A run that finds nothing to change doesn't leave a trace, so in the tracker a quiet week looks the same as a skipped one.

## Checklist

1. **Auth**: `gh auth status` shows `project` (or `read:project` at minimum for reads; writes need `project`). Switch to the owner account if needed ([Auth for board writes](./agent-work-item-tracking.md#auth-for-board-writes)).
2. **Open vs board**: list open issues and add any missing ones ([New issue intake](./agent-work-item-tracking.md#new-issue-intake-required) steps 3 to 5). Every open issue must appear on the board.
3. **Label audit**: every open delivery issue has exactly one `priority:*` and a sensible type label. Add component or domain labels when obvious.
4. **Milestone hygiene**: keep only active delivery milestones open. Attach in-scope issues to the current cut.
5. **Stale review**: candidates are issues whose acceptance the repo already meets or whose approach was superseded, plus issues with no remaining adopter value. On each candidate, **comment** asking the human to verify close-without-action ([Human verification comment](#human-verification-comment-stale--close-without-action)). Do **not** close until they reply.
6. **Duplicate review**: if two issues share the same root cause, comment with the canonical issue and ask which to keep. Do **not** close as duplicate without confirmation (related ≠ duplicate).
7. **Next work**: check that the top open `priority:P0` issue (or `P1` when no P0 is open) matches the current milestone intent. Note it briefly for maintainers.
8. **Done clutter**: closed issues may linger on the board as Done. Cleanup is optional, and a green weekly run doesn't need it.

## Human verification comment (stale / close-without-action)

```markdown
**Triage (YYYY-MM-DD):** Candidate to close without further action — please verify.

Evidence:

- <1–3 bullets: current docs/code that satisfy ACs, superseded approach, or no remaining value>

Options:

- Reply `close: completed` if done enough
- Reply `close: not_planned` if abandoned
- Reply `keep` + note if work remains (we will narrow acceptance criteria)

No auto-close until you confirm.
```

## Suggested commands

```bash
# Open issues (labels + milestone)
gh issue list --repo betsalel-williamson/mdcp --state open --limit 100 \
  --json number,title,labels,milestone,updatedAt

# Priority queue
gh issue list --repo betsalel-williamson/mdcp --state open --label "priority:P0"
gh issue list --repo betsalel-williamson/mdcp --state open --label "priority:P1"

# Issues on the current delivery milestone (replace <milestone> with its title)
gh issue list --repo betsalel-williamson/mdcp --milestone "<milestone>" --state open
```

Compare the open-issue set to the board (Project UI filter, or GraphQL `projectV2.items`) and add gaps via [Add an issue to the board](./agent-work-item-tracking.md#add-an-issue-to-the-board-gh).
