import { dirname, join } from 'node:path';
import type { ReadContext, SourceFormat, SourceReader, TargetLocator } from '../format.js';
import type { DocHeading, DocLink, DocParagraph, ManifestEntry, SourceDoc } from '../model.js';
import { countWords } from '../text.js';

/**
 * troff man page reader (ADR 0008), for the `man` and `mdoc`-free subset most pages use:
 * `.TH` is the title, `.SH` and `.SS` are sections, paragraph macros split prose, and
 * no-fill and example blocks (`.nf`/`.fi`, `.EX`/`.EE`) and macro definitions are left out.
 * A no-fill or example block that is never closed ends at the next `.SH` or `.SS`, so a page
 * that forgets `.fi` loses one section, not the rest of the page.
 * A page reference such as `.BR open (2)` or `open(2)` is a `manpage` link, also inside a no-fill
 * block, which is rendered text. A call such as `attrset(0)` is not a reference: no section is 0. Sections may be uppercase, as in `addch(3X)`.
 * The title is the page's name and section, `open(2)`, because that pair is what names a man page.
 * `.so file` includes another file, as `soelim` and `man` do: it is a manifest include, so a page
 * split into fragments reaches them. A page (a file with `.TH`) is never an orphan; a fragment
 * (no `.TH`) is one when no page includes it.
 */

/** The group a `.so` belongs to before any `.SH`. */
export const MAN_GROUP_BEFORE_SECTIONS = 'before any .SH';

const BREAKS = new Set(['PP', 'P', 'LP', 'IP', 'TP', 'HP', 'sp', 'br', 'RS', 'RE', 'TQ']);
const FONT_MACROS = new Set(['B', 'I', 'SM', 'SB']);
const ALTERNATING = new Set(['BR', 'RB', 'BI', 'IB', 'IR', 'RI']);
const PAGE_REF = /([A-Za-z_][\w.+-]*)\(([1-9][a-zA-Z]*)\)/g;

/** Split a request's arguments, honouring double quotes. */
function args(rest: string): string[] {
  const out: string[] = [];
  const re = /"((?:[^"]|"")*)"|(\S+)/g;
  for (const m of rest.matchAll(re)) out.push(m[1] !== undefined ? m[1].replace(/""/g, '"') : m[2]);
  return out;
}

