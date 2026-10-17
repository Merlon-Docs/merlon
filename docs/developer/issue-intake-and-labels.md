# Issue intake and labels

This page lists the board fields and labels for issues in this repository's tracker, and the checklist that sets them on a new issue. [Agent work-item tracking](./agent-work-item-tracking.md) names the tracker and says how an agent loads an issue.

## Project board (public roadmap)

Delivery status lives on the org **Merlon Docs — Public Roadmap** board:

| Resource     | URL                                                                                             |
| ------------ | ----------------------------------------------------------------------------------------------- |
| Board        | [github.com/orgs/Merlon-Docs/projects/1](https://github.com/orgs/Merlon-Docs/projects/1)        |
| Status field | [Project field settings](https://github.com/orgs/Merlon-Docs/projects/1/settings/fields/Status) |
| Issues       | [github.com/Merlon-Docs/merlon/issues](https://github.com/Merlon-Docs/merlon/issues)            |

**Status** tracks delivery on the board:

| Status value | When to set                                          |
| ------------ | ---------------------------------------------------- |
| Todo         | On intake; issue is accepted backlog                 |
| In Progress  | Branch or PR is actively landing work for this issue |
| Done         | Issue is closed (completed or not planned)           |

Roadmap **area** (what used to be a separate **Track** column on a private board) is expressed with **`track:*` labels** on the issue so filters work for contributors without org-project admin access. Optionally, maintainers can add a **Track** single-select field to project #1 and mirror the same four values.

| `track:*` label           | Use for                                                                 |
| ------------------------- | ----------------------------------------------------------------------- |
| `track:1.0-formalization` | System ADR, normative spec, schemas, conformance                        |
| `track:maintenance`       | Bugs, compile/check correctness, agent-process hygiene, adoption polish |
| `track:performance`       | SLOs, benchmarks, engine spikes (often with `priority:defer`)           |
| `track:future`            | MCP server, hosted API, and other post-V1 delivery surfaces             |

Apply **one** `track:*` label on intake when the area is clear.

**Milestone** attaches issues to a delivery cut (for example `1.0.0-draft`). Leave milestone empty for long-range or deferred work.

## Label catalog (public open source)

GitHub's default triage labels stay available: `good first issue`, `help wanted`, `question`, `duplicate`, `invalid`, `wontfix`.

### Priority (exactly one)

Issue triage priority — not the product capability tiers in [Personas and priority tiers](../features/personas-and-priority-tiers.md).

| Label            | Meaning                                                               |
| ---------------- | --------------------------------------------------------------------- |
| `priority:P0`    | User-facing blocker or broken core path (compile / check / refs)      |
| `priority:P1`    | High near-term value, next after P0                                   |
| `priority:P2`    | Important backlog with clear value, after P1                          |
| `priority:P3`    | Nice-to-have / polish / low urgency                                   |
| `priority:defer` | Parked on an explicit gate (benchmark, V2 dependency, adopter demand) |

### Type (at least one)

| Label            | Meaning                                                |
| ---------------- | ------------------------------------------------------ |
| `bug`            | Broken or incorrect behavior                           |
| `enhancement`    | Feature or improvement                                 |
| `documentation`  | Docs-only or docs-first work                           |
| `feedback`       | Ideas, gaps, or questions from the feedback template   |
| `epic`           | Epic tracking issue with child issues                  |
| `adoption-story` | Qualitative evidence from a real deployment            |
| `chore`          | Tooling or hygiene without user-facing behavior change |

Dependabot and automation may apply: `dependencies`, `github_actions`, `javascript`.

### Component (when scoped to one area)

| Label      | Meaning                                      |
| ---------- | -------------------------------------------- |
| `cli`      | Merlon Docs CLI (`packages/merlon-docs-cli`) |
| `compile`  | Compile pipeline and manifests               |
| `refs`     | Cross-link registry and refs artifacts       |
| `sections` | Section markers and shard structure          |
| `hooks`    | Git hooks and agent skill scripts            |
| `presets`  | Presets and archetype bundles                |
| `lint`     | Vale and prose lint integration              |

### Domain and release

| Label      | Meaning                                                             |
| ---------- | ------------------------------------------------------------------- |
| `standard` | Spec, positioning, or formalization work                            |
| `release`  | Release train or `develop` → `main` cut (usually on the release PR) |
| `security` | Security posture, supply chain, or audit work                       |
| `0.5`      | Historical MDCP 0.5 protocol scope (legacy issues only)             |

### How priority is set

1. **Issue forms**: the Bug report and Feedback templates require a **Value-add priority** dropdown. That choice is recorded in the issue body.
2. **Labels**: maintainers or coding agents apply the matching `priority:*` label when triaging (GitHub forms cannot map a dropdown to a label automatically). Replace any previous `priority:*` label so only one remains.
3. **What to work on next**: prefer open issues labeled `priority:P0`, then `P1`. Skip `priority:defer` until the gate in the issue body is met.

Issue templates live under `.github/ISSUE_TEMPLATE/` (bug report, feedback, adoption story, extension proposal). The adoption-story template has no priority dropdown, because it records qualitative evidence. Extension proposals use the priority dropdown and the `enhancement` type label, and maintainers usually also apply `standard`. Pull requests use `.github/PULL_REQUEST_TEMPLATE.md`, which asks for the spec and skill versions when the change touches those surfaces.

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

## New issue intake (required)

Whenever you **open** an issue or find a brand-new open issue missing hygiene, finish this checklist before you start work on it. Same rules for humans and coding agents. [Weekly issue triage](./weekly-issue-triage.md) applies the same checks to every open issue.

1. **Priority**: exactly one `priority:*` (from the form dropdown or triage judgment).
2. **Type (+ component / domain / track)**: type label; add component, `standard`, and one `track:*` when obvious.
3. **Project board**: add the issue to [org project #1](https://github.com/orgs/Merlon-Docs/projects/1) if it is missing, and set **Status = Todo**.
4. **Milestone**: attach the current open delivery milestone when the issue is in that cut's scope, and leave it empty for long-range or deferred work.
5. **Sanity**: the title says what to do, and the body has acceptance criteria or a clear problem statement.

### Add an issue to the board (`gh`)

Resolve the project and issue node IDs, then add the item (requires `project` scope):

```bash
# Org project #1 — Merlon Docs - Public Roadmap
PROJECT_ID=$(gh api graphql -f query='
  query { organization(login:"Merlon-Docs") {
    projectV2(number:1) { id }
  }}' --jq '.data.organization.projectV2.id')

ISSUE_NODE=$(gh api graphql -f query='
  query($n:Int!) {
    repository(owner:"Merlon-Docs", name:"merlon") {
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

Set **Status** in the GitHub Project UI, or via `updateProjectV2ItemFieldValue` after reading field and option IDs from `projectV2 { fields(...) }` (option IDs change when the field is rebuilt, so query them each time and keep them out of committed scripts).

To backfill issues onto the board after a migration, run `node scripts/populate-github-project.mjs --open-only` with a token that has `project` scope (see `--dry-run` first).

**GitHub MCP:** create or update the issue with labels, then add it to org project **#1**. If the MCP token lacks project scope, fall back to `gh` with a token that has `project`, or leave a comment listing the board gap for a maintainer.

### Labels via CLI

```bash
gh issue edit <N> --repo Merlon-Docs/merlon --add-label "priority:P1" --add-label "bug" --add-label "compile"
# Replace priority: remove the old one when changing level
gh issue edit <N> --repo Merlon-Docs/merlon --remove-label "priority:P2" --add-label "priority:P1"
```
