# Repository layout

```text
mdcp/
├── CODE_OF_CONDUCT.md      # Contributor Covenant (committed)
├── README.md               # Compiled from docs/repo-readme/ (committed)
├── DEVELOPERS.md           # Compiled from docs/developer/ (committed)
├── skills/                 # Agent Skills install surface only (npx skills add)
│   ├── mdcp/               # The MDCP skill + workflows (no package.json / CHANGELOG here)
│   └── mdcp-arch-*/        # WIP archetypes (metadata.internal)
├── tests/skills/           # Live eval fixtures (optional; not publishable packs)
├── skills.sh.json          # skills.sh repo page layout
├── .agents/skills/         # Dogfood installs (pnpm skill:update) + skill-creator
├── packages/
│   ├── mdcp-core/          # @bwilliamson/mdcp-core
│   ├── mdcp-cli/           # @bwilliamson/mdcp-cli
│   ├── mdcp-presets/       # @bwilliamson/mdcp-presets
│   ├── mdcp-site/          # Starlight docs site (private, unversioned)
│   └── skill-*/            # Private @bwilliamson/skill-* version carriers + CHANGELOGs
├── docs/                   # Sharded docs (mdcp.config.json) — dogfood target
│   ├── glossary/           # Shared acronyms and terms (cross-guide, like insert libraries)
│   ├── features/           # Tool capabilities → docs/_build/guides.md (local review, gitignored)
│   ├── developer/          # This guide → DEVELOPERS.md
│   ├── client-cli/         # → packages/mdcp-cli/README.md
│   ├── client-core/        # → packages/mdcp-core/README.md
│   ├── repo-readme/        # → README.md (publish landing)
│   ├── vale-local/         # Dogfood-only Vale styles (MDCP-PandocId)
│   └── .vale.ini           # Peer Vale config
├── examples/sample-guides/ # Minimal consumer fixture for tests and tutorials
├── legacy/                 # Original bash/Python reference implementation
├── .changeset/             # Changesets for semver releases
└── .github/workflows/      # CI and release automation
```

## Published packages

Each npm package and each Agent Skill versions independently via Changesets. npm packages ship `dist/` and READMEs. Skill **carriers** live under `packages/skill-*` (private; GitHub Releases + CHANGELOG). The `skills/` tree is install content only.

`mdcp-presets` README is hand-authored for now. Root `README.md`, CLI, and core READMEs are **compiled** from `docs/repo-readme/`, `docs/client-cli/`, and `docs/client-core/` shards.
