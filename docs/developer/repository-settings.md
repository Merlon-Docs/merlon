# Repository settings

Some controls in this repository live in its settings on the hosting platform, and the [Terraform](#terraform) files in `infra/github/` declare some of them. A maintainer applies those files by hand, so a pull request can't change a live setting, and no workflow can enforce one. This page lists the settings that the release, landing and security pages depend on, with each one's value and the file or settings page that holds it. [Formal models](./formal-models.md#landing-and-release) says which branch rules keep `develop` and `main` tested, and the [GitHub Actions security checklist](./github-actions-security-checklist.md) reviews these settings against the OWASP cheat sheet.

## Settings

| Setting                                             | Value                                                                                                                                                                                                      | Declared or set in                                                                                |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Required checks on `main`                           | `Check` and `Changeset` from CI, and `Scan` from gitleaks, on a branch that is up to date with `main`                                                                                                      | `infra/github/protection.tf`                                                                      |
| Reviews on `main`                                   | [Code-owner review](#code-owner-review), with stale approvals dismissed and no minimum approval count                                                                                                      | `infra/github/protection.tf`                                                                      |
| Force-push to `main`, and its deletion              | Blocked                                                                                                                                                                                                    | `infra/github/protection.tf`                                                                      |
| Secret scanning and push protection                 | On                                                                                                                                                                                                         | `infra/github/repository.tf`                                                                      |
| Merge methods                                       | Merge commit, squash and rebase are allowed. The release PR needs a merge commit, as [Release schedule](./versioning-and-releases.md#release-schedule-release-pr-from-develop-to-main) says                | `infra/github/repository.tf`                                                                      |
| `release` environment reviewers                     | The repository owner                                                                                                                                                                                       | `infra/github/environments.tf`                                                                    |
| `release` environment admin bypass                  | On, so a repository admin can deploy without a reviewer's approval                                                                                                                                         | `infra/github/environments.tf`                                                                    |
| `release` environment deployment branches           | `main` and `v*` tags                                                                                                                                                                                       | **Settings → Environments → `release`**                                                           |
| `RELEASE_GITHUB_TOKEN`                              | A secret of the `release` environment                                                                                                                                                                      | [Release token](./publishing.md#release-token)                                                    |
| `DEPENDABOT_CHANGESET_TOKEN`                        | A repository secret                                                                                                                                                                                        | [Dependabot changeset token](./publishing.md#dependabot-changeset-token)                          |
| Default `GITHUB_TOKEN` permissions                  | Read-only                                                                                                                                                                                                  | **Settings → Actions → General → Workflow permissions**                                           |
| GitHub Actions can create and approve pull requests | On. When merging `main` back into `develop` conflicts, the [sync workflow](./versioning-and-releases.md#release-schedule-release-pr-from-develop-to-main) opens a pull request with its own `GITHUB_TOKEN` | **Settings → Actions → General → Workflow permissions**                                           |
| Pages source                                        | GitHub Actions, for the [site deploy](./docs-site.md#deployment)                                                                                                                                           | **Settings → Pages**                                                                              |
| `github-pages` environment deployment branches      | `develop`                                                                                                                                                                                                  | **Settings → Environments → `github-pages`**                                                      |
| Trusted Publisher of each npm package               | `release.yml` in this repository                                                                                                                                                                           | The package's npm settings, as [Trusted Publishing](./publishing.md#trusted-publishing) describes |

## Terraform

[`infra/github/`](../../infra/github/) declares the settings whose row names a `.tf` file, with the `integrations/github` provider. It also declares settings that no page here depends on, such as the repository's description and topics. Its `imports.tf` adopts the existing repository, `main` protection and `release` environment. An apply then changes them in place. The provider can't set the branch and tag policies of an environment on a user account's repository, and `environments.tf` leaves them to the settings page.

The live settings can drift from the files between applies. With admin access to the repository, compare and apply them from a checkout:

```bash
cd infra/github
export GITHUB_TOKEN=<admin token>
terraform init
terraform plan    # lists each live setting that differs from the files
terraform apply
```

Terraform writes its state to `infra/github/terraform.tfstate`, and `infra/github/.gitignore` keeps that file out of commits, along with `.terraform/` and plan files.

## Code-owner review

[`.github/CODEOWNERS`](../../.github/CODEOWNERS) assigns a code owner to every path, with entries of their own for `.github/`, `packages/`, `docs/`, `skills/` and `.agents/skills/`. CODEOWNERS alone doesn't block a merge. The code-owner review on `main` does, as the OWASP cheat sheet recommends for changes from external contributors. Pull requests from forks still run CI under the base repository's policy, and the code owner that CODEOWNERS names approves each change to an owned path before it merges. The rule's minimum approval count is 0, because only maintainers can merge.

With admin `gh` auth, read the live review settings, or repair them without Terraform:

```bash
gh api repos/betsalel-williamson/mdcp/branches/main/protection \
  --jq '.required_pull_request_reviews | {require_code_owner_reviews}'

gh api -X PATCH repos/betsalel-williamson/mdcp/branches/main/protection/required_pull_request_reviews \
  -F require_code_owner_reviews=true \
  -F required_approving_review_count=0
```

## Required checks and scanners

`protection.tf` doesn't list Release source among the required checks on `main`. [Formal models](./formal-models.md#main-only-merges-develop-or-hotfix) says what goes wrong without that rule.

CodeQL and Zizmor run on every pull request and on each push to `main` or `develop`:

- **CodeQL**, the `Analyze` job, analyzes `javascript-typescript` for the package sources and `actions` for workflow queries in one run, and uploads SARIF to code scanning. [Safe markdown parsing](./safe-markdown-parsing.md) says how a ReDoS finding on a library regex gets fixed.
- **Zizmor** scans the workflow files for misconfigurations. The job fails on a finding and annotates the pull request.

`protection.tf` doesn't list `Analyze` or `Zizmor` as a required check. A finding from either one shows on the pull request, and its reviewer weighs it. [Landing on `develop`](./versioning-and-releases.md#landing-on-develop) says when the scanners first see a landing's changes.

## Branch rules on `develop`

`infra/github/` doesn't declare a rule for `develop`. [Formal models](./formal-models.md#develop-only-moves-to-a-tested-tree) names the two branch rules that `develop` needs, and the identity of the land workflow that they have to exempt.
