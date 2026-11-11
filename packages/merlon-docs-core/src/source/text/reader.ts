import type { ReadContext, SourceFormat, SourceReader } from '../format.js';
import type { DocHeading, DocParagraph, SourceDoc } from '../model.js';
import { countWords } from '../text.js';

/**
 * Plain-text reader (ADR 0008): `README`s, `.txt` files and extensionless prose. Paragraphs are
 * runs of non-blank lines; a line underlined with `=`, `-` or `~` is a heading, and the first
 * one is the title. A block indented deeper than the document's own indent is literal text.
 * A file that starts with `#!` is a script, and reads as empty.
 */

const UNDERLINE = /^([=~-])\1{2,}\s*$/;

function indentOf(line: string): number {
  let n = 0;
  for (const ch of line) {
    if (ch === ' ') n++;
    else if (ch === '\t') n += 8 - (n % 8);
    else break;
  }
  return n;
}

/** Plain-text emphasis (`*word*`, `_word_`) dropped, so prose compares across formats. */
export function textInlineToPlain(text: string): string {
  return text.replace(/(^|[\s(])([*_])([^*_\s][^*_]*?)\2(?=$|[\s.,;:!?)])/g, '$1$3');
}

function emptyDoc(path: string): SourceDoc {
  return {
    path,
    format: 'text',
    isIndex: false,
    title: null,
    headings: [],
    paragraphs: [],
    proseWords: 0,
    links: [],
    anchors: [],
    manifest: [],
    orphanOk: true,
  };
}

export const textReader: SourceReader = {
  read(text: string, context: ReadContext): SourceDoc {
    if (text.startsWith('#!')) return emptyDoc(context.path);
    const lines = text.split(/\r?\n/);
    const nonBlank = lines.filter((l) => l.trim() !== '');
    const base = nonBlank.length > 0 ? Math.min(...nonBlank.map(indentOf)) : 0;

    const headings: DocHeading[] = [];
    const units: { line: number; text: string }[] = [];
    let current: { line: number; text: string } | null = null;
    const flush = () => {
      if (current) units.push(current);
      current = null;
    };

    let afterBlank = true;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      if (!trimmed) {
        flush();
        afterBlank = true;
        continue;
      }
      // Literal block: indented deeper than the document, starting after a blank line.
      if (afterBlank && indentOf(line) > base && current === null) {
        while (
          i + 1 < lines.length &&
          (lines[i + 1].trim() === '' || indentOf(lines[i + 1]) > base)
        ) {
          if (
            lines[i + 1].trim() === '' &&
            (i + 2 >= lines.length || indentOf(lines[i + 2]) <= base)
          ) {
            break;
          }
          i++;
        }
        afterBlank = false;
        continue;
      }
      afterBlank = false;
      const under = lines[i + 1]?.trim() ?? '';
      if (
        !current &&
        UNDERLINE.test(under) &&
        under.length >= trimmed.length - 1 &&
        !UNDERLINE.test(trimmed)
      ) {
        const plain = textInlineToPlain(trimmed);
        headings.push({ text: trimmed, plain, level: headings.length === 0 ? 1 : 2, line: i + 1 });
        i++;
        continue;
      }
      if (UNDERLINE.test(trimmed)) {
        flush();
        continue;
      }
      if (current) current.text += ` ${trimmed}`;
      else current = { line: i + 1, text: trimmed };
    }
    flush();

    const paragraphs: DocParagraph[] = units.map((u) => ({
      line: u.line,
      plain: textInlineToPlain(u.text),
    }));
    const proseWords =
      headings.reduce((n, h) => n + countWords(h.plain), 0) +
      paragraphs.reduce((n, p) => n + countWords(p.plain), 0);
    return {
      ...emptyDoc(context.path),
      title: headings[0] ?? null,
      headings,
      paragraphs,
      proseWords,
    };
  },
};

export const textFormat: SourceFormat = {
  id: 'text',
  name: 'Plain text',
  reader: textReader,
};
