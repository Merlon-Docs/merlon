# Agent work-item tracking

How coding agents load tracker issues and delivery conventions **for this repository**. The work-item workflows of the [MDCP skill](../../docs/skills.md) (installed alongside the MDCP CLI) point here via `WORK_ITEM_LOOKUP`.

**This repo’s work-item lookup system uses GitHub** for both **issues** (acceptance, discussion, `Closes #N`) and **project planning** (the Project board below — status, track, roadmap grouping). Do not invent a second tracker or stuff tickets / sprint backlogs into durable `docs/` shards; load scope from GitHub via this shard.

Configure an equivalent shard in consumer repos during [local setup](./local-setup.md) (point `WORK_ITEM_LOOKUP` at whatever issue tracker and project-planning host that repo uses).

## Tracker

```text
Host=GitHub (betsalel-williamson/mdcp)
Issues=https://github.com/betsalel-williamson/mdcp/issues/  (record WORK_ITEMs here)
Project board=https://github.com/users/betsalel-williamson/projects/4  (project plan / delivery board)
Issue base URL=https://github.com/betsalel-williamson/mdcp/issues/
WORK_ITEM=enough to resolve the issue — number, URL, or short name/description
```

All repo issues live on the public [MarkDown Context Protocol project board](https://github.com/users/betsalel-williamson/projects/4). **Status** tracks delivery (Todo / In Progress / Done); **Track** groups work by roadmap area. Move items to **In Progress** when you start a branch; set **Done** when the issue closes. Every open issue should appear on that board.

### Project fields

| Field     | Values                                                          | When to set                                     |
| --------- | --------------------------------------------------------------- | ----------------------------------------------- |
| Status    | Todo · In Progress · Done                                       | Todo on intake; In Progress on branch start     |
| Track     | 1.0 Formalization · Maintenance · Performance · Future (V2+)    | On intake ([Track selection](#track-selection)) |
| Milestone | Current open delivery milestone when the issue is in that scope | When it belongs on the next ship slice          |

### Track selection

| Track             | Use for                                                                 |
| ----------------- | ----------------------------------------------------------------------- |
| 1.0 Formalization | Protocol ADR, normative spec, schemas, conformance                      |
| Maintenance       | Bugs, compile/check correctness, agent-process hygiene, adoption polish |
| Performance       | SLOs, benchmarks, engine spikes (often `priority:defer`)                |
| Future (V2+)      | MCP server, hosted API, and other post-V1 delivery surfaces             |

If the board still shows other Track options, do **not** assign them to new work — use one of the rows above.

## Auth for board writes

Issue CRUD needs the usual `repo` scope. **Adding or updating Project items needs `project` scope** on the token used by `gh` or GitHub MCP.

```bash
gh auth status
# If Project GraphQL fails with INSUFFICIENT_SCOPES / missing read:project|project:
gh auth refresh -s project
# Multi-account: use the owner account that has project scope
gh auth switch --user betsalel-williamson
```

Without `project` scope you can still triage labels and milestones; note board gaps in the issue comment and stop — do not invent a second tracker.

## Issue priority (value-add)

Use **one** mutually exclusive GitHub label so the board and `gh issue list` stay sortable. These labels are **issue triage priority**, not the product capability tiers in [Personas and priority tiers](../features/personas-and-priority-tiers.md).

| Label            | Meaning                                                               |
| ---------------- | --------------------------------------------------------------------- |
| `priority:P0`    | User-facing blocker or broken core path (compile / check / refs)      |
| `priority:P1`    | High near-term value — do next after P0                               |
| `priority:P2`    | Important backlog — clear value, not next                             |
| `priority:P3`    | Nice-to-have / polish / low urgency                                   |
| `priority:defer` | Parked on an explicit gate (benchmark, V2 dependency, adopter demand) |

### How priority is set

1. **Issue forms** — Bug report and Feedback templates require a **Value-add priority** dropdown. That choice is recorded in the issue body.
2. **Labels** — Maintainers or coding agents apply the matching `priority:*` label when triaging (GitHub forms cannot map a dropdown to a label automatically). Replace any previous `priority:*` label so only one remains.
3. **What to work on next** — Prefer open issues labeled `priority:P0`, then `P1`. Skip `priority:defer` until the gate in the issue body is met.

Issue templates live under `.github/ISSUE_TEMPLATE/` (bug report, feedback, adoption story, extension proposal). Adoption stories do not require a priority dropdown (qualitative evidence, not a delivery backlog item). Extension proposals use the priority dropdown and the `enhancement` type label; maintainers usually also apply `protocol`. Pull requests use `.github/PULL_REQUEST_TEMPLATE.md`, which asks for protocol/skill version when the change touches those surfaces.

### Other labels (apply on intake)

| Kind      | Labels                                                           | Rule                                       |
| --------- | ---------------------------------------------------------------- | ------------------------------------------ |
| Type      | `bug`, `enhancement`, `documentation`, `feedback`, `epic`        | At least one type that matches the issue   |
| Component | `cli`, `compile`, `refs`, `sections`, `hooks`, `presets`, `lint` | When the work is localized to that surface |
| Domain    | `protocol`                                                       | Spec / positioning / formalization work    |

## New issue intake (required)

Whenever you **open** an issue or find a brand-new open issue missing hygiene, finish this checklist before starting implementation. Same rules for humans and coding agents.

1. **Priority** — exactly one `priority:*` (from the form dropdown or triage judgment).
2. **Type (+ component/domain)** — see [Other labels](#other-labels-apply-on-intake).
3. **Project board** — add the issue to [project #4](https://github.com/users/betsalel-williamson/projects/4) if absent; set **Status = Todo**.
4. **Track** — set per [Track selection](#track-selection).
5. **Milestone** — attach the current open delivery milestone when the issue is in that cut’s scope; leave empty for long-range or deferred work.
6. **Sanity** — title is actionable; body has acceptance criteria or a clear problem statement.

### Add an issue to the board (`gh`)

Resolve the project and issue node IDs, then add the item (requires `project` scope):

```bash
# Project #4 under the user account
PROJECT_ID=$(gh api graphql -f query='
  query { user(login:"betsalel-williamson") {
    projectV2(number:4) { id }
  }}' --jq '.data.user.projectV2.id')

ISSUE_NODE=$(gh api graphql -f query='
  query($n:Int!) {
    repository(owner:"betsalel-williamson", name:"mdcp") {
      issue(number:$n) { id }
    }
  }' -F n=<N> --jq '.data.repository.issue.id')

gh api graphql -f query='
  mutation($project:ID!, $content:ID!) {
    addProjectV2ItemById(input:{projectId:$project, contentId:$content}) {
      item { id }
    }
  }' -f project="$PROJECT_ID" -f content="$ISSUE_NODE"
```

Set **Status** / **Track** in the GitHub Project UI, or via `updateProjectV2ItemFieldValue` after reading field and option IDs from `projectV2 { fields(...) }` (option IDs change if the field is rebuilt — always re-query; do not hard-code them in scripts committed to the repo).

**GitHub MCP:** create/update the issue with labels, then add it to the user project (same project number **4**). If the MCP token lacks project scope, fall back to `gh` with a token that has `project`, or leave a comment listing the board gap for a maintainer.

### Labels via CLI

```bash
gh issue edit <N> --add-label "priority:P1" --add-label "bug" --add-label "compile"
# Replace priority: remove the old one when changing level
gh issue edit <N> --remove-label "priority:P2" --add-label "priority:P1"
```

## Weekly triage run

Run **about once a week** (maintainer or coding agent with project scope). Goal: board and labels match reality; stale or duplicate tickets get a **human verification prompt** — never silent close-without-action.

### Checklist

1. **Auth** — `gh auth status` shows `project` (or `read:project` at minimum for reads; writes need `project`). Switch to the owner account if needed.
2. **Open vs board** — list open issues; add any missing ones (intake steps 3–5). Every open issue must appear on the board.
3. **Label audit** — every open delivery issue has exactly one `priority:*` and a sensible type label; add component/domain when obvious.
4. **Milestone hygiene** — keep only active delivery milestones open; attach in-scope issues to the current cut.
5. **Stale review** — candidates: acceptance already met in the repo, superseded approach, or no remaining adopter value. On each candidate, **comment** asking the human to verify close-without-action ([Human verification comment](#human-verification-comment-stale--close-without-action)). Do **not** close until they reply.
6. **Duplicate review** — if two issues share the same root cause, comment with the canonical issue and ask which to keep. Do **not** close as duplicate without confirmation (related ≠ duplicate).
7. **Next work** — confirm the top open `priority:P0`, else `P1`, matches the current milestone intent; note it briefly for maintainers.
8. **Done clutter** — closed issues may linger on the board as Done; optional cleanup is fine, not required for a green weekly run.

### Human verification comment (stale / close-without-action)

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

### Suggested commands

```bash
# Open issues (labels + milestone)
gh issue list --repo betsalel-williamson/mdcp --state open --limit 100 \
  --json number,title,labels,milestone,updatedAt

# Priority queue
gh issue list --repo betsalel-williamson/mdcp --state open --label "priority:P0"
gh issue list --repo betsalel-williamson/mdcp --state open --label "priority:P1"

# Issues on the current delivery milestone (replace title as needed)
gh issue list --repo betsalel-williamson/mdcp --milestone "v0.7" --state open
```

Compare the open-issue set to the board (Project UI filter, or GraphQL `projectV2.items`) and add gaps via [Add an issue to the board](#add-an-issue-to-the-board-gh).

## Load scope (pick what your agent has)

**GitHub CLI** (when `gh` is on `PATH` and authenticated):

```bash
gh issue view <number> --comments
```

**GitHub MCP** (when enabled in Cursor or another host): use GitHub issue tools to fetch the issue named in `WORK_ITEM` — title, body, labels, and comments.

If none of the above apply, inspect enabled MCP tool descriptors or run `gh --help` / `gh issue view --help` before guessing commands.

## Git and delivery

```text
Integration branch=main (pull before branching)
Feature branches=descriptive (e.g. feature/issue-29-default-compile-hooks)
One branch per WORK_ITEM=do not mix unrelated features, designs, or doc scopes in one PR
Branch before work=create the feature branch before shards, tests, or code
Commits=conventional; one concern per commit ([Atomic commit groups](../glossary/atomic-commit-groups.md))
Atomic commit groups=coding and multi-concern plans MUST list numbered groups before “go” (id/name, one concern, exact files, conventional commit subject); after approval, `git commit` one group at a time — do not squash unrelated concerns
Release notes=changeset in .changeset/ for published package changes (temporary until versioned into CHANGELOGs)
Docs=describe current behavior only; removed or breaking behavior belongs in changeset → package CHANGELOG, not feature/client shards
ADRs=docs/features/adr/ (scope/removal decisions; link CHANGELOGs, never pending .changeset/*.md)
Code review=gh pr create; link WORK_ITEM in PR body (Closes #N when appropriate)
```

The skill's QA principles and its day-to-day workflows encode the same rule so plan-only agents inherit it: [Agent Skill](../features/agent-skill.md#quality-assurance-qa-principles), [Skill workflows](../features/protocol/skill-workflows.md).

## Workflow best practices

1. **Load scope** — fetch WORK_ITEM (title, body, acceptance criteria) before planning or editing.
2. **Branch first** — `git checkout main`, pull, then `git checkout -b feature/...` tied to the issue. Never start on `main`.
3. **Stay focused** — one feature or design at a time. Treat acceptance criteria as the boundary unless WORK_ITEM explicitly expands scope.
4. **Plan Atomic commit groups** — before waiting for human review / implementation, include numbered commit groups for multi-concern work (see [Git and delivery](#git-and-delivery)). After approval, land one group per commit.
5. **Docs describe now** — update shards to match as-built behavior. Do not document superseded workflows in `docs/features/` or `docs/client/`; record consumer notice in the changeset (lands in package CHANGELOGs). Never link durable shards or ADRs to pending `.changeset/*.md` files.
6. **Add a changeset** — run `pnpm changeset` (or manually create a `.changeset/*.md` file) if you changed published package behavior. This is required for release notes and versioning.
7. **Issue intake** — when opening or first touching an issue, complete [New issue intake](#new-issue-intake-required) (labels, board, Track, Status, milestone).
8. **Weekly triage** — once a week, run [Weekly triage run](#weekly-triage-run); prompt humans before closing stale or duplicate tickets.

## Example intake answers

When a subagent asks for scope, answers can look like:

```text
WORK_ITEM=70
WORK_ITEM_LOOKUP=docs/developer/agent-work-item-tracking.md
```

```text
WORK_ITEM=bare sibling link rewrite
WORK_ITEM_LOOKUP=GitHub
```

`WORK_ITEM` may be an issue number, URL, or a short name/description the agent can resolve. `WORK_ITEM_LOOKUP` may be this shard path or a plain location (e.g. GitHub) that points the agent at the tracker conventions here. For the helper skills catalog and invoke recipes, read [`docs/skills.md`](../../docs/skills.md).
