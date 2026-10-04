# Security-incident triage

Maintainer runbook for dependency advisories and “burn a bad release” decisions on `@bwilliamson/mdcp-*`. Vulnerability **reporting** stays in [SECURITY.md](../../SECURITY.md); this shard covers **triage and remediation**.

## Classify impact first

Before changing lockfiles, deprecating versions, or cutting a release, decide where the finding lands:

| Impact class                    | Typical signal                                                                                | Default response                                                                                       |
| ------------------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| **Published / prod**            | Affects `@bwilliamson/mdcp-*` runtime deps or ships in the npm tarball                        | Patch, release, and (when consumers may have installed a bad version) deprecate that version           |
| **Transitive dev-only tooling** | Only under root `devDependencies` (e.g. Slidev, lint/test helpers); `pnpm audit --prod` clean | Prefer a workspace **override** or upstream bump; do **not** deprecate or unpublish published packages |

Quick checks:

```bash
pnpm audit --prod                 # published-package surface
pnpm audit --audit-level=moderate # full tree including presentation tooling
pnpm why <package>                # which path pulls the vulnerable package
```

CI fails when `pnpm audit --audit-level=high` finds a high or critical advisory (see [CI and the land gate](./local-setup.md#ci-and-the-land-gate)). Moderate noise in **dev-only** trees is hygiene, not an automatic security release of `@bwilliamson/mdcp-*`.

Workspace overrides for this monorepo live under `overrides:` in [`pnpm-workspace.yaml`](../../pnpm-workspace.yaml) (pnpm 11+ no longer reads `package.json` → `pnpm.overrides`).

## Prefer patch + deprecate over unpublish

When a **published** version is unsafe or badly broken for consumers:

1. **Ship a fixed release** (usually a **patch**) via the normal Changesets path — [Versioning and releases](./versioning-and-releases.md) and [Publishing](./publishing.md).
2. **`npm deprecate`** the bad versions with a short reason and the safe replacement range. Deprecation warns installers without rewriting registry history.
3. **Announce** via GitHub Security Advisory / release notes when disclosure timing requires it ([SECURITY.md](../../SECURITY.md)).

Do **not** unpublish solely to silence an advisory when a patched successor exists. Unpublish breaks lockfiles and CI that pin exact versions.

Example deprecate (maintainer machine, 2FA as required by npm):

```bash
npm deprecate @bwilliamson/mdcp-cli@<bad-version> "Security issue; use >=<fixed-version>"
# Repeat for mdcp-core / mdcp-presets when those versions share the defect
```

## When unpublish (or npm Support) is appropriate

Unpublish is rare. Prefer it only when **all** of the following hold (or npm’s current policy requires it):

- The version must not remain installable (e.g. secrets or malware in the tarball), **and**
- Deprecation alone is insufficient for the risk, **and**
- You are within npm’s unpublish window / policy for that package and version

Otherwise:

- Use **deprecate** + patched release for ordinary vulnerabilities and broken builds.
- Contact **npm Support** when the version is outside the self-serve unpublish window, the package was compromised, or you need a registry-side takedown.

Never unpublish a version that other packages or consumers legitimately depend on unless the alternative is worse (credential leak, malware). Document the decision in the advisory, not in durable product shards.

## Related docs

- [SECURITY.md](../../SECURITY.md) — reporting and maintainer security practices
- [GitHub Actions security posture](./github-actions-security.md) — CI workflow and repository settings audit trail
- [GitHub Actions security checklist](./github-actions-security-checklist.md) — OWASP topic checklist with as-built status
- [Versioning and releases](./versioning-and-releases.md) — cutting fixed releases
- [Publishing](./publishing.md) — npm publish mechanics and Trusted Publishing
