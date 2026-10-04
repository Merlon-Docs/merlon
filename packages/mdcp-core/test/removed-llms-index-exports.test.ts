import { describe, it, expect } from 'vitest';

/** Helpers for `mdcp.v…llms.txt` index filenames, left over from the removed `mdcp export`. */
const REMOVED_LLMS_INDEX_HELPERS = [
  'parseLlmsIndexFilename',
  'isLlmsIndexDraftFilename',
  'expandProtocolVersion',
  'abbreviateProtocolVersion',
  'protocolVersionToReleaseRef',
] as const;

describe('core llms-index boundary', () => {
  it.each(REMOVED_LLMS_INDEX_HELPERS)('does not export the removed %s helper', async (name) => {
    const core = await import('../src/index.js');
    expect(name in core).toBe(false);
  });
});
