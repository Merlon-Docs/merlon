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

| Field     | Values                                                          | When to set                                 |
| --------- | --------------------------------------------------------------- | ------------------------------------------- |
| Status    | Todo · In Progress · Done                                       | Todo on intake; In Progress on branch start |
| Track     | 1.0 Formalization · Maintenance · Performance · Future (V2+)    | On intake                                   |
| Milestone | Current open delivery milestone when the issue is in that scope | When it belongs in the next delivery cut    |

Pick the Track value from [Track selection](#track-selection).

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

Whenever you **open** an issue or find a brand-new open issue missing hygiene, finish this checklist before you start work on it. Same rules for humans and coding agents. [Weekly issue triage](./weekly-issue-triage.md) applies the same checks to every open issue.

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

## Load scope (pick what your agent has)

**GitHub CLI** (when `gh` is on `PATH` and authenticated):

```bash
gh issue view <number> --comments
```

**GitHub MCP** (when enabled in Cursor or another host): use GitHub issue tools to fetch the issue named in `WORK_ITEM` — title, body, labels, and comments.

If none of the above apply, inspect enabled MCP tool descriptors or run `gh --help` / `gh issue view --help` before guessing commands.

## Git and delivery

[Landing on `develop`](./versioning-and-releases.md#landing-on-develop) owns how a pushed branch reaches `develop`, and [When to add a changeset](./versioning-and-releases.md#when-to-add-a-changeset) owns release notes. Commit grouping belongs to [Atomic commit groups (plan obligation)](../features/protocol/skill-workflows.md#atomic-commit-groups-plan-obligation), and decisions to remove or reject a feature belong to the [architecture decision records](../features/adr/index.md). The conventions below tie a landing to its work item:

```text
Branch names=land/<issue>-<slug> (e.g. land/issue-29-default-compile-hooks); agent sessions use their claude/** branch
One branch per WORK_ITEM=do not mix unrelated features, designs, or doc scopes in one landing
Branch before work=branch from an up-to-date develop before shards, tests, or code; never commit on develop or main
Commits=conventional commit subjects; one concern per commit
Landing=push the branch; put "Closes #N" in the commit message
```

## Workflow best practices

1. **Load scope**: fetch WORK_ITEM (title, body, acceptance criteria) before planning or editing.
2. **Branch first**: follow [Git and delivery](#git-and-delivery).
3. **Stay focused**: one feature or design at a time. Treat acceptance criteria as the boundary unless WORK_ITEM explicitly expands scope.
4. **Plan atomic commit groups**: list them in a coding or multi-concern plan before review, as [Atomic commit groups (plan obligation)](../features/protocol/skill-workflows.md#atomic-commit-groups-plan-obligation) requires. After approval, commit one group at a time.
5. **Docs describe now**: update shards to match as-built behavior, and keep consumer notices out of durable shards ([Durable docs vs pending changesets](./versioning-and-releases.md#durable-docs-vs-pending-changesets)).
6. **Add a changeset**: see [When to add a changeset](./versioning-and-releases.md#when-to-add-a-changeset).
7. **Issue intake**: when opening or first touching an issue, complete [New issue intake](#new-issue-intake-required) (labels, board, Track, Status, milestone).
8. **Weekly triage**: run the advisory [Weekly issue triage](./weekly-issue-triage.md). It asks humans to confirm before any stale or duplicate ticket is closed.

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

`WORK_ITEM` may be an issue number, URL, or a short name/description the agent can resolve. `WORK_ITEM_LOOKUP` may be this shard path or a plain location (e.g. GitHub) that points the agent at the tracker conventions here. For the skill's workflows and how to invoke them, read [`docs/skills.md`](../../docs/skills.md).
