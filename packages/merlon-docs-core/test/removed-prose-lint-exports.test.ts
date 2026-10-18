import { describe, it, expect } from 'vitest';

describe('core prose lint boundary', () => {
  it('does not export the removed lintXrefs product path', async () => {
    const core = await import('../src/index.js');
    expect('lintXrefs' in core).toBe(false);
  });
});
