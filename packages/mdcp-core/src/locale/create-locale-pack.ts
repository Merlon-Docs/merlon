import type {
  LocaleBrokenLinkCopy,
  LocaleBrokenLinkMessages,
  LocaleInsertCopy,
  LocaleInsertMessages,
  LocalePack,
} from './types.js';

type TemplateVars = Record<string, string | number>;

export interface CreateLocalePackOptions {
  readonly id: string;
  readonly brokenLinks: LocaleBrokenLinkMessages;
  readonly inserts: LocaleInsertMessages;
  /**
   * Authored line-range word cues (for example `lines`, `line`).
   * Trimmed, non-empty; sorted longest-first at pack create time.
   */
  readonly lineRangeWords?: readonly string[];
  /**
   * About-this-guide preamble title (en-US: `About this guide`).
   * Trimmed; empty means strip/promote have no locale title cue.
   */
  readonly aboutThisGuideTitle?: string;
  /** Locale-specific heading-title pattern with `prefix` / `number` groups. */
  readonly headingKeyPattern?: string;
  /** Template for semantic keys; placeholders `{prefix}` and `{number}`. */
  readonly headingKeyTemplate?: string;
}

const TEMPLATE_VAR_RE = /\{([A-Za-z][A-Za-z0-9_]*)\}/g;

export function formatTemplate(template: string, vars: TemplateVars): string {
  return template.replace(TEMPLATE_VAR_RE, (match, key: string) => {
    const value = vars[key];
    if (value === undefined) {
      throw new Error(`Missing template variable "${key}" for template "${template}"`);
    }
    return String(value);
  });
}

/**
 * The text of `template` with each variable in `fixedVars` filled in, split at every other
 * variable. Neither variable of `{a} and {b}` fixed gives `['', ' and ', '']`.
 */
function templateLiterals(template: string, fixedVars: TemplateVars): string[] {
  const literals: string[] = [];
  let literal = '';
  let lastIndex = 0;

  for (const match of template.matchAll(TEMPLATE_VAR_RE)) {
    const index = match.index ?? 0;
    const key = match[1];
    literal += template.slice(lastIndex, index);
    lastIndex = index + match[0].length;
    if (key in fixedVars) {
      literal += String(fixedVars[key]);
    } else {
      literals.push(literal);
      literal = '';
    }
  }

  literals.push(literal + template.slice(lastIndex));
  return literals;
}

/** The characters that `.` in a regex doesn't match. */
function isLineTerminator(code: number): boolean {
  return code === 0x0a || code === 0x0d || code === 0x2028 || code === 0x2029;
}

/** True when index `i` of `text` falls between the two halves of a surrogate pair. */
function splitsPair(text: string, i: number): boolean {
  if (i <= 0 || i >= text.length) return false;
  const before = text.charCodeAt(i - 1);
  const after = text.charCodeAt(i);
  return before >= 0xd800 && before <= 0xdbff && after >= 0xdc00 && after <= 0xdfff;
}

/**
 * The matches in `text` of a template split into `literals`, with a variable in each gap between
 * two of them. A match is the first literal, then each later literal after a gap that holds no
 * line terminator. Of the matches that start at one index, it takes the one whose first gap is
 * shortest, then whose second gap is, and so on. It returns the matches from left to right
 * without overlap, or the first one alone when `all` is false, and no match starts or ends inside
 * a surrogate pair. A regex of the literals with a lazy `.*?` in each gap and the `u` flag finds
 * the same matches, but it can try every choice of gaps before it fails.
 *
 * From each start it takes the first copy of each literal at or after the end of the one before.
 * Those are the shortest gaps that can still match. When a later copy of a literal leaves a gap
 * with no line terminator, that literal holds none, so the first copy leaves none either before
 * whatever followed the later one. A later start only finds later copies, so the search for each
 * literal moves forward. Each literal keeps the copy it last found and how far past its gap start
 * the text holds no line terminator, so the search reads the text a few times for each literal.
 */
