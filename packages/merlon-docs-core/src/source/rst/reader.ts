import { dirname, extname, join, resolve } from 'node:path';
import type { ReadContext, SourceFormat, SourceReader, TargetLocator } from '../format.js';
import type {
  DocAnchor,
  DocHeading,
  DocLink,
  DocParagraph,
  ManifestEntry,
  SourceDoc,
} from '../model.js';
import { countWords } from '../text.js';
import { normalizeRstLabel, RST_EXTENSIONS } from './names.js';

export { normalizeRstLabel, rstDocname } from './names.js';
import { sphinxRefs, type SphinxRefOptions } from './sphinx.js';

/**
 * reStructuredText reader (ADR 0008). Line-level heuristics, no docutils: enough to find titles,
 * sections, toctrees, includes, labels, `:ref:` and `:doc:` roles, and the prose between them.
 */

/** Directives whose body is prose a reader sees (admonitions and friends). */
const PROSE_DIRECTIVES = new Set([
  'admonition',
  'attention',
  'caution',
  'compound',
  'container',
  'danger',
  'deprecated',
  'epigraph',
  'error',
  'highlights',
  'hint',
  'important',
  'note',
  'only',
  'pull-quote',
  'rubric',
  'seealso',
  'sidebar',
  'tip',
  'topic',
  'versionadded',
  'versionchanged',
  'warning',
]);

const INCLUDE_DIRECTIVES = new Set(['include', 'literalinclude']);

