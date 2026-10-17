import { describe, it, expect } from 'vitest';
import {
  extractFirstHeading,
  stripFirstHeadingLine,
  formatCompileTitle,
} from '../src/compile/compile-title.js';

describe('compile-title', () => {
  it('extracts heading text and anchor', () => {
    const h = extractFirstHeading('# Title {#my-id}\n\nbody');
    expect(h.text).toBe('Title');
    expect(h.anchor).toBe('my-id');
  });

  it('extracts trailing anchor with case-insensitive slug and optional space', () => {
    const h1 = extractFirstHeading('# Title{#mY-Id}\n\nbody');
    expect(h1.text).toBe('Title');
    expect(h1.anchor).toBe('my-id');

    const h2 = extractFirstHeading('# Title    {#UPPER-id}\n\nbody');
    expect(h2.text).toBe('Title');
    expect(h2.anchor).toBe('upper-id');
  });

  it('strips first heading line', () => {
    expect(stripFirstHeadingLine('# T\n\nbody')).toBe('body');
  });

  it('leaves body unchanged when the first line is not a heading', () => {
    expect(stripFirstHeadingLine('plain\n\nbody')).toBe('plain\n\nbody');
  });

  it('returns nulls when there is no ATX heading', () => {
    expect(extractFirstHeading('no heading\n\nbody')).toEqual({ text: null, anchor: null });
  });

  it('formats compile title as h2', () => {
    expect(formatCompileTitle('Example glossary')).toBe('## Example glossary');
  });
});
