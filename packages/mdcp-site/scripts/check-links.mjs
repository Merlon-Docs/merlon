#!/usr/bin/env node
/**
 * Post-build link check for the static site in dist/.
 *
 * Every same-site href (under BASE) must point at a file that exists in dist/,
 * and every #fragment on an HTML target must match an id on that page. External
 * links are not fetched. Exits non-zero when anything is broken.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { BASE } from '../site.config.mjs';

const ENTITIES = { '&amp;': '&', '&quot;': '"', '&#39;': "'", '&lt;': '<', '&gt;': '>' };

/** Decode the entities Astro emits in attributes, in one pass so `&amp;lt;` stays `&lt;`. */
const decodeEntities = (s) => s.replace(/&(?:amp|quot|#39|lt|gt);/g, (e) => ENTITIES[e]);

function walkHtml(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const abs = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkHtml(abs));
    else if (entry.name.endsWith('.html')) out.push(abs);
  }
  return out;
}

/** Ids and hrefs in one HTML document. */
export function scanHtml(html) {
  const ids = new Set();
  for (const m of html.matchAll(/\sid="([^"]+)"/g)) ids.add(decodeEntities(m[1]));
  const hrefs = [];
  for (const m of html.matchAll(/<a\b[^>]*?\shref="([^"]*)"/g)) hrefs.push(decodeEntities(m[1]));
  return { ids, hrefs };
}

/** URL path of an HTML file in dist (for resolving relative hrefs). */
function pagePath(distDir, file, base) {
  const rel = relative(distDir, file).split(sep).join('/');
  const path = rel.endsWith('index.html') ? rel.slice(0, -'index.html'.length) : rel;
  return `${base}/${path}`;
}

/** Map a site URL path to a file in dist, or null. */
function fileForPath(distDir, path, base) {
  if (!path.startsWith(`${base}/`) && path !== base) return null;
  const rel = decodeURIComponent(path.slice(base.length)).replace(/^\//, '');
  const abs = resolve(distDir, rel);
  if (existsSync(abs) && statSync(abs).isFile()) return abs;
  const index = join(abs, 'index.html');
  if (existsSync(index)) return index;
  return null;
}

export function checkLinks(distDir, base = BASE) {
  const files = walkHtml(distDir);
  const cache = new Map();
  const scan = (file) => {
    if (!cache.has(file)) cache.set(file, scanHtml(readFileSync(file, 'utf8')));
    return cache.get(file);
  };
  const broken = [];
  let checked = 0;
  for (const file of files) {
    const from = pagePath(distDir, file, base);
    for (const href of scan(file).hrefs) {
      if (/^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith('//')) continue;
      checked++;
      const url = new URL(href, `https://site.invalid${from}`);
      const target =
        url.pathname === from && !href.split('#')[0]
          ? file
          : fileForPath(distDir, url.pathname, base);
      if (!target) {
        broken.push({ page: from, href, reason: 'no such page or file' });
        continue;
      }
      const frag = decodeURIComponent(url.hash.slice(1));
      if (frag && target.endsWith('.html') && !scan(target).ids.has(frag)) {
        broken.push({ page: from, href, reason: `no id "${frag}" on target page` });
      }
    }
  }
  return { pages: files.length, checked, broken };
}

function main() {
  const distDir = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'dist');
  if (!existsSync(distDir)) {
    console.error('check-links: dist/ not found; run the site build first');
    process.exit(1);
  }
  const { pages, checked, broken } = checkLinks(distDir);
  console.log(
    `check-links: ${pages} HTML pages, ${checked} internal links checked, ${broken.length} broken`,
  );
  for (const b of broken) console.error(`  ${b.page} → ${b.href} (${b.reason})`);
  if (broken.length) process.exit(1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
