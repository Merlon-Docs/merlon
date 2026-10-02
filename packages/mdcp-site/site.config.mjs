/**
 * Shared constants for the Starlight site: astro.config.mjs and the content sync
 * script both read these, so routes, base path and repo links stay in one place.
 */

export const SITE = 'https://betsalel-williamson.github.io';
export const BASE = '/mdcp';
export const REPO_SLUG = 'betsalel-williamson/mdcp';
export const REPO_URL = `https://github.com/${REPO_SLUG}`;
export const DEFAULT_BRANCH = 'main';

/**
 * Published guides, in sidebar order. `name` is the directory under docs/;
 * `route` is the URL segment under BASE; `label` is the sidebar group label.
 */
export const PUBLISHED_GUIDES = [
  { name: 'client-cli', route: 'guide', label: 'User guide' },
  { name: 'features', route: 'concepts', label: 'Concepts & protocol' },
  { name: 'client-core', route: 'api', label: 'Library API' },
  { name: 'glossary', route: 'glossary', label: 'Glossary' },
  { name: 'developer', route: 'contributing', label: 'Contributing' },
];

/** Directory (relative to this package) that holds the generated sidebar. */
export const GENERATED_DIR = '.generated';
export const SIDEBAR_FILE = 'sidebar.json';
