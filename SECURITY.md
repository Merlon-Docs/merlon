# Security Policy

## Supported versions

Security fixes go to the latest minor line of each published `@merlon-docs/merlon-docs-*` package and of the Agent Skill. A fix is released from `main`, as [Versioning and releases](docs/developer/versioning-and-releases.md) describes, and older minor lines don't get backports.

## Reporting a vulnerability

Please report security issues privately — do not open a public GitHub issue for undisclosed vulnerabilities.

1. Email the maintainer via [GitHub private vulnerability reporting](https://github.com/Merlon-Docs/merlon/security/advisories/new) if enabled, or open a minimal issue asking for a private contact channel.
2. Include steps to reproduce, impact assessment, and any suggested fix.
3. Expect an initial response within 7 days.

We follow coordinated disclosure: we will confirm receipt, work on a fix, and publish an advisory before public details when possible.

## Maintainer practices

- npm account 2FA (auth-and-writes) for `@merlon-docs/merlon-docs-*` publishers
- Trusted Publishing (OIDC) for releases — no long-lived publish tokens in CI
- Gitleaks on commit and in CI
- `pnpm audit --audit-level=high` in CI
- Frozen lockfile installs in CI

Triage (prod vs dev-only impact, prefer deprecate over unpublish): [docs/developer/security-incident-triage.md](docs/developer/security-incident-triage.md).
