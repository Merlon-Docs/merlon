# Changesets

This directory holds pending changesets. [When to add a changeset](../docs/developer/versioning-and-releases.md#when-to-add-a-changeset) says when a change needs one, and [Versioning and releases](../docs/developer/versioning-and-releases.md) covers bump types and releases.

```bash
pnpm changeset              # add a changeset
pnpm changeset:reject-major # the two checks the land gate and pull request CI run
pnpm changeset:status
```
