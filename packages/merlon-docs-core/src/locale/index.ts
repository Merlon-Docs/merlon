/**
 * Locale packs: natural-language copy for compiled prose, semantic refs, and
 * compile parse-input word cues (for example codeEvidence lineRangeWords).
 *
 * Modeled on Vale’s multi-language docs pattern (errata-ai/vale):
 * - GFM / markup structure stays language-neutral (`../markdown/`, links, slugs).
 * - Language-specific prose lint belongs in peer Vale styles, not core packs.
 * - A second language adds another pack and, for peer Vale, another style +
 *   `.vale.ini` glob section; it does not fork the Markdown engine.
 *
 * @see docs/features/design-constraints/locale-and-language.md
 */

export type {
  LocaleBrokenLinkCopy,
  LocaleBrokenLinkMessages,
  LocaleInsertCopy,
  LocaleInsertMessages,
  LocalePack,
} from './types.js';
export {
  createBrokenLinksCopy,
  createInsertsCopy,
  createLocalePack,
  formatTemplate,
  normalizeLineRangeWords,
  type CreateLocalePackOptions,
} from './create-locale-pack.js';
export { enUS } from './en-US/index.js';
export { DEFAULT_LOCALE_ID, getLocalePack, listLocalePackIds } from './resolve.js';
