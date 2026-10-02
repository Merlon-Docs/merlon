# Documentation site

The public docs site at <https://betsalel-williamson.github.io/mdcp/> is an [Astro Starlight](https://starlight.astro.build/) build in [`packages/mdcp-site/`](../../packages/mdcp-site/). It is a private workspace package with no version. Changesets ignores it, and release tooling never tags or publishes it.

## Content comes from shards

Only the landing page (`packages/mdcp-site/src/content/docs/index.mdx`) is hand-authored. The other pages are generated at build time by [`scripts/sync-content.mjs`](../../packages/mdcp-site/scripts/sync-content.mjs) from these guides:

| Shards              | Site section        | Route            |
| ------------------- | ------------------- | ---------------- |
| `docs/client-cli/`  | User guide          | `/guide/`        |
| `docs/features/`    | Concepts & protocol | `/concepts/`     |
| `docs/client-core/` | Library API         | `/api/`          |
| `docs/glossary/`    | Glossary            | `/glossary/`     |
| `docs/developer/`   | Contributing        | `/contributing/` |

The sync script reads `docs/mdcp.config.json` and each guide's `index.md` for sidebar order, and uses each shard's first `#` heading as the page title. It rewrites links for the site:

- Relative `.md` links between published shards become site routes.
- Compiled cross-links such as `[text](#slug)` resolve through the refs registry (`docs/_build/refs.json`) and the per-guide compiled outputs. The `mdcp-shard` source markers in each compiled file name the shard that defines the slug.
- Links to other repository files point at the file on GitHub.

The sync fails on any internal link it cannot resolve, and the build then checks every internal link and anchor in the generated HTML. Generated pages, the sidebar file, and Astro output are gitignored. Edit the shard under `docs/`, never the generated page. Each page's edit link opens the shard.

## Build and preview

```bash
pnpm site:dev     # build packages, compile docs, sync, then astro dev
pnpm site:build   # same steps, then astro build and the dist link check
```

Both commands run `pnpm build` and `pnpm docs:compile:repo` first, because the sync needs the CLI build and the refs registry.

## Deployment

[`.github/workflows/pages.yml`](../../.github/workflows/pages.yml) builds the site on pull requests that touch `docs/` or the site package, and builds and deploys to GitHub Pages on every push to `main`. The repository's Pages source must be set to **GitHub Actions**.

## Coverage scan

The site generates its pages into gitignored paths, and the [coverage](../glossary/coverage.md) scan honors `.gitignore`, so generated pages never show up as uncaptured files. The scan only reads `.md` files, so the hand-authored `index.mdx` landing page is outside `mdcp check`; the post-build link check covers its links instead. No `scan.ignore` entry is needed.
