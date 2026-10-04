# AGENTS.md

Instructions for coding agents in this repository. `CLAUDE.md` is a symlink to this file, and every agent reads the same text.

## Project

This is the mdcp monorepo: a documentation-system Agent Skill plus a TypeScript toolchain in pnpm workspaces. The application is the `mdcp` CLI in `packages/mdcp-cli`, built on `packages/mdcp-core` and driven through `pnpm` scripts. There is no web app or long-running server.

## Shard discipline (critical)

Documentation is sharded under `docs/`. Shards are the source of truth and compiled output is generated. **Never hand-edit compiled files.** Edit the source shard under `docs/` and run `pnpm docs:compile:repo`. A file with `<!-- mdcp-shard: start ... -->` markers is compiled output, and each marker gives the path of its source shard.

| Shard directory                | Compiled output                   |
| ------------------------------ | --------------------------------- |
| `docs/repo-readme/`            | `README.md`                       |
| `docs/developer/`              | `DEVELOPERS.md`                   |
| `docs/client-cli/`             | `packages/mdcp-cli/README.md`     |
| `docs/client-core/`            | `packages/mdcp-core/README.md`    |
| `docs/features/`               | `docs/_build/features.md`         |
| `docs/presentation-la-devops/` | `presentations/la-devops-2026.md` |
| Every guide above, stitched    | `docs/_build/guides.md`           |

Shards in `docs/glossary/` compile into the guides whose pages link to them. CI recompiles every guide and fails when `git diff` shows a stale compiled file.

## Before you run anything

`dist/` is gitignored and install does not build it. Run `pnpm build` after a fresh checkout, and after editing `packages/*/src`, before any docs script or CLI command. The docs checks need Vale on `PATH`, with its styles synced once by `pnpm vale:sync`. [Local setup](docs/developer/local-setup.md) has the full toolchain.

## Commands

```bash
pnpm install             # dependencies (packageManager is pinned in package.json)
pnpm build               # build every package
pnpm test                # unit tests
pnpm typecheck
pnpm lint
pnpm format:check
pnpm docs:compile:repo   # recompile every output in the table above
pnpm docs:check          # compile and check the repo docs and the examples
pnpm run check           # typecheck, lint, format:check, build, test, skill:validate, docs:check
```

## Developer guides

- [Versioning and releases](docs/developer/versioning-and-releases.md) covers how work reaches `develop` and how releases reach `main`.
- [Agent Skill development](docs/developer/agent-skill.md) covers skill source under `skills/`, and why `.agents/skills/` is never hand-edited.
- [Cursor Cloud environment](docs/developer/cursor-cloud-environment.md) covers cloud agent setup and limits.

## Code of conduct

This project follows the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md).