/** troff escapes to plain text. */
export function troffToPlain(text: string): string {
  return text
    .replace(/\\f(?:\[[^\]]*\]|\(..|.)/g, '')
    .replace(/\\s[+-]?\d/g, '')
    .replace(/\\\(em|\\\[em\]/g, '—')
    .replace(/\\\(en|\\\[en\]/g, '–')
    .replace(/\\\((?:lq|rq)|\\\[(?:lq|rq)\]/g, '"')
    .replace(/\\-/g, '-')
    .replace(/\\e/g, '\\')
    .replace(/\\[&c%|^/,]/g, '')
    .replace(/\\ /g, ' ')
    .replace(/\\(.)/g, '$1');
}

export const manReader: SourceReader = {
  read(text: string, context: ReadContext): SourceDoc {
    const lines = text.split(/\r?\n/);
    const headings: DocHeading[] = [];
    const links: DocLink[] = [];
    const units: { line: number; text: string }[] = [];
    const manifest: ManifestEntry[] = [];
    let group = MAN_GROUP_BEFORE_SECTIONS;
    let hasTitle = false;
    let current: { line: number; text: string } | null = null;
    const flush = () => {
      if (current) units.push(current);
      current = null;
    };
    const pageRefs = (plain: string, line: number, name?: RegExp) => {
      for (const m of plain.matchAll(PAGE_REF)) {
        if (name && !name.test(m[1])) continue;
        links.push({ kind: 'manpage', target: `${m[1]}(${m[2]})`, line });
      }
    };
    const addText = (plain: string, line: number) => {
      const t = plain.trim();
      if (!t) return;
      pageRefs(t, line);
      if (current) current.text += ` ${t}`;
      else current = { line, text: t };
    };
    const heading = (title: string, level: number, line: number) => {
      flush();
      const plain = troffToPlain(title).trim();
      if (plain) headings.push({ text: title.trim(), plain, level, line });
    };

    let skipUntil: string | null = null;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (skipUntil && skipUntil !== '..' && /^[.']\s*S[HS]\b/.test(line)) skipUntil = null;
      if (skipUntil) {
        const done =
          skipUntil === '..'
            ? line.trim() === '..'
            : new RegExp(`^[.']\\s*${skipUntil}\\b`).test(line);
        if (done) skipUntil = null;
        // No-fill text is still rendered, and a SEE ALSO section is often set no-fill.
        // Sample output there can look like a reference (`CPUID(1):`), so a name needs a lowercase letter.
        else if (skipUntil === 'fi') pageRefs(troffToPlain(line), i + 1, /[a-z]/);
        continue;
      }
      if (/^[.']\s*\\"/.test(line) || line.startsWith('\\"')) continue;
      const req = /^[.']\s*([A-Za-z]{1,3})(?:\s+(.*))?$/.exec(line);
      if (!req) {
        if (line.trim() === '' || line.trim() === '.') flush();
        else addText(troffToPlain(line), i + 1);
        continue;
      }
      const [, name, rest = ''] = req;
      if (name === 'TH') {
        const a = args(rest);
        if (a[0]) {
          heading(a[1] ? `${a[0]}(${a[1]})` : a[0], 1, i + 1);
          hasTitle = true;
        }
      } else if (name === 'SH' || name === 'SS') {
        const level = name === 'SH' ? 2 : 3;
        if (rest.trim()) heading(args(rest).join(' '), level, i + 1);
        else if (i + 1 < lines.length) {
          heading(lines[i + 1], level, i + 2);
          i++;
        }
        const last = headings[headings.length - 1];
        if (name === 'SH' && last) group = `under .SH ${last.plain}`;
      } else if (name === 'so') {
        flush();
        const target = args(rest)[0];
        if (target) manifest.push({ target, line: i + 1, group, kind: 'include' });
      } else if (name === 'nf' || name === 'EX') {
        flush();
        skipUntil = name === 'nf' ? 'fi' : 'EE';
      } else if (name === 'de') {
        flush();
        skipUntil = '..';
      } else if (BREAKS.has(name)) {
        flush();
      } else if (FONT_MACROS.has(name)) {
        addText(troffToPlain(args(rest).join(' ')), i + 1);
      } else if (ALTERNATING.has(name)) {
        addText(troffToPlain(args(rest).join('')), i + 1);
      }
    }
    flush();

    const paragraphs: DocParagraph[] = units.map((u) => ({ line: u.line, plain: u.text }));
    // NAME lists the names the page documents, before the dash: `addch, waddch \- add a character`.
    const nameHeading = headings.find((h) => h.level === 2 && h.plain.toUpperCase() === 'NAME');
    const nameUnit = nameHeading && paragraphs.find((p) => p.line > nameHeading.line);
    const aliases = nameUnit
      ? (nameUnit.plain.split(/\s+[-–—]\s+/)[0] ?? '')
          .split(',')
          .map((n) => n.trim())
          .filter((n) => /^[A-Za-z_][\w.+-]*$/.test(n))
      : [];
    const proseWords =
      headings.reduce((n, h) => n + countWords(h.plain), 0) +
      paragraphs.reduce((n, p) => n + countWords(p.plain), 0);
    return {
      path: context.path,
      format: 'man',
      isIndex: false,
      title: headings.find((h) => h.level === 1) ?? null,
      headings,
      paragraphs,
      proseWords,
      links,
      anchors: [],
      manifest,
      orphanOk: hasTitle,
      aliases,
    };
  },
};

/**
 * Where a `.so` target may be: next to the including file (how `soelim` reads it from the page's
 * directory), under the docs root, or under the parent of the page's directory (how `man` reads
 * `.so man3/page.3` from the manual's root).
 */
export const manLocator: TargetLocator = {
  candidates(target, _kind, context) {
    if (target.startsWith('/')) return [target];
    const dir = dirname(context.from);
    return [
      ...new Set([join(dir, target), join(context.docsRoot, target), join(dirname(dir), target)]),
    ];
  },
};

export const manFormat: SourceFormat = {
  id: 'man',
  name: 'troff man page',
  reader: manReader,
  locator: manLocator,
};
