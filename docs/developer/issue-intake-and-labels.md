# Issue intake and labels

This page lists the board fields and labels for issues in this repository's tracker, and the checklist that sets them on a new issue. [Agent work-item tracking](./agent-work-item-tracking.md) names the tracker and says how an agent loads an issue.

## Project fields

**Status** tracks delivery, and **Track** groups work by roadmap area.

| Field     | Values                                                          | When to set                                                             |
| --------- | --------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Status    | Todo · In Progress · Done                                       | Todo on intake; In Progress on branch start; Done when the issue closes |
| Track     | 1.0 Formalization · Maintenance · Performance · Future (V2+)    | On intake                                                               |
| Milestone | Current open delivery milestone when the issue is in that scope | When it belongs in the next delivery cut                                |

Pick the Track value from [Track selection](#track-selection).

## Track selection

| Track             | Use for                                                                 |
| ----------------- | ----------------------------------------------------------------------- |
| 1.0 Formalization | System ADR, normative spec, schemas, conformance                        |
| Maintenance       | Bugs, compile/check correctness, agent-process hygiene, adoption polish |
| Performance       | SLOs, benchmarks, engine spikes (often `priority:defer`)                |
| Future (V2+)      | MCP server, hosted API, and other post-V1 delivery surfaces             |

## Auth for board writes

Issue CRUD needs the usual `repo` scope. **Adding or updating Project items needs `project` scope** on the token used by `gh` or GitHub MCP.

```bash
gh auth status
# If Project GraphQL fails with INSUFFICIENT_SCOPES / missing read:project|project:
gh auth refresh -s project
# Multi-account: switch to the repository owner's account, which has project scope
gh auth switch --user <owner>
```

Without `project` scope you can still triage labels and milestones. Note the board gaps in an issue comment and stop.

## Issue priority (value-add)

Use **one** mutually exclusive GitHub label so the board and `gh issue list` stay sortable. These labels are **issue triage priority**, not the product capability tiers in [Personas and priority tiers](../features/personas-and-priority-tiers.md).

| Label            | Meaning                                                               |
| ---------------- | --------------------------------------------------------------------- |
| `priority:P0`    | User-facing blocker or broken core path (compile / check / refs)      |
| `priority:P1`    | High near-term value, next after P0                                   |
| `priority:P2`    | Important backlog with clear value, after P1                          |
| `priority:P3`    | Nice-to-have / polish / low urgency                                   |
| `priority:defer` | Parked on an explicit gate (benchmark, V2 dependency, adopter demand) |

### How priority is set

1. **Issue forms**: the Bug report and Feedback templates require a **Value-add priority** dropdown. That choice is recorded in the issue body.
2. **Labels**: maintainers or coding agents apply the matching `priority:*` label when triaging (GitHub forms cannot map a dropdown to a label automatically). Replace any previous `priority:*` label so only one remains.
3. **What to work on next**: prefer open issues labeled `priority:P0`, then `P1`. Skip `priority:defer` until the gate in the issue body is met.

Issue templates live under `.github/ISSUE_TEMPLATE/` (bug report, feedback, adoption story, extension proposal). The adoption-story template has no priority dropdown, because it records qualitative evidence. Extension proposals use the priority dropdown and the `enhancement` type label, and maintainers usually also apply `protocol`. Pull requests use `.github/PULL_REQUEST_TEMPLATE.md`, which asks for the spec and skill versions when the change touches those surfaces.

### Other labels (apply on intake)

| Kind      | Labels                                                                      | Rule                                      |
| --------- | --------------------------------------------------------------------------- | ----------------------------------------- |
| Type      | `bug`, `enhancement`, `documentation`, `feedback`, `epic`, `adoption-story` | At least one type that matches the issue  |
| Component | `cli`, `compile`, `refs`, `sections`, `hooks`, `presets`, `lint`            | When the work touches only that component |
| Domain    | `protocol`                                                                  | Spec / positioning / formalization work   |

## New issue intake (required)

Whenever you **open** an issue or find a brand-new open issue missing hygiene, finish this checklist before you start work on it. Same rules for humans and coding agents. [Weekly issue triage](./weekly-issue-triage.md) applies the same checks to every open issue.

1. **Priority**: exactly one `priority:*` (from the form dropdown or triage judgment).
2. **Type (+ component/domain)**: see [Other labels](#other-labels-apply-on-intake).
3. **Project board**: add the issue to [project #4](https://github.com/users/betsalel-williamson/projects/4) if it's missing, and set **Status = Todo**.
4. **Track**: set per [Track selection](#track-selection).
5. **Milestone**: attach the current open delivery milestone when the issue is in that cut’s scope, and leave it empty for long-range or deferred work.
6. **Sanity**: the title says what to do, and the body has acceptance criteria or a clear problem statement.

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
    repository(owner:"betsalel-williamson", name:"Merlon Docs") {
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

Set **Status** / **Track** in the GitHub Project UI, or via `updateProjectV2ItemFieldValue` after reading field and option IDs from `projectV2 { fields(...) }` (option IDs change when the field is rebuilt, so query them each time and keep them out of committed scripts).

**GitHub MCP:** create/update the issue with labels, then add it to the user project (same project number **4**). If the MCP token lacks project scope, fall back to `gh` with a token that has `project`, or leave a comment listing the board gap for a maintainer.

### Labels via CLI

```bash
gh issue edit <N> --add-label "priority:P1" --add-label "bug" --add-label "compile"
# Replace priority: remove the old one when changing level
gh issue edit <N> --remove-label "priority:P2" --add-label "priority:P1"
```
