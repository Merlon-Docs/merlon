// @ts-check
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import {
  BASE,
  DEFAULT_BRANCH,
  GENERATED_DIR,
  REPO_URL,
  SIDEBAR_FILE,
  SITE,
} from './site.config.mjs';

// The sidebar is generated from each guide's index.md by scripts/sync-content.mjs.
const sidebarPath = fileURLToPath(new URL(`./${GENERATED_DIR}/${SIDEBAR_FILE}`, import.meta.url));
if (!existsSync(sidebarPath)) {
  throw new Error(
    `Missing ${GENERATED_DIR}/${SIDEBAR_FILE}. Run \`pnpm site:build\` or \`pnpm site:dev\` from the repo root ` +
      '(they build the toolchain, compile docs, and sync content first).',
  );
}
const sidebar = JSON.parse(readFileSync(sidebarPath, 'utf8'));

export default defineConfig({
  site: SITE,
  base: BASE,
  integrations: [
    starlight({
      title: 'mdcp',
      description:
        'Keep repository docs accurate while agents write the code. mdcp (MarkDown Context Protocol) compiles small Markdown shards into the READMEs people read and fails CI when they drift.',
      social: [{ icon: 'github', label: 'GitHub', href: REPO_URL }],
      // Generated pages set their own editUrl (the shard under docs/); this base
      // covers hand-authored pages in this package.
      editLink: { baseUrl: `${REPO_URL}/edit/${DEFAULT_BRANCH}/packages/mdcp-site/` },
      customCss: ['./src/styles/custom.css'],
      components: { Head: './src/components/Head.astro' },
      sidebar,
    }),
  ],
});