/** `.. name:: argument`, optionally as a list item (`* .. note::`). */
const DIRECTIVE = /^(\s*)(?:[*+-]\s+)?\.\.\s+([A-Za-z0-9_][\w:+.-]*)::(?:\s+(.*))?$/;
/** `.. _label:` with nothing after the colon; backquoted for labels holding colons or spaces. */
const LABEL = /^(\s*)(?:[*+-]\s+)?\.\.\s+_(?:`([^`]+)`|([^:`][^:]*?)):\s*$/;
/** Any explicit markup start: `..` then a space, or `..` alone. */
const EXPLICIT = /^(\s*)(?:[*+-]\s+)?\.\.(?:\s|$)/;
const OPTION = /^\s+:([\w-]+):(?:\s+(.*))?$/;
const FIELD = /^:([\w -]+):(?:\s+.*)?$/;
const ADORNMENT = /^([!-/:-@[-`{-~])\1{2,}\s*$/;
const GRID_BORDER = /^\s*\+[-=+]+\+\s*$/;
const SIMPLE_BORDER = /^\s*=+(?: +=+)+\s*$/;
const LIST_ITEM = /^(?:[*+-]|#\.|\d+[.)]|\(\d+\)|[a-zA-Z][.)])\s+/;
const ROLE = /(?<![\w`]):(?:[\w-]+:)?(ref|doc):`([^`]+)`/g;
const HYPERLINK = /`([^`<]*?)\s*<([^`>]+)>`__?/g;

function indentOf(line: string): number {
  let n = 0;
  for (const ch of line) {
    if (ch === ' ') n++;
    else if (ch === '\t') n += 8 - (n % 8);
    else break;
  }
  return n;
}

const isBlank = (line: string | undefined) => line === undefined || line.trim() === '';

/** The target of a role body: `Text <target>` gives `target`; `~` and `!` prefixes dropped. */
function roleTarget(body: string): string {
  const collapsed = body.trim().split(/\s+/).join(' ');
  const m = /<([^<>]+)>$/.exec(collapsed);
  const target = m ? m[1].trim() : collapsed;
  return target.replace(/^[~!]+/, '');
}

/** RST inline markup to plain text. */
export function rstInlineToPlain(text: string): string {
  return text
    .replace(/``([^`]*)``/g, '$1')
    .replace(/(?<![\w`]):(?:[\w-]+:)?[\w-]+:`([^`]*)`/g, (_, body: string) => {
      const m = /^(.*?)\s*<[^<>]*>$/s.exec(body.trim());
      return (m && m[1] ? m[1] : body).replace(/^[~!]+/, '');
    })
    .replace(/`([^`<]*?)\s*<[^`>]*>`__?/g, '$1')
    .replace(/`([^`]+)`__?/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*\s][^*]*)\*/g, '$1')
    .replace(/\s*\[[^\]\s]+\]_/g, '')
    .replace(/\|([^|\s][^|]*)\|/g, '$1')
    .replace(/(\w)__?(?=$|[\s.,;:!?)\]])/g, '$1')
    .replace(/\\(.)/g, '$1');
}

interface Scan {
  /** Lines with masked (non-prose) lines blanked, for role scanning and paragraphs. */
  prose: (string | null)[];
  headings: DocHeading[];
  anchors: DocAnchor[];
  manifest: ManifestEntry[];
  orphanOk: boolean;
}

function scan(lines: string[]): Scan {
  const prose: (string | null)[] = lines.map(() => null);
  const headings: DocHeading[] = [];
  const anchors: DocAnchor[] = [];
  const manifest: ManifestEntry[] = [];
  const styles: string[] = [];
  let orphanOk = false;
  let seenContent = false;
  /** Indent of the paragraph that ended with `::`, while its literal block may still follow. */
  let literalAfter: number | null = null;

  const levelOf = (style: string) => {
    let i = styles.indexOf(style);
    if (i === -1) {
      styles.push(style);
      i = styles.length - 1;
    }
    return i + 1;
  };
  const addHeading = (text: string, line: number, style: string) => {
    const trimmed = text.trim();
    headings.push({ text: trimmed, plain: rstInlineToPlain(trimmed), level: levelOf(style), line });
    anchors.push({ id: normalizeRstLabel(rstInlineToPlain(trimmed)), line, origin: 'heading' });
  };
  /** Lines after `start` that belong to a block indented deeper than `indent`. */
  const blockEnd = (start: number, indent: number) => {
    let end = start;
    let i = start;
    while (i < lines.length && (isBlank(lines[i]) || indentOf(lines[i]) > indent)) {
      if (!isBlank(lines[i])) end = i + 1;
      i++;
    }
    return end;
  };

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (isBlank(line)) {
      i++;
      continue;
    }
    const indent = indentOf(line);

    if (literalAfter !== null) {
      const after = literalAfter;
      literalAfter = null;
      if (indent > after) {
        i = blockEnd(i, after);
        continue;
      }
    }

    // Field list before any content: `:orphan:` and document metadata.
    if (!seenContent && indent === 0 && FIELD.test(line) && !line.startsWith(':ref:')) {
      if (/^:orphan:\s*$/.test(line)) orphanOk = true;
      i++;
      continue;
    }

    const label = LABEL.exec(line);
    if (label) {
      const name = label[2] ?? label[3];
      anchors.push({ id: normalizeRstLabel(name), line: i + 1, origin: 'label' });
      i++;
      continue;
    }

    const directive = DIRECTIVE.exec(line);
    if (directive) {
      seenContent = true;
      const at = line.indexOf('..');
      const name = directive[2].toLowerCase();
      const arg = (directive[3] ?? '').trim();
      const end = blockEnd(i + 1, at);
      // Options: the body lines that open with `:name:`, before the first blank line.
      const options = new Map<string, string>();
      let j = i + 1;
      while (j < end && !isBlank(lines[j])) {
        const opt = OPTION.exec(lines[j]);
        if (!opt) break;
        options.set(opt[1], (opt[2] ?? '').trim());
        j++;
      }
      const named = options.get('name');
      if (named) anchors.push({ id: normalizeRstLabel(named), line: i + 1, origin: 'name' });

      if (name === 'toctree') {
        const caption = options.get('caption');
        const group = caption ? `toctree "${caption}"` : `uncaptioned toctree at line ${i + 1}`;
        const glob = options.has('glob');
        for (let k = j; k < end; k++) {
          const entry = lines[k].trim();
          if (!entry || entry.startsWith(':')) continue;
          const target = roleTarget(entry);
          if (target === 'self' || /^[a-z][a-z0-9+.-]*:\/\//i.test(target)) continue;
          manifest.push({
            target,
            line: k + 1,
            group,
            kind: 'toc',
            ...(glob && /[*?[]/.test(target) ? { glob: true } : {}),
          });
        }
      } else if (INCLUDE_DIRECTIVES.has(name) && arg) {
        manifest.push({ target: arg, line: i + 1, group: 'includes', kind: 'include' });
      }

      if (PROSE_DIRECTIVES.has(name)) {
        if (arg && name !== 'only') prose[i] = arg;
        i = j;
      } else {
        i = end;
      }
      continue;
    }

    if (EXPLICIT.test(line)) {
      // A comment, substitution definition, footnote or hyperlink target: no prose.
      const at = line.indexOf('..');
      i = blockEnd(i + 1, at);
      continue;
    }

    if (GRID_BORDER.test(line) || SIMPLE_BORDER.test(line)) {
      seenContent = true;
      let k = i;
      while (k < lines.length && !isBlank(lines[k])) k++;
      i = k;
      continue;
    }

    // Section title with an overline.
    const over = ADORNMENT.exec(line);
    if (over && !isBlank(lines[i + 1]) && lines[i + 2]?.trim() === line.trim()) {
      seenContent = true;
      addHeading(lines[i + 1], i + 2, `${over[1]}o`);
      i += 3;
      continue;
    }
    // Section title with only an underline.
    const under = ADORNMENT.exec(lines[i + 1] ?? '');
    if (
      under &&
      indent === 0 &&
      !ADORNMENT.test(line) &&
      lines[i + 1].trim().length >= line.trim().length - 1
    ) {
      seenContent = true;
      addHeading(line, i + 1, `${under[1]}u`);
      i += 2;
      continue;
    }
    // A transition, or an adornment line nothing pairs with.
    if (over) {
      i++;
      continue;
    }

    seenContent = true;
    const trimmed = line.trim();
    if (trimmed === '::') {
      literalAfter = indent;
      i++;
      continue;
    }
    prose[i] = trimmed.endsWith('::') ? trimmed.slice(0, -1) : trimmed;
    if (trimmed.endsWith('::') && (isBlank(lines[i + 1]) || i + 1 >= lines.length)) {
      literalAfter = indent;
    }
    i++;
  }

  return { prose, headings, anchors, manifest, orphanOk };
}

/** Prose units: runs of prose lines split at blank or non-prose lines and list-item starts. */
function paragraphsOf(prose: (string | null)[]): DocParagraph[] {
  const units: { line: number; text: string }[] = [];
  let current: { line: number; text: string } | null = null;
  const flush = () => {
    if (current) units.push(current);
    current = null;
  };
  prose.forEach((text, i) => {
    if (text === null) {
      flush();
      return;
    }
    const item = LIST_ITEM.exec(text);
    if (item) flush();
    const body = item ? text.slice(item[0].length) : text;
    if (current) current.text += ` ${body}`;
    else current = { line: i + 1, text: body };
  });
  flush();
  return units
    .map((u) => ({ line: u.line, plain: rstInlineToPlain(u.text).trim() }))
    .filter((u) => u.plain.length > 0);
}

/** `:ref:` and `:doc:` roles and `` `text <url>`_ `` links, with role bodies that wrap lines. */
function linksOf(prose: (string | null)[]): DocLink[] {
  const text = prose
    .map((l) => (l === null ? '' : l.replace(/``[^`]*``/g, (m) => ' '.repeat(m.length))))
    .join('\n');
  const lineAt = (offset: number) => text.slice(0, offset).split('\n').length;
  const links: DocLink[] = [];
  for (const m of text.matchAll(ROLE)) {
    const target = roleTarget(m[2]);
    const line = lineAt(m.index ?? 0);
    if (m[1] === 'ref') links.push({ kind: 'label', target: normalizeRstLabel(target), line });
    else links.push({ kind: 'doc', target, line });
  }
  for (const m of text.matchAll(HYPERLINK)) {
    const target = m[2].trim();
    if (/^[a-z][a-z0-9+.-]*:/i.test(target)) {
      links.push({ kind: 'external', target, line: lineAt(m.index ?? 0) });
    }
  }
  return links.sort((a, b) => a.line - b.line);
}

