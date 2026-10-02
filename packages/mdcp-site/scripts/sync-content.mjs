#!/usr/bin/env node
/**
 * Generate Starlight pages from the docs/ shards (the source of truth).
 *
 * - One page per shard in each published guide (see PUBLISHED_GUIDES).
 * - Page title = the shard's first `#` heading (removed from the body).
 * - Sidebar order comes from each guide's index.md manifest.
 * - Links are rewritten for the site:
 *   - relative `.md` links between published shards → site routes (+ page anchor);
 *   - compiled cross-links `[text](#slug)` → resolved through the refs registry
 *     (docs/_build/refs.json) and the per-guide compiled outputs, using the
 *     `<!-- mdcp-shard: start … -->` markers to find the shard that owns the slug;
 *   - anything else in the repo → https://github.com/<repo>/blob|tree/main/<path>.
 * - Any internal link that cannot be resolved fails the sync (non-zero exit).
 *
 * Output (gitignored): src/content/docs/<route>/… and .generated/sidebar.json.
 * Prerequisite: `pnpm build && pnpm docs:compile:repo` (refs registry + compiled outputs).
 */
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import GithubSlugger, { slug as githubSlug } from 'github-slugger';
import {
  BASE,
  DEFAULT_BRANCH,
  GENERATED_DIR,
  PUBLISHED_GUIDES,
  REPO_URL,
  SIDEBAR_FILE,
} from '../site.config.mjs';

export class SyncError extends Error {
  constructor(message) {
    super(message);
    this.name = 'SyncError';
  }
}

/** Hand-authored entries under src/content/docs that the sync never deletes. */
export const HAND_AUTHORED = new Set(['index.mdx']);

const toPosix = (p) => p.split(sep).join('/');

function isUnder(dir, abs) {
  const rel = relative(dir, abs);
  return rel === '' || (!rel.startsWith('..') && !rel.startsWith(`..${sep}`) && rel !== '..');
}

// ---------------------------------------------------------------------------
// Markdown scanning (fences, inline code, comments, links, headings)
// ---------------------------------------------------------------------------

/**
 * Split Markdown into fenced-code and text segments. Joining every segment's
 * `value` with '\n' reproduces the input exactly.
 * @returns {{ type: 'code' | 'text', value: string }[]}
 */
export function splitFences(markdown) {
  const segments = [];
  let buf = [];
  let fence = null;
  const flush = (type) => {
    if (buf.length) segments.push({ type, value: buf.join('\n') });
    buf = [];
  };
  for (const line of markdown.split('\n')) {
    if (!fence) {
      const open = /^\s*(`{3,}|~{3,})/.exec(line);
      if (open) {
        flush('text');
        fence = { ch: open[1][0], len: open[1].length };
      }
      buf.push(line);
    } else {
      buf.push(line);
      const close = /^\s*(`{3,}|~{3,})\s*$/.exec(line);
      if (close && close[1][0] === fence.ch && close[1].length >= fence.len) {
        flush('code');
        fence = null;
      }
    }
  }
  flush(fence ? 'code' : 'text');
  return segments;
}

const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;' };

/**
 * Turn ```mermaid fences into `<pre class="mermaid">` blocks, which skip syntax
 * highlighting and are drawn in the browser by src/components/Head.astro.
 */
