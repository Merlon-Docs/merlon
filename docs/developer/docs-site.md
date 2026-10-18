# Documentation site

The public docs site at <https://merlon-docs.github.io/merlon/> is an [Astro Starlight](https://starlight.astro.build/) build in [`packages/merlon-docs-site/`](../../packages/merlon-docs-site/). It is a private workspace package with no version. Changesets ignores it, and release tooling never tags or publishes it.

## Content comes from shards

The landing page (`packages/merlon-docs-site/src/content/docs/index.mdx`) and the Learn page (`packages/merlon-docs-site/src/content/docs/learn.mdx`) are hand-authored, apart from two sections the build measures, which [Measured on each build](#measured-on-each-build) describes. The other pages are generated at build time by [`packages/merlon-docs-site/scripts/sync-content.mjs`](../../packages/merlon-docs-site/scripts/sync-content.mjs) from these guides:

| Shards              | Site section | Route            |
| ------------------- | ------------ | ---------------- |
| `docs/client-cli/`  | User guide   | `/guide/`        |
| `docs/features/`    | Concepts     | `/concepts/`     |
| `docs/client-core/` | Library API  | `/api/`          |
| `docs/glossary/`    | Glossary     | `/glossary/`     |
| `docs/developer/`   | Contributing | `/contributing/` |

The sync script reads `docs/merlon.config.json` and each guide's `index.md` for sidebar order, and uses each shard's first `#` heading as the page title. These manifest entries become sidebar groups:

- A page entry with nested items, other than a sub-index, groups its page and those items.
- A sub-index (`index.md`) shows its page as the overview, then the entries nested under it whose pages are in its directory. Nested entries outside its directory follow the group at the same level. When it has no nested entries in its directory, it shows the pages its own list links under its directory that no earlier entry has placed.
- When the guide's `index.md` lists a page other than an `index.md` from a subdirectory with no nested items, that page groups the pages its own list links the same way. Unlike a sub-index, it skips the pages the guide's `index.md` lists. It also skips pages in a deeper directory where the guide's `index.md` lists some page, so the page listed there can group them.

The first group whose list links a page claims it. A page other than an `index.md` that only a sub-index or another such subdirectory page lists stays a plain sidebar link, and so does an entry whose list leaves nothing to group.

The sync script rewrites links for the site:

- Relative `.md` links between published shards become site routes.
- Compiled cross-links such as `[text](#slug)` resolve through the refs registry (`docs/_build/refs.json`) and the per-guide compiled outputs. The `merlon-shard` source markers in each compiled file name the shard that defines the slug.
- Links to other repository files point at the file on GitHub.

The sync fails on any internal link it cannot resolve, and the build then checks every internal link and anchor in the generated HTML. Generated pages, the sidebar file, and Astro output are gitignored. Edit the shard under `docs/`, never the generated page. Each page's edit link opens the shard.

## Build and preview

`pnpm site:dev` builds the packages, compiles the docs, syncs and measures, then starts `astro dev`. `pnpm site:build` takes the same steps, then runs `astro build` and the link check on `dist/`. `pnpm site:a11y` runs the axe-core WCAG 2.2 A and AA checks on the built site, and the site package's `test` script runs the unit tests of its scripts:

```bash
pnpm site:build &&
pnpm site:a11y &&
pnpm --filter @merlon-docs/merlon-docs-site test
```

The first two commands run `pnpm build` and `pnpm docs:compile:repo` first, because the sync and the measurements need the CLI build, the compiled guides and the refs registry. `pnpm site:a11y` checks the `dist/` that `pnpm site:build` wrote. It opens a sample of pages in a local Chrome, in both themes at desktop and phone widths, and fails on any violation. Set `CHROME_PATH` to use another Chrome or Chromium binary.

## Measured on each build

Two homepage sections show figures the build measures, so each published page reflects the commit it was built from. After the sync, [`packages/merlon-docs-site/scripts/measure-site.mjs`](../../packages/merlon-docs-site/scripts/measure-site.mjs) writes two gitignored files to `packages/merlon-docs-site/.generated/`:

- `context-size.csv`: `scripts/bench-context-size.mjs` on the compiled guides, whole guides against single shards in estimated tokens. **How much an agent reads**, on the homepage and the Learn page, renders it.
- `site-stats.json`: the specification's version from its **Version** line and the median time of three `merlon check` runs on `docs/`, with the commit and time measured. **Where Merlon Docs stands** renders it, beside shields.io badges that show each npm package's current version when the page is viewed.

A failing `merlon check` fails the build, so a deployed page never shows figures from a tree that doesn't pass. Each section's note gives the build date and links the commit, as [Figures measured at build](../features/system/benefit-claims-and-evidence.md#figures-measured-at-build) asks.

## Deployment

[`.github/workflows/pages.yml`](../../.github/workflows/pages.yml) runs only when dispatched. The [land workflow](../../.github/workflows/land-develop.yml) dispatches it on `develop` after each landing, in its Deploy the docs site from develop step, because the landing's push to `develop` uses the workflow's own token, which doesn't start a workflow. The sync from `main` dispatches it too after it resets `develop` to `main`, so the site shows a release's versions without waiting for the next landing. A maintainer can also dispatch it by hand, on `develop`. The run executes the site tests, `pnpm site:build` and the accessibility check, and deploys the result to GitHub Pages from the ref it was dispatched on. A pull request doesn't build the site, so run `pnpm site:build` before landing; otherwise a sync or link failure shows up in the deploy run after the landing. [Repository settings](./repository-settings.md) lists the Pages source and the `github-pages` environment that the deploy needs.

## IndexNow

Each deploy tells search engines that take [IndexNow](https://www.indexnow.org/) submissions which pages changed, instead of leaving them to recrawl the site. Before the upload, [`packages/merlon-docs-site/scripts/indexnow.mjs`](../../packages/merlon-docs-site/scripts/indexnow.mjs) hashes every built page and compares the hashes with `indexnow-pages.json`, which the live site published at its last deploy. It writes the new hashes into `dist/` for this deploy to publish, and the pages that are new or changed become the submission. Once the deploy succeeds, the workflow's IndexNow job posts them to `api.indexnow.org`, and it doesn't run when no page changed. When the live site has no hash file, every page counts as changed.

The key is the file `packages/merlon-docs-site/public/<key>.txt`, whose contents are the key itself. The site serves it under its base path, which limits submissions to URLs under that path, and the script reads the key from it, so there is no second copy to keep in step. The key is public by design. To change it, replace that file with a new one; the script stops the build unless exactly one such file exists.

## Coverage scan

The site generates its pages into gitignored paths, and the [coverage](../glossary/coverage.md) scan honors `.gitignore`, so generated pages never show up as uncaptured files. The scan only reads `.md` files, so the hand-authored `index.mdx` and `learn.mdx` pages are outside `merlon check`. The post-build link check covers their links instead. No `scan.ignore` entry is needed.