function findTemplateMatches(literals: readonly string[], text: string, all: boolean): string[] {
  for (const literal of literals) {
    if (!text.includes(literal)) return [];
  }
  const n = text.length;
  const count = literals.length;

  // For literal j, the search from searchedFrom[j] found its first copy at foundAt[j], or none
  // when foundAt[j] is -1. The text from clearFrom[j] to clearTo[j] holds no line terminator,
  // and endsAtBreak[j] says whether a line terminator sits at clearTo[j].
  const searchedFrom = new Array<number>(count).fill(n + 1);
  const foundAt = new Array<number>(count).fill(-1);
  const clearFrom = new Array<number>(count).fill(n + 1);
  const clearTo = new Array<number>(count).fill(n + 1);
  const endsAtBreak = new Array<boolean>(count).fill(false);

  const copyAt = (j: number, from: number): number => {
    if (from >= searchedFrom[j] && (foundAt[j] === -1 || from <= foundAt[j])) return foundAt[j];
    const literal = literals[j];
    let at = text.indexOf(literal, from);
    while (at !== -1 && (splitsPair(text, at) || splitsPair(text, at + literal.length))) {
      at = text.indexOf(literal, at + 1);
    }
    searchedFrom[j] = from;
    foundAt[j] = at;
    return at;
  };
  // True when the gap from `from` to `to`, before a copy of literal j, holds a line terminator.
  const gapHasBreak = (j: number, from: number, to: number): boolean => {
    if (from < clearFrom[j] || from > clearTo[j]) {
      clearFrom[j] = from;
      clearTo[j] = from;
      endsAtBreak[j] = false;
    }
    if (!endsAtBreak[j]) {
      let at = clearTo[j];
      while (at < to && !isLineTerminator(text.charCodeAt(at))) at++;
      clearTo[j] = at;
      endsAtBreak[j] = at < to;
    }
    return endsAtBreak[j] && clearTo[j] < to;
  };

  const found: string[] = [];
  let from = 0;
  while (from <= n) {
    const start = copyAt(0, from);
    if (start === -1) break;
    let end = start + literals[0].length;
    let j = 1;
    for (; j < count; j++) {
      const at = copyAt(j, end);
      // No copy of this literal follows, so no later start can match.
      if (at === -1) return found;
      if (gapHasBreak(j, end, at)) break;
      end = at + literals[j].length;
    }
    if (j < count) {
      from = start + 1;
      continue;
    }
    found.push(text.slice(start, end));
    if (!all) break;
    // After an empty match the search moves on, as a global regex does.
    from = end > start ? end : start + 1;
  }
  return found;
}

export function createBrokenLinksCopy(messages: LocaleBrokenLinkMessages): LocaleBrokenLinkCopy {
  const markerLiterals = templateLiterals(messages.markerTemplate, {
    markerLabel: messages.markerLabel,
  });

  return {
    markerLabel: messages.markerLabel,
    reasonDeadAnchor: messages.reasonDeadAnchor,
    reasonMissingFile: messages.reasonMissingFile,
    reasonMissingPublishPath: messages.reasonMissingPublishPath,

    formatMarker(label, originalTarget, brokenTarget, reason): string {
      return formatTemplate(messages.markerTemplate, {
        markerLabel: messages.markerLabel,
        label,
        originalTarget,
        brokenTarget,
        reason,
      });
    },

    lineHasMarker(line: string): boolean {
      return findTemplateMatches(markerLiterals, line, false).length > 0;
    },

    findMarkers(line: string): string[] {
      return findTemplateMatches(markerLiterals, line, true);
    },
  };
}

function upperFirstCodePoint(value: string): string {
  const [first, ...rest] = Array.from(value);
  return first ? `${first.toLocaleUpperCase()}${rest.join('')}` : '';
}

function titleCaseWords(value: string): string {
  return value
    .split(/[-_\s]+/u)
    .filter(Boolean)
    .map(upperFirstCodePoint)
    .join(' ');
}

export function createInsertsCopy(messages: LocaleInsertMessages): LocaleInsertCopy {
  return {
    kindTitle(kind: string): string {
      return titleCaseWords(kind);
    },
    seeInsertFallback: messages.seeInsertFallback,
    humanizeBasename(basenameWithoutExt: string): string {
      return titleCaseWords(basenameWithoutExt);
    },
  };
}

function createHeadingKeyFromTitle(
  headingKeyPattern: string | undefined,
): LocalePack['headingKeyFromTitle'] {
  if (!headingKeyPattern) {
    return () => null;
  }

  const headingKeyRe = new RegExp(headingKeyPattern, 'iu');
  return (title: string) => {
    const match = headingKeyRe.exec(title);
    if (!match) return null;

    const prefix = match.groups?.prefix ?? match[1];
    const number = match.groups?.number ?? match[2];
    if (!prefix || !number) return null;

    return { prefix, number };
  };
}

function createFormatHeadingKey(
  headingKeyTemplate: string | undefined,
): LocalePack['formatHeadingKey'] {
  const template = headingKeyTemplate ?? '{prefix}.ch{number}';
  return (parts) =>
    formatTemplate(template, {
      prefix: parts.prefix.toLocaleLowerCase(),
      number: parts.number,
    });
}

/** Trim, drop empties, dedupe case-insensitively, sort longest-first for matching. */
export function normalizeLineRangeWords(words: readonly string[] | undefined): readonly string[] {
  if (!words?.length) return [];
  const seen = new Set<string>();
  const cleaned: string[] = [];
  for (const raw of words) {
    const word = raw.trim();
    if (!word) continue;
    const key = word.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    cleaned.push(word);
  }
  cleaned.sort((a, b) => b.length - a.length || a.localeCompare(b));
  return cleaned;
}

export function createLocalePack(options: CreateLocalePackOptions): LocalePack {
  return {
    id: options.id,
    brokenLinks: createBrokenLinksCopy(options.brokenLinks),
    inserts: createInsertsCopy(options.inserts),
    lineRangeWords: normalizeLineRangeWords(options.lineRangeWords),
    aboutThisGuideTitle: (options.aboutThisGuideTitle ?? '').trim(),
    headingKeyFromTitle: createHeadingKeyFromTitle(options.headingKeyPattern),
    formatHeadingKey: createFormatHeadingKey(options.headingKeyTemplate),
  };
}
