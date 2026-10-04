# GitHub Actions security posture

Maintainer guide for tracking **GitHub Actions security posture** in this public OSS monorepo. Vulnerability **reporting** stays in [SECURITY.md](../../SECURITY.md); dependency and release triage stays in [Security-incident triage](./security-incident-triage.md). This shard is the audit trail for CI workflow and repository settings against the [OWASP GitHub Actions Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/GitHub_Actions_Security_Cheat_Sheet.html).

Work is tracked under epic [#173 — Repository security posture](https://github.com/betsalel-williamson/mdcp/issues/173). The durable checklist lives in [#168 — OWASP GitHub Actions security checklist docs](https://github.com/betsalel-williamson/mdcp/issues/168); see [GitHub Actions security checklist](./github-actions-security-checklist.md) for row-by-row status. CodeQL findings on library regexes (heading / `{#id}` [ReDoS](../glossary/redos.md)) are tracked separately in [Safe markdown parsing](./safe-markdown-parsing.md).

## Status vocabulary

Each checklist row uses **exactly one** of these statuses (normative):

| Status                       | Meaning                                                                                                                        |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `reviewed (YYYY-MM-DD)`      | Topic assessed against current repo state on that date; controls in place or accepted with documented rationale                |
| `not a concern (YYYY-MM-DD)` | OWASP topic does not apply to this repo (e.g. no self-hosted runners)                                                          |
| `open risk (#N)`             | Gap remains; `#N` is a **remediation issue** that is a child of [#173](https://github.com/betsalel-williamson/mdcp/issues/173) |

Do not invent alternate labels. When a risk closes, update the row to `reviewed` or `not a concern` with the resolution date.

## Re-review cadence

Re-run the checklist when any of the following change:

- Workflow files under `.github/workflows/` (triggers, permissions, action versions, secrets usage)
- Repository or organization **Actions** settings (default `GITHUB_TOKEN` permissions, allowed actions, environments)
- Branch protection, rulesets, or required checks that gate merges and releases
- Dependabot or secret-scanning configuration
- Release mechanics ([Publishing](./publishing.md) — OIDC, environments, npm trust)

Even when nothing changes, schedule a **periodic pass** (for example quarterly) so third-party action advisories and OWASP guidance updates do not drift unnoticed.

## CODEOWNERS and external contributor review

OWASP recommends requiring approval from code owners so external contributors cannot merge changes to critical paths without maintainer review. This repo assigns `@betsalel-williamson` in [`.github/CODEOWNERS`](../../.github/CODEOWNERS) for:

- All paths (`*`) — default owner
- `.github/`: workflows, Dependabot, and repository automation
- `packages/`: published npm packages and CLI
- `docs/`: sharded documentation compiled into READMEs
- `skills/` and `.agents/skills/`: publishable and committed skills

CODEOWNERS alone does not block merges; branch protection must enforce owner review.

### Branch protection settings (repo admin)

After CODEOWNERS is on `main`, a repo admin enables review enforcement:

1. Open **Settings → Branches → Branch protection rules → `main`** (or the active ruleset for `main`).
2. Under **Require a pull request before merging**, enable **Require review from Code Owners**.
3. Keep **Dismiss stale pull request approvals when new commits are pushed** enabled.

A separate `required_approving_review_count` is not needed — only maintainers have merge access, so the maintainer merge itself serves as the approval gate. Re-verify after any branch-protection edits:

```bash
gh api repos/betsalel-williamson/mdcp/branches/main/protection \
  --jq '.required_pull_request_reviews | {require_code_owner_reviews}'
```

To set or repair those toggles (requires admin `gh` auth):

```bash
gh api -X PATCH repos/betsalel-williamson/mdcp/branches/main/protection/required_pull_request_reviews \
  -F require_code_owner_reviews=true \
  -F required_approving_review_count=0
```

Fork PRs from outside collaborators still run CI under the base-repo policy; code-owner review ensures `@betsalel-williamson` approves changes to owned paths before merge.

## Static analysis

We run **CodeQL** and **Zizmor** on push and pull request:

- **CodeQL** — matrix over `javascript-typescript` (package/source SAST) and `actions` (workflow queries per OWASP). Analysis uploads SARIF; make the **Analyze** / **CodeQL** checks **required** on `main`, and set code-scanning severity so findings block merges.
- **Zizmor** — GitHub Actions workflow misconfiguration scanner. The job **fails on findings** (blocking); annotations surface issues on the PR. Make it a **required** status check on `main` if it should gate merges.

## Related docs

- [SECURITY.md](../../SECURITY.md) — reporting and maintainer security practices
- [Security-incident triage](./security-incident-triage.md) — dependency advisories and release remediation
- [Publishing](./publishing.md) — npm publish mechanics and Trusted Publishing (OIDC)
- [GitHub Actions security checklist](./github-actions-security-checklist.md) — OWASP topic checklist with as-built status