export const rstReader: SourceReader = {
  read(text: string, context: ReadContext): SourceDoc {
    const lines = text.split(/\r?\n/);
    const s = scan(lines);
    const paragraphs = paragraphsOf(s.prose);
    const headingWords = s.headings.reduce((n, h) => n + countWords(h.plain), 0);
    const proseWords = paragraphs.reduce((n, p) => n + countWords(p.plain), headingWords);
    return {
      path: context.path,
      format: 'rst',
      isIndex: s.manifest.some((e) => e.kind === 'toc'),
      title: s.headings[0] ?? null,
      headings: s.headings,
      paragraphs,
      proseWords,
      links: linksOf(s.prose),
      anchors: s.anchors,
      manifest: s.manifest,
      orphanOk: s.orphanOk,
    };
  },
};

/**
 * Sphinx names documents without their extension, relative to the referring document or, with
 * a leading `/`, to the source root. Includes name files with their extension.
 */
export const rstLocator: TargetLocator = {
  candidates(target, kind, context) {
    const base = target.startsWith('/') ? context.docsRoot : dirname(context.from);
    const abs = target.startsWith('/') ? join(base, target.slice(1)) : resolve(base, target);
    if (kind === 'include' || kind === 'file') return [abs];
    return [...RST_EXTENSIONS.map((ext) => abs + ext), abs];
  },
  globName(absPath) {
    const ext = extname(absPath);
    return RST_EXTENSIONS.includes(ext) ? absPath.slice(0, -ext.length) : absPath;
  },
};

export const rstFormat: SourceFormat = {
  id: 'rst',
  name: 'reStructuredText',
  reader: rstReader,
  locator: rstLocator,
  refs: sphinxRefs(),
};

/** The RST format with references resolved under a project's Sphinx settings. */
export function rstFormatWithSphinx(options: SphinxRefOptions): SourceFormat {
  return { ...rstFormat, refs: sphinxRefs(options) };
}
