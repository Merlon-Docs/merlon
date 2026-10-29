#!/usr/bin/env node
/**
 * Post-build accessibility check for the static site in dist/.
 *
 * Serves dist/ under BASE, opens a sample of pages in Chrome and runs axe-core
 * against WCAG 2.2 A and AA rules. Each page is checked in the light and dark
 * themes at desktop (1280px) and phone (390px) widths, because contrast and
 * layout differ between them. The sample is the landing page, the first page
 * of each top-level section and the page with the widest table in each section.
 * Pass --all to check every page instead of the sample. Exits non-zero when
 * axe reports any violation.
 *
 * Needs a local Chrome (GitHub's Ubuntu runners have one). Set CHROME_PATH to
 * use a different Chrome or Chromium binary.
 */
// page.evaluate and addInitScript callbacks run in the browser.
/* global window, document, localStorage */
import { createReadStream, existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { extname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { BASE } from '../site.config.mjs';

const require = createRequire(import.meta.url);
const AXE_SOURCE = require.resolve('axe-core/axe.min.js');

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const THEMES = ['light', 'dark'];
const VIEWPORTS = [
  { width: 1280, height: 900 },
  { width: 390, height: 844 },
];

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.xml': 'application/xml',
};

function walkHtml(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const abs = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkHtml(abs));
    else if (entry.name.endsWith('.html')) out.push(abs);
  }
  return out;
}

/** URL path of an HTML file in dist. */
function pagePath(distDir, file, base) {
  const rel = relative(distDir, file).split(sep).join('/');
  return `${base}/${rel.endsWith('index.html') ? rel.slice(0, -'index.html'.length) : rel}`;
}

/**
 * The landing page, the first page of each top-level section, and the page in each section with the
 * widest table (most columns), since wide tables scroll at phone width. `columns(path)` gives a
 * page's widest table, 0 for none; ties go to the first page in sort order.
 */
export function samplePages(paths, base = BASE, columns = () => 0) {
  const first = new Map([['', `${base}/`]]);
  const widest = new Map();
  for (const path of [...paths].sort()) {
    const section = path.slice(base.length + 1).split('/')[0];
    if (!section || section.endsWith('.html')) continue;
    if (!first.has(section)) first.set(section, path);
    const n = columns(path);
    if (n > (widest.get(section)?.n ?? 0)) widest.set(section, { path, n });
  }
  return [...new Set([...first.values(), ...[...widest.values()].map((w) => w.path)])];
}

/** Most header cells in any one table row of an HTML page, 0 when it has no table. */
export function widestTable(html) {
  let most = 0;
  for (const [row] of html.matchAll(/<tr[\s>][\s\S]*?<\/tr>/g)) {
    most = Math.max(most, row.match(/<t[hd][\s>]/g)?.length ?? 0);
  }
  return most;
}

/**
 * Expressive Code makes a code block that overflows focusable from a ResizeObserver after load.
 * Wait for that, up to a limit, so axe sees the page a keyboard user gets; if it never happens,
 * axe reports the block.
 */
async function codeBlocksSettled(page) {
  await page
    .waitForFunction(
      () =>
        [...document.querySelectorAll('.expressive-code pre')].every(
          (pre) => pre.scrollWidth <= pre.clientWidth || pre.hasAttribute('tabindex'),
        ),
      undefined,
      { timeout: 5000 },
    )
    .catch(() => {});
}

function serve(distDir, base) {
  const server = createServer((req, res) => {
    const path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    let abs = path.startsWith(base) ? resolve(distDir, `.${path.slice(base.length)}`) : null;
    if (abs && existsSync(abs) && statSync(abs).isDirectory()) abs = join(abs, 'index.html');
    if (!abs || !abs.startsWith(distDir) || !existsSync(abs)) {
      res.writeHead(404).end();
      return;
    }
    res.writeHead(200, { 'content-type': TYPES[extname(abs)] ?? 'application/octet-stream' });
    createReadStream(abs).pipe(res);
  });
  return new Promise((done) => server.listen(0, '127.0.0.1', () => done(server)));
}

async function main() {
  const distDir = fileURLToPath(new URL('../dist', import.meta.url));
  if (!existsSync(distDir)) {
    console.error('check-a11y: dist/ is missing. Run `pnpm site:build` first.');
    process.exit(1);
  }
  const files = new Map(
    walkHtml(distDir)
      .filter((f) => !f.endsWith('404.html'))
      .map((f) => [pagePath(distDir, f, BASE), f]),
  );
  const all = [...files.keys()];
  const columns = (path) => widestTable(readFileSync(files.get(path), 'utf8'));
  const pages = process.argv.includes('--all') ? all : samplePages(all, BASE, columns);

  const server = await serve(distDir, BASE);
  const origin = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch(
    process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : { channel: 'chrome' },
  );

  let failures = 0;
  try {
    for (const theme of THEMES) {
      for (const viewport of VIEWPORTS) {
        const context = await browser.newContext({ viewport, colorScheme: theme });
        await context.addInitScript((t) => localStorage.setItem('starlight-theme', t), theme);
        const page = await context.newPage();
        for (const path of pages) {
          await page.goto(origin + path, { waitUntil: 'load' });
          await codeBlocksSettled(page);
          await page.addScriptTag({ path: AXE_SOURCE });
          const violations = await page.evaluate(
            async (tags) =>
              (await window.axe.run(document, { runOnly: { type: 'tag', values: tags } }))
                .violations,
            WCAG_TAGS,
          );
          for (const v of violations) {
            failures += v.nodes.length;
            console.error(`${path} [${theme} ${viewport.width}px] ${v.id}: ${v.help}`);
            for (const node of v.nodes.slice(0, 5)) console.error(`  ${node.target.join(' ')}`);
            if (v.nodes.length > 5) console.error(`  …and ${v.nodes.length - 5} more`);
          }
        }
        await context.close();
      }
    }
  } finally {
    await browser.close();
    server.close();
  }

  const runs = pages.length * THEMES.length * VIEWPORTS.length;
  console.log(`check-a11y: ${pages.length} pages, ${runs} axe runs, ${failures} violations`);
  if (failures > 0) process.exit(1);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
