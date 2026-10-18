#!/usr/bin/env node
/**
 * Plan an IndexNow submission (https://www.indexnow.org/) for the built site in dist/.
 *
 * Hashes every page, compares the hashes with the ones the live site published at its last
 * deploy, and writes the new set to dist/indexnow-pages.json, which this deploy publishes. The
 * pages that are new or changed become the submission. When the live site has no hash file yet,
 * every page counts as changed.
 *
 * Prints the submission's JSON body, or nothing when no page changed. In GitHub Actions it also
 * sets the step outputs `count` and `payload`, which the Pages workflow posts after deploying.
 */
import { createHash } from 'node:crypto';
import { appendFileSync, existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BASE, SITE } from '../site.config.mjs';

export const HASH_FILE = 'indexnow-pages.json';

/** Site-relative paths of the built pages, such as `index.html` and `guide/index.html`. */
export function pagePaths(distDir) {
  const out = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const abs = join(dir, entry.name);
      if (entry.isDirectory()) walk(abs);
      else if (entry.name.endsWith('.html')) out.push(relative(distDir, abs).split(sep).join('/'));
    }
  };
  walk(distDir);
  return out.filter((path) => path !== '404.html').sort();
}

/** The page's public URL: `guide/index.html` → `<site><base>/guide/`. */
export function pageUrl(path, site = SITE, base = BASE) {
  const route = path.endsWith('index.html') ? path.slice(0, -'index.html'.length) : path;
  return `${site}${base}/${route}`;
}

/** Paths whose hash is new or differs from the previous deploy's. */
export function changedPaths(current, previous) {
  return Object.keys(current)
    .filter((path) => current[path] !== previous[path])
    .sort();
}

/**
 * The IndexNow key: the name of the one file in public/ whose contents are its own name without
 * `.txt`, which the site serves at `<base>/<key>.txt`. The key is public by design.
 */
export function indexNowKey(publicDir) {
  const keys = readdirSync(publicDir)
    .filter((name) => /^[0-9a-f]{8,128}\.txt$/.test(name))
    .map((name) => name.slice(0, -'.txt'.length))
    .filter((key) => readFileSync(join(publicDir, `${key}.txt`), 'utf8').trim() === key);
  if (keys.length !== 1) {
    throw new Error(
      `public/ must hold exactly one IndexNow key file, <key>.txt containing <key>; found ${keys.length}.`,
    );
  }
  return keys[0];
}

/** The IndexNow request body for these URLs. */
export function submission(urls, key, site = SITE, base = BASE) {
  return {
    host: new URL(site).host,
    key,
    keyLocation: `${site}${base}/${key}.txt`,
    urlList: urls,
  };
}

async function previousHashes() {
  try {
    const response = await fetch(`${SITE}${BASE}/${HASH_FILE}`);
    return response.ok ? await response.json() : {};
  } catch {
    return {};
  }
}

async function main() {
  const siteRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
  const distDir = join(siteRoot, 'dist');
  const key = indexNowKey(join(siteRoot, 'public'));
  if (!existsSync(join(distDir, `${key}.txt`))) {
    throw new Error(`dist/${key}.txt is missing; the build didn't copy public/.`);
  }

  const current = {};
  for (const path of pagePaths(distDir)) {
    current[path] = createHash('sha256')
      .update(readFileSync(join(distDir, path)))
      .digest('hex');
  }
  writeFileSync(join(distDir, HASH_FILE), `${JSON.stringify(current, null, 2)}\n`);

  const urls = changedPaths(current, await previousHashes()).map((path) => pageUrl(path));
  const payload = urls.length ? JSON.stringify(submission(urls, key)) : '';
  if (payload) console.log(payload);
  console.error(`indexnow: ${urls.length} of ${Object.keys(current).length} pages changed`);
  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT, `count=${urls.length}\npayload=${payload}\n`);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
