import { enUS } from './en-US/index.js';
import type { LocalePack } from './types.js';

const PACKS: Record<string, LocalePack> = {
  'en-US': enUS,
};

/** Default locale for the reference implementation. */
export const DEFAULT_LOCALE_ID = 'en-US';

/** Resolve a locale pack by BCP 47 id (defaults to `en-US`). */
export function getLocalePack(id: string = DEFAULT_LOCALE_ID): LocalePack {
  const pack = PACKS[id];
  if (!pack) {
    const known = Object.keys(PACKS).join(', ');
    throw new Error(`Unknown locale pack "${id}" (known: ${known})`);
  }
  return pack;
}

/** Registered locale pack ids (for tests and future config). */
export function listLocalePackIds(): string[] {
  return Object.keys(PACKS);
}
