/**
 * Shared constants for the Starlight site: astro.config.mjs and the content sync
 * script both read these, so routes, base path and repo links stay in one place.
 */

const DEFAULT_REPO_SLUG = 'merlon-docs/merlon';
export const REPO_SLUG = process.env.GITHUB_REPOSITORY || DEFAULT_REPO_SLUG;
const [REPOSITORY_OWNER, REPOSITORY_NAME] = REPO_SLUG.split('/');
export const SITE = `https://${REPOSITORY_OWNER}.github.io`;
export const BASE = `/${REPOSITORY_NAME}`;
export const REPO_URL = `https://github.com/${REPO_SLUG}`;
export const DEFAULT_BRANCH = 'main';

/**
 * Published guides, in sidebar order. `name` is the directory under docs/;
 * `route` is the URL segment under BASE; `label` is the sidebar group label.
 *
 * Parts 1 and 2 are the Agent Skill and its workflows (`repo-readme` + `skills/merlon-docs/**`
 * synced directly as readable pages under `/skill/`); Part 3 is the CLI (`client-cli` under `/guide/`).
 */
export const PUBLISHED_GUIDES = [
  { name: 'repo-readme', route: 'skill', label: 'Parts 1–2: Agent Skill' },
  { name: 'client-cli', route: 'guide', label: 'Part 3: CLI (merlon)' },
  { name: 'features', route: 'concepts', label: 'Concepts' },
  { name: 'client-core', route: 'api', label: 'Library API' },
  { name: 'glossary', route: 'glossary', label: 'Glossary' },
  { name: 'developer', route: 'contributing', label: 'Contributing' },
];

/** Directory (relative to this package) that holds the generated sidebar. */
export const GENERATED_DIR = '.generated';
export const SIDEBAR_FILE = 'sidebar.json';
