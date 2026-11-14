import { basename, dirname, resolve } from 'node:path';
import type { ReadContext, SourceFormat, SourceReader } from '../format.js';
import type {
  DocAnchor,
  DocHeading,
  DocLink,
  DocParagraph,
  ManifestEntry,
  SourceDoc,
} from '../model.js';
import { countWords } from '../text.js';

/**
 * Hand-written HTML reader (ADR 0008). `<h1>`–`<h6>` are headings and the first `<h1>` is the
 * title, falling back to `<title>`. Block-level elements split prose into units; `<pre>`,
 * `<script>`, `<style>` and comments are left out; `<head>` holds no prose besides `<title>`. `<a href>` is a link,
 * and every `id` and `<a name>` is an anchor. A local link to another HTML file is a manifest
 * entry, grouped by the `<h2>` or deeper heading above it, so reachability follows the pages'
 * own navigation. It tokenizes; it does not build a DOM, so malformed markup degrades to text.
 */

/** Index files of an HTML tree besides a configured manifest. */
const HTML_INDEX_NAMES = ['index.html', 'index.htm'];

/** The group a link belongs to before any `<h2>` or deeper heading. */
export const HTML_GROUP_BEFORE_HEADINGS = 'before any <h2> heading';

/** Elements whose content is not prose. */
const SKIP = new Set(['pre', 'script', 'style', 'template', 'textarea', 'svg', 'math']);

/** Elements that start or end a prose unit. */
const BLOCK = new Set([
  'address',
  'article',
  'aside',
  'blockquote',
  'body',
  'caption',
  'center',
  'dd',
  'div',
  'dl',
  'dt',
  'figcaption',
  'figure',
  'footer',
  'form',
  'header',
  'hr',
  'html',
  'li',
  'main',
  'nav',
  'ol',
  'p',
  'section',
  'table',
  'tbody',
  'td',
  'tfoot',
  'th',
  'thead',
  'tr',
  'ul',
]);

const HTML_FILE = /\.x?html?$/i;

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  copy: '©',
  reg: '®',
  trade: '™',
  mdash: '—',
  ndash: '–',
  hellip: '…',
  lsquo: '‘',
  rsquo: '’',
  ldquo: '“',
  rdquo: '”',
  laquo: '«',
  raquo: '»',
  bull: '•',
  middot: '·',
  times: '×',
  deg: '°',
  para: '¶',
  sect: '§',
};

