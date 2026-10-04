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

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function templateToLineRegex(template: string, fixedVars: TemplateVars): RegExp {
  let pattern = '';
  let lastIndex = 0;

  for (const match of template.matchAll(TEMPLATE_VAR_RE)) {
    const index = match.index ?? 0;
    const key = match[1];
    pattern += escapeRegExp(template.slice(lastIndex, index));
    pattern += key in fixedVars ? escapeRegExp(String(fixedVars[key])) : '.*?';
    lastIndex = index + match[0].length;
  }

  pattern += escapeRegExp(template.slice(lastIndex));
  return new RegExp(pattern, 'u');
}

export function createBrokenLinksCopy(messages: LocaleBrokenLinkMessages): LocaleBrokenLinkCopy {
  const markerLineRe = templateToLineRegex(messages.markerTemplate, {
    markerLabel: messages.markerLabel,
  });
  const markerRe = new RegExp(markerLineRe.source, 'gu');

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
      return markerLineRe.test(line);
    },

    findMarkers(line: string): string[] {
      return Array.from(line.matchAll(markerRe), (match) => match[0]);
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
