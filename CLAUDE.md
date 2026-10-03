# CLAUDE.md

## Project overview

This is the **mdcp monorepo** — a documentation-system Agent Skill plus a
TypeScript toolchain (pnpm workspaces). There is no web app or long-running
server; the application is the `mdcp` CLI (`packages/mdcp-cli`) built on
`packages/mdcp-core`, driven through `pnpm` scripts.

## Shard discipline (critical)

Documentation is sharded under `docs/`. Shards are the **source of truth**;
compiled output is generated. **Never hand-edit compiled files.** Edit the
source shard under `docs/` and run `pnpm docs:compile:repo`.

Files that contain `<!-- mdcp-shard: start ... -->` markers are compiled
output. The shard path in the marker names the source file.

| Shard directory     | Compiled output                |
| ------------------- | ------------------------------ |
| `docs/repo-readme/` | `README.md` (repo root)        |
| `docs/developer/`   | `DEVELOPERS.md` (repo root)    |
| `docs/client-cli/`  | `packages/mdcp-cli/README.md`  |
| `docs/client-core/` | `packages/mdcp-core/README.md` |

CI fails on `git diff` if compiled files are stale, so always compile after
editing shards: `pnpm docs:compile:repo`.

## Branches

`develop` is the integration trunk; open every PR against `develop`. `main` is the
protected release branch that `npx skills add` installs from, and it only takes
release PRs from `develop` (merge commit) or `hotfix/*` branches. GitHub suggests
`main` as the PR base because it stays the default branch, so set the base by hand.
See `docs/developer/versioning-and-releases.md`.

## Build before running

`dist/` is gitignored and not produced by install. Run `pnpm build` after a
fresh checkout or after editing `packages/*/src` before running any docs or
CLI commands.

## Key commands

```bash
pnpm install          # install deps (packageManager pinned in package.json)
pnpm build            # build all packages (required before CLI/docs scripts)
pnpm test             # run tests
pnpm typecheck        # type-check
pnpm lint             # ESLint
pnpm format:check     # Prettier check

pnpm docs:compile:repo   # compile shards → README.md, DEVELOPERS.md, etc.
pnpm docs:check          # lint + vale + compile-diff check (requires Vale on PATH)

pnpm run check        # full verification gate (mirrors CI)
```

## Agent Skills

Agent skill source lives under `skills/`. After editing skill files, run:

```bash
pnpm skill:update     # refresh vendor-managed installs in .agents/skills/
```

Do not hand-edit `.agents/skills/`.

## Code of conduct

This project follows the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md).