/** Decode character references. An unknown named reference is left as written. */
export function decodeEntities(text: string): string {
  return text.replace(
    /&(#[0-9]+|#[xX][0-9a-fA-F]+|[A-Za-z][A-Za-z0-9]*);?/g,
    (whole, ref: string) => {
      if (ref.startsWith('#')) {
        const code =
          ref[1] === 'x' || ref[1] === 'X'
            ? parseInt(ref.slice(2), 16)
            : parseInt(ref.slice(1), 10);
        return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : whole;
      }
      return NAMED_ENTITIES[ref] ?? NAMED_ENTITIES[ref.toLowerCase()] ?? whole;
    },
  );
}

/** Attributes of a start tag's text after the name. Names are lowercased; values are decoded. */
function attributesOf(rest: string): Map<string, string> {
  const out = new Map<string, string>();
  const re = /([^\s"'<>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  for (const m of rest.matchAll(re)) {
    out.set(m[1].toLowerCase(), decodeEntities(m[2] ?? m[3] ?? m[4] ?? ''));
  }
  return out;
}

function collapse(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

/** Turn an `href` into a link. */
function linkOf(href: string, line: number): DocLink | null {
  const target = href.trim();
  if (!target) return null;
  if (target.startsWith('#')) {
    return { kind: 'anchor', target: '', fragment: safeDecode(target.slice(1)), line };
  }
  if (/^[a-z][a-z0-9+.-]*:/i.test(target) || target.startsWith('//')) {
    return { kind: 'external', target, line };
  }
  let path = target;
  let fragment: string | undefined;
  const hash = path.indexOf('#');
  if (hash !== -1) {
    fragment = safeDecode(path.slice(hash + 1));
    path = path.slice(0, hash);
  }
  const query = path.indexOf('?');
  if (query !== -1) path = path.slice(0, query);
  path = safeDecode(path);
  // `href="?x"` or `href="#"` after stripping: the document itself.
  if (!path) return fragment ? { kind: 'anchor', target: '', fragment, line } : null;
  return fragment === undefined
    ? { kind: 'file', target: path, line }
    : { kind: 'file', target: path, fragment, line };
}

function safeDecode(text: string): string {
  try {
    return decodeURIComponent(text);
  } catch {
    return text;
  }
}

export const htmlReader: SourceReader = {
  read(text: string, context: ReadContext): SourceDoc {
    const headings: DocHeading[] = [];
    const links: DocLink[] = [];
    const anchors: DocAnchor[] = [];
    const manifest: ManifestEntry[] = [];
    const units: { line: number; text: string }[] = [];

    let line = 1;
    let current: { line: number; text: string } | null = null;
    let heading: { level: number; line: number; text: string } | null = null;
    let title: { line: number; text: string } | null = null;
    let inTitle = false;
    let skip: string | null = null;
    let skipDepth = 0;
    let group = HTML_GROUP_BEFORE_HEADINGS;

    const flush = () => {
      if (current) {
        const plain = collapse(current.text);
        if (plain) units.push({ line: current.line, text: plain });
      }
      current = null;
    };
    const addText = (raw: string, at: number) => {
      const decoded = decodeEntities(raw);
      if (inTitle && title) {
        title.text += decoded;
        return;
      }
      if (heading) {
        heading.text += decoded;
        return;
      }
      if (!decoded.trim()) {
        if (current) current.text += ' ';
        return;
      }
      // A unit starts on the line of its first non-blank character.
      const lead = decoded.length - decoded.trimStart().length;
      const startLine = at + (decoded.slice(0, lead).match(/\n/g)?.length ?? 0);
      if (current) current.text += decoded;
      else current = { line: startLine, text: decoded };
    };

    const tokens =
      /<!--[\s\S]*?(?:-->|$)|<!\[CDATA\[[\s\S]*?(?:\]\]>|$)|<[!?][^>]*>?|<\/?([A-Za-z][A-Za-z0-9-]*)((?:[^>"']|"[^"]*"|'[^']*')*)>|[^<]+|</g;
    for (const m of text.matchAll(tokens)) {
      const token = m[0];
      const at = line;
      line += token.match(/\n/g)?.length ?? 0;
      const rawName = m[1];
      if (!rawName) {
        if (token.startsWith('<!') || token.startsWith('<?')) continue;
        if (!skip) addText(token, at);
        continue;
      }
      const name = rawName.toLowerCase();
      const closing = token.startsWith('</');

      if (skip) {
        if (name === skip) skipDepth += closing ? -1 : 1;
        if (skipDepth === 0) skip = null;
        continue;
      }
      if (name === 'title') {
        if (closing) inTitle = false;
        else if (!title) {
          title = { line: at, text: '' };
          inTitle = true;
        }
        continue;
      }
      if (!closing && SKIP.has(name)) {
        flush();
        skip = name;
        skipDepth = 1;
        if (token.endsWith('/>')) skip = null;
        continue;
      }

      const attrs = closing ? null : attributesOf(m[2] ?? '');
      const level = /^h([1-6])$/.exec(name);
      if (attrs) {
        const id = attrs.get('id');
        if (id) anchors.push({ id, line: at, origin: level ? 'heading' : 'label' });
        const anchorName = name === 'a' ? attrs.get('name') : undefined;
        if (anchorName && anchorName !== id)
          anchors.push({ id: anchorName, line: at, origin: 'label' });
      }

      if (level) {
        if (closing) {
          if (heading) {
            const plain = collapse(heading.text);
            if (plain) {
              headings.push({ text: plain, plain, level: heading.level, line: heading.line });
              if (heading.level >= 2) group = `under <h${heading.level}> "${plain}"`;
            }
          }
          heading = null;
        } else {
          flush();
          heading = { level: Number(level[1]), line: at, text: '' };
        }
        continue;
      }
      if (name === 'br' || name === 'wbr') {
        addText(' ', at);
        continue;
      }
      if (BLOCK.has(name)) {
        flush();
        continue;
      }
      if (name === 'a' && attrs) {
        const href = attrs.get('href');
        const link = href === undefined ? null : linkOf(href, at);
        if (link) {
          links.push(link);
          if (link.kind === 'file' && HTML_FILE.test(link.target)) {
            manifest.push({
              target: link.target,
              resolved: resolve(dirname(context.path), link.target),
              line: at,
              group,
              kind: 'toc',
            });
          }
        }
      }
    }
    flush();

    const paragraphs: DocParagraph[] = units.map((u) => ({ line: u.line, plain: u.text }));
    const h1 = headings.find((h) => h.level === 1) ?? null;
    const titlePlain = title ? collapse(title.text) : '';
    const docTitle: DocHeading | null =
      h1 ??
      (title && titlePlain
        ? { text: titlePlain, plain: titlePlain, level: 1, line: title.line }
        : null);
    const proseWords =
      (h1 || !docTitle ? 0 : countWords(docTitle.plain)) +
      headings.reduce((n, h) => n + countWords(h.plain), 0) +
      paragraphs.reduce((n, p) => n + countWords(p.plain), 0);
    const name = basename(context.path);
    return {
      path: context.path,
      format: 'html',
      isIndex: name === context.manifest || HTML_INDEX_NAMES.includes(name.toLowerCase()),
      title: docTitle,
      headings,
      paragraphs,
      proseWords,
      links,
      anchors,
      manifest,
      orphanOk: false,
    };
  },
};

export const htmlFormat: SourceFormat = {
  id: 'html',
  name: 'HTML',
  reader: htmlReader,
};
