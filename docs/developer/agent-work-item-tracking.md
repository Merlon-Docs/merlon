# Agent work-item tracking

How coding agents load tracker issues and delivery conventions **for this repository**. The work-item workflows of the [MDCP skill](../../docs/skills.md) point here via `WORK_ITEM_LOOKUP`.

**This repo’s work-item lookup system uses GitHub** for both **issues** (acceptance, discussion, `Closes #N`) and **project planning** (the Project board below). Do not invent a second tracker or stuff tickets / sprint backlogs into durable `docs/` shards. Load scope from GitHub via this shard.

## Tracker

```text
Host=GitHub (Merlon-Docs/merlon)
Issues=https://github.com/Merlon-Docs/merlon/issues/  (record WORK_ITEMs here)
Project board=https://github.com/users/betsalel-williamson/projects/4  (project plan / delivery board)
Issue base URL=https://github.com/Merlon-Docs/merlon/issues/
WORK_ITEM=enough to resolve the issue — number, URL, or short name/description
```

Every open issue must appear on the public [MarkDown Context Protocol project board](https://github.com/users/betsalel-williamson/projects/4).

[Issue intake and labels](./issue-intake-and-labels.md) gives the board fields and labels each issue gets, and the checklist for a new issue.

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

1. **Load scope and stay focused**: the [Required intake](../features/protocol/skill-workflows.md#required-intake) rules have an agent load the WORK_ITEM before it edits, with one WORK_ITEM per branch. Treat the acceptance criteria as the boundary unless the WORK_ITEM explicitly expands scope.
2. **Branch first**: follow [Git and delivery](#git-and-delivery).
3. **Plan atomic commit groups**: list them in a coding or multi-concern plan before review, as [Atomic commit groups (plan obligation)](../features/protocol/skill-workflows.md#atomic-commit-groups-plan-obligation) requires. After approval, commit one group at a time.
4. **Docs describe now**: update shards to match as-built behavior, and keep consumer notices out of durable shards ([Durable docs vs pending changesets](./versioning-and-releases.md#durable-docs-vs-pending-changesets)).
5. **Add a changeset**: see [When to add a changeset](./versioning-and-releases.md#when-to-add-a-changeset).
6. **Issue intake**: when opening or first touching an issue, complete [New issue intake](./issue-intake-and-labels.md#new-issue-intake-required) (labels, board, Track, Status, milestone).
7. **Weekly triage**: run the advisory [Weekly issue triage](./weekly-issue-triage.md). It asks humans to confirm before any stale or duplicate ticket is closed.

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