export function mermaidToHtml(markdown) {
  return splitFences(markdown)
    .map((seg) => {
      const lines = seg.value.split('\n');
      if (seg.type !== 'code' || !/^\s*(`{3,}|~{3,})\s*mermaid\s*$/.test(lines[0]))
        return seg.value;
      const closed = lines.length > 1 && /^\s*(`{3,}|~{3,})\s*$/.test(lines.at(-1));
      const source = lines.slice(1, closed ? -1 : undefined).join('\n');
      return `<pre class="mermaid">${source.replace(/[&<>]/g, (c) => HTML_ESCAPES[c])}</pre>`;
    })
    .join('\n');
}

/** Apply `fn` to the text (non-fenced) segments only. */
export function mapTextSegments(markdown, fn) {
  return splitFences(markdown)
    .map((s) => (s.type === 'text' ? fn(s.value) : s.value))
    .join('\n');
}

/**
 * Same-length copy of `text` with inline code spans and HTML comments replaced
 * by NUL characters (newlines kept), so link scanning ignores them.
 */
export function maskInline(text) {
  const out = text.split('');
  const fill = (start, end) => {
    for (let i = start; i < end; i++) if (out[i] !== '\n') out[i] = '\0';
  };
  let i = 0;
  while (i < text.length) {
    if (text.startsWith('<!--', i)) {
      const end = text.indexOf('-->', i + 4);
      const stop = end === -1 ? text.length : end + 3;
      fill(i, stop);
      i = stop;
      continue;
    }
    if (text[i] === '\\') {
      i += 2;
      continue;
    }
    if (text[i] === '`') {
      let j = i;
      while (text[j] === '`') j++;
      const run = j - i;
      const blank = /\n[ \t]*\n/g;
      blank.lastIndex = j;
      const para = blank.exec(text);
      const limit = para ? para.index : text.length;
      let k = j;
      let found = -1;
      while (k < limit) {
        if (text[k] === '`') {
          let m = k;
          while (text[m] === '`') m++;
          if (m - k === run) {
            found = m;
            break;
          }
          k = m;
        } else {
          k++;
        }
      }
      if (found !== -1) {
        fill(i, found);
        i = found;
      } else {
        i = j;
      }
      continue;
    }
    i++;
  }
  return out.join('');
}

/**
 * Find inline links/images `[text](dest "title")` in a masked string.
 * @returns {{ start: number, end: number, textStart: number, textEnd: number, destStart: number, destEnd: number, image: boolean }[]}
 */
export function findInlineLinks(masked) {
  const links = [];
  let i = 0;
  while (i < masked.length) {
    if (masked[i] === '\\') {
      i += 2;
      continue;
    }
    if (masked[i] !== '[') {
      i++;
      continue;
    }
    // Match the closing bracket (nested brackets allowed).
    let depth = 0;
    let j = i;
    for (; j < masked.length; j++) {
      const c = masked[j];
      if (c === '\\') {
        j++;
        continue;
      }
      if (c === '[') depth++;
      else if (c === ']') {
        depth--;
        if (depth === 0) break;
      }
    }
    if (j >= masked.length || masked[j + 1] !== '(') {
      i++;
      continue;
    }
    let k = j + 2;
    while (masked[k] === ' ' || masked[k] === '\t') k++;
    const destStart = k;
    let destEnd;
    if (masked[k] === '<') {
      const close = masked.indexOf('>', k);
      if (close === -1) {
        i++;
        continue;
      }
      destEnd = close + 1;
      k = destEnd;
    } else {
      let parens = 0;
      while (k < masked.length) {
        const c = masked[k];
        if (c === '\\') {
          k += 2;
          continue;
        }
        if (/\s/.test(c)) break;
        if (c === '(') parens++;
        if (c === ')') {
          if (parens === 0) break;
          parens--;
        }
        k++;
      }
      destEnd = k;
    }
    // Optional title, then ')'.
    let m = k;
    while (masked[m] === ' ' || masked[m] === '\t' || masked[m] === '\n') m++;
    if (masked[m] === '"' || masked[m] === "'") {
      const q = masked[m];
      const close = masked.indexOf(q, m + 1);
      m = close === -1 ? masked.length : close + 1;
      while (masked[m] === ' ' || masked[m] === '\t') m++;
    }
    if (masked[m] !== ')') {
      i++;
      continue;
    }
    const dest = masked.slice(destStart, destEnd);
    if (dest.includes('\0')) {
      i = m + 1;
      continue;
    }
    const image = i > 0 && masked[i - 1] === '!';
    links.push({
      start: image ? i - 1 : i,
      end: m + 1,
      textStart: i + 1,
      textEnd: j,
      destStart,
      destEnd,
      image,
    });
    i = m + 1;
  }
  return links;
}

/**
 * Rewrite every inline link destination in a text segment.
 * `rewrite(dest, { image })` returns the new destination.
 */
export function rewriteLinksInText(text, rewrite) {
  const masked = maskInline(text);
  const links = findInlineLinks(masked);
  let out = '';
  let pos = 0;
  for (const link of links) {
    const rawDest = text.slice(link.destStart, link.destEnd);
    const dest = rawDest.startsWith('<') ? rawDest.slice(1, -1) : rawDest;
    const innerText = rewriteLinksInText(text.slice(link.textStart, link.textEnd), rewrite);
    const next = rewrite(dest, { image: link.image });
    out += text.slice(pos, link.textStart) + innerText + text.slice(link.textEnd, link.destStart);
    out += rawDest.startsWith('<') ? `<${next}>` : next;
    pos = link.destEnd;
  }
  return out + text.slice(pos);
}

/** Remove inline HTML tags until none are left, so `<<b>script>` cannot reassemble one. */
function stripTags(text) {
  let prev;
  do {
    prev = text;
    text = text.replace(/<[^<>]+>/g, '');
  } while (text !== prev);
  return text;
}

/** Visible text of a heading/label as GitHub or Astro would slug it. */
export function plainText(markdown) {
  return stripTags(
    markdown.replace(/\s*\{#[^}]*\}\s*$/, '').replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1'),
  )
    .replace(/`+/g, '')
    .replace(/\*\*|__/g, '')
    .replace(/(^|[^\w*])\*(?=\S)([^*]*\S)\*(?!\w)/g, '$1$2')
    .replace(/\\([\\`*_{}[\]()#+\-.!<>|])/g, '$1')
    .trim();
}

const ATX = /^ {0,3}(#{1,6})[ \t]+(.*?)(?:[ \t]+#+)?[ \t]*$/;

/** ATX headings outside fenced code, in document order. */
export function headingsOf(markdown) {
  const headings = [];
  for (const seg of splitFences(markdown)) {
    if (seg.type !== 'text') continue;
    for (const line of seg.value.split('\n')) {
      const m = ATX.exec(line);
      if (m) headings.push({ level: m[1].length, raw: m[2], text: plainText(m[2]) });
    }
  }
  return headings;
}

/**
 * Split a shard into its title and the body without that heading line. The
 * title is the first `#` heading; a shard that opens with a deeper heading
 * (some shards start at `##`) uses that opening heading instead.
 */
export function extractTitle(markdown, label = 'shard') {
  const firstLine = markdown.split('\n').find((l) => l.trim() !== '') ?? '';
  const opening = ATX.exec(firstLine);
  const hasH1 = headingsOf(markdown).some((h) => h.level === 1);
  const wanted = hasH1 ? 1 : opening ? opening[1].length : null;
  if (wanted === null) throw new SyncError(`${label}: no heading to use as the page title`);
  let title = null;
  const body = mapTextSegments(markdown, (text) => {
    if (title !== null) return text;
    const lines = text.split('\n');
    const idx = lines.findIndex((l) => {
      const m = ATX.exec(l);
      return m && m[1].length === wanted;
    });
    if (idx === -1) return text;
    title = plainText(ATX.exec(lines[idx])[2]);
    lines.splice(idx, 1);
    if (idx < lines.length && lines[idx].trim() === '') lines.splice(idx, 1);
    return lines.join('\n');
  });
  return { title, body: body.replace(/^\s*\n/, '') };
}

/** Page-local anchors as Astro generates them (fresh github-slugger per page). */
export function pageAnchors(body) {
  const slugger = new GithubSlugger();
  return headingsOf(body).map((h) => ({ ...h, slug: slugger.slug(h.text) }));
}

/**
 * Manifest list items that start with a link, as a tree. A `##`–`######`
 * heading starts a section: the items under it become the children of a
 * section node (`target: null`), which the sidebar renders as a sub-group.
 * Sections without link items are dropped.
 * @returns {{ label: string, target: string | null, children: object[] }[]}
 */
export function parseManifest(markdown) {
  const root = { indent: -1, children: [] };
  let stack = [root];
  for (const seg of splitFences(markdown)) {
    if (seg.type !== 'text') continue;
    for (const line of seg.value.split('\n')) {
      const heading = ATX.exec(line);
      if (heading && heading[1].length >= 2) {
        const section = { indent: -1, label: plainText(heading[2]), target: null, children: [] };
        root.children.push(section);
        stack = [section];
        continue;
      }
      const m = /^(\s*)[-*+][ \t]+\[(.+)\]\(([^)\s]+)\)/.exec(line);
      if (!m) continue;
      const indent = m[1].replace(/\t/g, '    ').length;
      while (stack.length > 1 && stack[stack.length - 1].indent >= indent) stack.pop();
      const node = { indent, label: plainText(m[2]), target: m[3], children: [] };
      stack[stack.length - 1].children.push(node);
      stack.push(node);
    }
  }
  const strip = (nodes) =>
    nodes
      .filter((n) => n.target !== null || n.children.length > 0)
      .map(({ label, target, children }) => ({ label, target, children: strip(children) }));
  return strip(root.children);
}

/** True when the body has prose beyond list items and headings. */
export function hasProse(body) {
  return splitFences(body).some(
    (s) =>
      s.type === 'code' ||
      s.value
        .split('\n')
        .some(
          (l) => l.trim() !== '' && !/^\s*[-*+]\s/.test(l) && !ATX.test(l) && !/^\s*<!--/.test(l),
        ),
  );
}

/** First prose paragraph as plain text, for the page description. */
export function firstParagraph(body, max = 200) {
  for (const seg of splitFences(body)) {
    if (seg.type !== 'text') continue;
    for (const para of seg.value.split(/\n[ \t]*\n/)) {
      const p = para.trim();
      if (!p || /^(#|[-*+] |\d+\. |\||<|!\[|\[!\[|>)/.test(p)) continue;
      let text = plainText(p.replace(/\s*\n\s*/g, ' '));
      if (!text) continue;
      if (text.length > max) text = `${text.slice(0, max).replace(/\s+\S*$/, '')}…`;
      return text;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Compiled-output slug ownership
// ---------------------------------------------------------------------------

/**
 * Map each slug in a refs registry to the shard that owns it, using the
 * `<!-- mdcp-shard: start|end <path> -->` markers in the compiled file the
 * registry was generated from. Paths in markers are relative to the compiled
 * file's directory.
 * @returns {Map<string, { sourceAbs: string | null, title: string }>}
 */
export function buildSlugOwners(compiledText, registry, compiledPath) {
  const lines = compiledText.split('\n');
  const owners = new Array(lines.length).fill(null);
  const stack = [];
  for (let i = 0; i < lines.length; i++) {
    const m = /^<!-- mdcp-shard: (start|end) (.+?) -->$/.exec(lines[i].trim());
    if (m && m[1] === 'start') stack.push(resolve(dirname(compiledPath), m[2]));
    owners[i] = stack.length ? stack[stack.length - 1] : null;
    if (m && m[1] === 'end') stack.pop();
  }
  const slugs = new Map();
  for (const h of registry.headings) {
    const line = lines[h.line - 1];
    if (line === undefined || !/^\s{0,3}#/.test(line)) {
      throw new SyncError(
        `refs registry is stale for ${compiledPath}: line ${h.line} is not the heading "${h.title}". ` +
          'Run `pnpm build && pnpm docs:compile:repo`.',
      );
    }
    if (!slugs.has(h.slug)) slugs.set(h.slug, { sourceAbs: owners[h.line - 1], title: h.title });
  }
  return slugs;
}

// ---------------------------------------------------------------------------
// Site generation
// ---------------------------------------------------------------------------

/**
 * Resolve a config path under `outputDir` the way mdcp-core does: a path that
 * already starts with the output dir (for example `_build/refs.json`) is taken
 * relative to the docs root; anything else is relative to the output dir.
 */
export function resolveUnderOutputDir(docsRoot, outputDir, file) {
  if (isAbsolute(file)) return file;
  const outputRoot = resolve(docsRoot, outputDir);
  const underOutputDir = resolve(outputRoot, file);
  const docsRelative = resolve(docsRoot, file);
  if (docsRelative !== underOutputDir && isUnder(outputRoot, docsRelative)) return docsRelative;
  return underOutputDir;
}

function walkMarkdown(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const abs = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkMarkdown(abs));
    else if (entry.isFile() && entry.name.endsWith('.md')) out.push(abs);
  }
  return out.sort();
}

function routeFor(guide, rel, label) {
  const parts = rel.replace(/\.md$/, '').split('/');
  if (parts[parts.length - 1] === 'index') parts.pop();
  const slugged = parts.map((part) => githubSlug(part));
  if (slugged.some((part) => !part)) throw new SyncError(`${label}: cannot derive a URL slug`);
  return [guide.route, ...slugged].join('/');
}

/**
 * Generate the site content.
 * @param {object} opts
 * @param {string} opts.repoRoot
 * @param {string} opts.docsRoot
 * @param {string} opts.configPath mdcp.config.json
 * @param {string} opts.contentDir src/content/docs
 * @param {string} opts.generatedDir directory for sidebar.json
 * @param {(text: string) => { headings: { slug: string, title: string, line: number }[] }} opts.buildSlugRegistry
 * @param {typeof PUBLISHED_GUIDES} [opts.guides]
 * @param {string} [opts.base]
 * @param {string} [opts.repoUrl]
 * @param {string} [opts.branch]
 */
export function syncContent(opts) {
  const {
    repoRoot,
    docsRoot,
    configPath,
    contentDir,
    generatedDir,
    buildSlugRegistry,
    guides = PUBLISHED_GUIDES,
    base = BASE,
    repoUrl = REPO_URL,
    branch = DEFAULT_BRANCH,
  } = opts;

  const config = JSON.parse(readFileSync(configPath, 'utf8'));
  const outputDirName = config.outputDir ?? '_build';
  const underOut = (file) => resolveUnderOutputDir(docsRoot, outputDirName, file);
  const guideConfig = new Map((config.guides ?? []).map((g) => [g.name, g]));

  // --- Compiled outputs and slug ownership ---------------------------------
  const refsPath = underOut(config.refs?.registryFile ?? '.caches/refs.json');
  const monolithPath = underOut(config.outputFile ?? 'guides.md');
  for (const p of [refsPath, monolithPath]) {
    if (!existsSync(p)) {
      throw new SyncError(
        `missing ${toPosix(relative(repoRoot, p))}: run \`pnpm build && pnpm docs:compile:repo\` first`,
      );
    }
  }
  /** @type {{ path: string, guide: string | null, slugs: Map<string, { sourceAbs: string | null, title: string }> }[]} */
  const outputs = [];
  const registry = JSON.parse(readFileSync(refsPath, 'utf8'));
  outputs.push({
    path: monolithPath,
    guide: null,
    slugs: buildSlugOwners(readFileSync(monolithPath, 'utf8'), registry, monolithPath),
  });
  const outputByGuide = new Map();
  for (const guide of guides) {
    const outFile = guideConfig.get(guide.name)?.compile?.outputFile;
    if (!outFile) continue;
    const path = underOut(outFile);
    if (!existsSync(path)) {
      throw new SyncError(
        `missing compiled output ${toPosix(relative(repoRoot, path))}: run \`pnpm docs:compile:repo\``,
      );
    }
    const text = readFileSync(path, 'utf8');
    const entry = {
      path,
      guide: guide.name,
      slugs: buildSlugOwners(text, buildSlugRegistry(text), path),
    };
    outputs.push(entry);
    outputByGuide.set(guide.name, entry);
  }

  // --- Pages ----------------------------------------------------------------
  /** @type {Map<string, any>} */
  const pages = new Map();
  const routes = new Map();
  for (const guide of guides) {
    const guideDir = resolve(docsRoot, guide.name);
    if (!existsSync(join(guideDir, 'index.md'))) {
      throw new SyncError(`docs/${guide.name}/index.md not found`);
    }
    for (const abs of walkMarkdown(guideDir)) {
      const rel = toPosix(relative(guideDir, abs));
      const label = `docs/${guide.name}/${rel}`;
      const route = routeFor(guide, rel, label);
      if (routes.has(route)) {
        throw new SyncError(`${label}: route /${route}/ collides with ${routes.get(route)}`);
      }
      routes.set(route, label);
      const source = readFileSync(abs, 'utf8');
      const { title, body } = extractTitle(source, label);
      pages.set(abs, {
        abs,
        guide,
        guideDir,
        rel,
        label,
        route,
        title,
        body,
        anchors: pageAnchors(body),
        isIndex: rel.endsWith('index.md'),
      });
    }
  }

  const routeUrl = (route) => `${base}/${route}/`;
  const githubUrl = (abs) => {
    const rel = toPosix(relative(repoRoot, abs));
    const kind = statSync(abs).isDirectory() ? 'tree' : 'blob';
    return `${repoUrl}/${kind}/${branch}/${rel}`.replace(/\/$/, '');
  };
  const titleSlug = (page) => new GithubSlugger().slug(page.title);

  function anchorForTitle(page, title, context) {
    const text = plainText(title);
    if (text === page.title) return '';
    const hit = page.anchors.find((a) => a.text === text);
    if (!hit) throw new SyncError(`${context}: heading "${title}" not found in ${page.label}`);
    return `#${hit.slug}`;
  }

  function resolveCompiledSlug(slug, preferred, context, currentGuideRoot) {
    if (slug === 'table-of-contents') return currentGuideRoot;
    const order = [...preferred, ...outputs.filter((o) => !preferred.includes(o))];
    for (const out of order) {
      const owner = out.slugs.get(slug);
      if (!owner) continue;
      const target = owner.sourceAbs ? pages.get(owner.sourceAbs) : null;
      if (!target) {
        if (!owner.sourceAbs && out.guide) {
          return routeUrl(guides.find((g) => g.name === out.guide).route);
        }
        continue;
      }
      return routeUrl(target.route) + anchorForTitle(target, owner.title, context);
    }
    throw new SyncError(
      `${context}: cross-link #${slug} does not resolve to any published shard heading`,
    );
  }

  function anchorInPage(page, frag, context) {
    if (!frag) return '';
    const decoded = decodeURIComponent(frag);
    if (page.anchors.some((a) => a.slug === decoded)) return `#${decoded}`;
    if (titleSlug(page) === decoded) return '';
    for (const out of outputs) {
      const owner = out.slugs.get(decoded);
      if (owner && owner.sourceAbs === page.abs) return anchorForTitle(page, owner.title, context);
    }
    throw new SyncError(`${context}: anchor #${frag} not found in ${page.label}`);
  }

  function preferredOutputs(page) {
    const own = outputByGuide.get(page.guide.name);
    return own ? [own, outputs[0]] : [outputs[0]];
  }

  const stats = { pages: 0, internal: 0, crossLinks: 0, github: 0, external: 0 };

  function rewriteDest(page, dest, image) {
    const context = `${page.label}: link "${dest}"`;
    if (/^[a-z][a-z0-9+.-]*:/i.test(dest) || dest.startsWith('//')) {
      stats.external++;
      return dest;
    }
    if (dest === '') throw new SyncError(`${context}: empty link destination`);
    const hash = dest.indexOf('#');
    const pathPart = hash === -1 ? dest : dest.slice(0, hash);
    const frag = hash === -1 ? '' : dest.slice(hash + 1);
    const guideRoot = routeUrl(page.guide.route);

    if (pathPart === '') {
      stats.crossLinks++;
      return resolveCompiledSlug(
        decodeURIComponent(frag),
        preferredOutputs(page),
        context,
        guideRoot,
      );
    }

    const decoded = decodeURI(pathPart.split('?')[0]);
    const gc = guideConfig.get(page.guide.name);
    const bases = decoded.startsWith('/')
      ? [repoRoot]
      : [
          dirname(page.abs),
          page.guideDir,
          gc?.compile?.scopeRoot ? resolve(docsRoot, gc.compile.scopeRoot) : null,
          gc?.compile?.outputFile ? dirname(underOut(gc.compile.outputFile)) : null,
        ].filter(Boolean);
    const candidates = bases.map((b) => resolve(b, decoded.replace(/^\//, '')));
    const abs = candidates.find((c) => existsSync(c));
    if (!abs) throw new SyncError(`${context}: target not found`);
    if (!isUnder(repoRoot, abs))
      throw new SyncError(`${context}: target is outside the repository`);

    const target = pages.get(abs);
    if (target) {
      if (image) throw new SyncError(`${context}: image points at a Markdown page`);
      stats.internal++;
      return routeUrl(target.route) + anchorInPage(target, frag, context);
    }
    const out = outputs.find((o) => o.path === abs && o.guide);
    if (out && !image) {
      stats.crossLinks++;
      const outRoot = routeUrl(guides.find((g) => g.name === out.guide).route);
      return frag
        ? resolveCompiledSlug(decodeURIComponent(frag), [out], context, outRoot)
        : outRoot;
    }
    stats.github++;
    const url = githubUrl(abs);
    if (image) return url.replace('/blob/', '/raw/');
    return frag ? `${url}#${frag}` : url;
  }

  // --- Write pages ------------------------------------------------------------
  mkdirSync(contentDir, { recursive: true });
  for (const entry of readdirSync(contentDir)) {
    if (!HAND_AUTHORED.has(entry))
      rmSync(join(contentDir, entry), { recursive: true, force: true });
  }
  for (const page of pages.values()) {
    const body = mermaidToHtml(
      mapTextSegments(page.body, (text) =>
        rewriteLinksInText(text, (dest, { image }) => rewriteDest(page, dest, image)),
      ),
    );
    const sourceRel = toPosix(relative(repoRoot, page.abs));
    const description = firstParagraph(page.body);
    const front = [
      '---',
      `title: ${JSON.stringify(page.title)}`,
      `slug: ${JSON.stringify(page.route)}`,
      ...(description ? [`description: ${JSON.stringify(description)}`] : []),
      `editUrl: ${JSON.stringify(`${repoUrl}/edit/${branch}/${sourceRel}`)}`,
      '---',
      '',
      `<!-- Generated from ${sourceRel} by packages/mdcp-site/scripts/sync-content.mjs. Edit the shard, not this file. -->`,
      '',
    ].join('\n');
    const file = join(contentDir, page.isIndex ? `${page.route}/index.md` : `${page.route}.md`);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, `${front}\n${body.trimEnd()}\n`);
    stats.pages++;
  }

  // --- Sidebar ----------------------------------------------------------------
  const unlisted = [];
  const sidebar = guides.map((guide, index) => {
    const guideDir = resolve(docsRoot, guide.name);
    const used = new Set();
    const rootIndex = pages.get(join(guideDir, 'index.md'));
    used.add(rootIndex.abs);

    const leaf = (page, label) => {
      used.add(page.abs);
      return { label: label || page.title, slug: page.route };
    };
    const resolveTarget = (fromDir, target) => {
      if (target === null || target.startsWith('#') || /^[a-z]+:/i.test(target)) return null;
      return resolve(fromDir, decodeURI(target.split('#')[0]));
    };

    function convert(nodes, fromDir) {
      const items = [];
      for (const node of nodes) {
        if (node.target === null) {
          // `##` section in the manifest → sidebar sub-group.
          const sectionItems = convert(node.children, fromDir);
          if (sectionItems.length) items.push({ label: node.label, items: sectionItems });
          continue;
        }
        const abs = resolveTarget(fromDir, node.target);
        const page = abs ? pages.get(abs) : null;
        if (!page || page.guide.name !== guide.name) {
          items.push(...convert(node.children, fromDir));
          continue;
        }
        const isSubIndex = page.isIndex && page.abs !== rootIndex.abs;
        if (isSubIndex) {
          const subDir = dirname(page.abs);
          const inside = [];
          const outside = [];
          for (const child of node.children) {
            const childAbs = resolveTarget(fromDir, child.target);
            (childAbs && isUnder(subDir, childAbs) ? inside : outside).push(child);
          }
          let childItems = convert(inside, fromDir);
          if (childItems.length === 0) {
            const keep = (nodes) =>
              nodes.flatMap((c) => {
                if (c.target === null) {
                  const children = keep(c.children);
                  return children.length ? [{ ...c, children }] : [];
                }
                const childAbs = resolveTarget(subDir, c.target);
                return childAbs && isUnder(subDir, childAbs) && !used.has(childAbs) ? [c] : [];
              });
            const own = keep(parseManifest(readFileSync(page.abs, 'utf8')));
            used.add(page.abs);
            childItems = convert(own, subDir);
          }
          if (childItems.length === 0) {
            items.push(leaf(page, node.label));
          } else {
            used.add(page.abs);
            items.push({
              label: node.label,
              collapsed: true,
              items: [{ label: 'Overview', slug: page.route }, ...childItems],
            });
          }
          items.push(...convert(outside, fromDir));
          continue;
        }
        if (node.children.length) {
          const first = resolveTarget(fromDir, node.children[0].target);
          const childItems = convert(node.children, fromDir);
          if (first === page.abs) {
            items.push({ label: node.label, collapsed: true, items: childItems });
          } else {
            items.push({
              label: node.label,
              collapsed: true,
              items: [leaf(page, 'Overview'), ...childItems],
            });
          }
          continue;
        }
        if (used.has(page.abs)) continue;
        items.push(leaf(page, node.label));
      }
      return items;
    }

    const items = [];
    if (hasProse(rootIndex.body)) items.push({ label: rootIndex.title, slug: rootIndex.route });
    items.push(...convert(parseManifest(readFileSync(rootIndex.abs, 'utf8')), guideDir));
    const extra = [...pages.values()]
      .filter((p) => p.guide.name === guide.name && !used.has(p.abs))
      .sort((a, b) => a.rel.localeCompare(b.rel));
    for (const page of extra) {
      unlisted.push(page.label);
      items.push(leaf(page));
    }
    return { label: guide.label, collapsed: index !== 0, items };
  });

  mkdirSync(generatedDir, { recursive: true });
  writeFileSync(join(generatedDir, SIDEBAR_FILE), `${JSON.stringify(sidebar, null, 2)}\n`);

  return { stats, unlisted, pages: [...pages.values()].map((p) => p.route) };
}

async function main() {
  const here = dirname(fileURLToPath(import.meta.url));
  const pkgRoot = resolve(here, '..');
  const repoRoot = resolve(pkgRoot, '../..');
  let buildSlugRegistry;
  try {
    ({ buildSlugRegistry } = await import('@bwilliamson/mdcp-core'));
  } catch (err) {
    throw new SyncError(
      `cannot load @bwilliamson/mdcp-core (run \`pnpm build\` first): ${err.message}`,
    );
  }
  const result = syncContent({
    repoRoot,
    docsRoot: join(repoRoot, 'docs'),
    configPath: join(repoRoot, 'docs', 'mdcp.config.json'),
    contentDir: join(pkgRoot, 'src', 'content', 'docs'),
    generatedDir: join(pkgRoot, GENERATED_DIR),
    buildSlugRegistry,
  });
  const s = result.stats;
  console.log(
    `mdcp-site: ${s.pages} pages; links: ${s.internal} shard, ${s.crossLinks} cross-link, ` +
      `${s.github} repo (GitHub), ${s.external} external`,
  );
  if (result.unlisted.length) {
    console.log(
      `mdcp-site: not in any index.md manifest (appended to sidebar): ${result.unlisted.join(', ')}`,
    );
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(`mdcp-site sync failed: ${err.message}`);
    process.exit(1);
  });
}
