# Repository layout

```text
merlon/
├── CODE_OF_CONDUCT.md       # Contributor Covenant (committed)
├── README.md                # Compiled (committed)
├── DEVELOPERS.md            # Compiled (committed)
├── skills/                  # Agent Skills install surface only (npx skills add)
│   └── merlon-docs/         # The Merlon Docs skill + workflows (no package.json / CHANGELOG here)
├── tests/skills/            # Live eval fixtures (optional; not publishable packs)
├── skills.sh.json           # skills.sh repo page layout
├── .agents/skills/          # Vendor-managed installs + vendored skill-creator, writing-skills
├── packages/
│   ├── merlon-docs-core/    # @merlon-docs/merlon-docs-core
│   ├── merlon-docs-cli/     # @merlon-docs/merlon-docs-cli
│   ├── merlon-docs-presets/ # @merlon-docs/merlon-docs-presets
│   ├── merlon-docs-site/    # Starlight docs site (private, unversioned)
│   └── skill-*/             # Private @merlon-docs/skill-* version carriers + CHANGELOGs
├── docs/                    # Sharded docs (merlon.config.json) — dogfood target
│   ├── glossary/            # Shared acronyms and terms (cross-guide, like insert libraries)
│   ├── features/            # Tool capabilities
│   ├── developer/           # This guide
│   ├── client-cli/          # CLI guide
│   ├── client-core/         # Core library guide
│   ├── repo-readme/         # Repository landing page
│   ├── vale-local/          # Dogfood-only Vale styles (MerlonDocs-PandocId)
│   └── .vale.ini            # Peer Vale config
├── examples/sample-guides/  # Minimal consumer fixture for tests and tutorials
├── legacy/                  # Original bash/Python reference implementation
├── scripts/                 # Node and shell code behind the pnpm scripts and hooks, with their *.test.mjs tests
├── formal/alloy/            # Alloy models of the branch and release guards (pnpm formal:check)
├── infra/github/            # Terraform for the repository settings
├── .husky/                  # Git hooks (pre-commit, commit-msg)
├── .claude/hooks/           # Claude Code session-start hook
├── .cursor/                 # Cursor cloud agent environment
├── .changeset/              # Changesets for semver releases
└── .github/workflows/       # CI and release automation
```

[Guide directories](./docs-dogfooding.md#guide-directories) maps each guide directory under `docs/` to its compiled output.

[Formal models](./formal-models.md) covers `formal/`, and [Repository settings](./repository-settings.md#terraform) covers the Terraform in `infra/github/`. [Git hooks](./local-setup.md#git-hooks) lists the hooks under `.husky/`, and [Cloud agent environments](./cloud-agent-environments.md) covers `.claude/` and `.cursor/`. [Repository script tests](./packages-and-tests.md#repository-script-tests) covers the tests under `scripts/`.

## Published packages

The table in [Versioning and releases](./versioning-and-releases.md) lists each published item, its identifier and where it publishes. [Release schedule](./versioning-and-releases.md#release-schedule-release-pr-from-develop-to-main) covers the carrier package that versions a skill. The `merlon-docs-presets` README is hand-authored. The root `README.md` and the CLI and core READMEs are **compiled** from shards.
