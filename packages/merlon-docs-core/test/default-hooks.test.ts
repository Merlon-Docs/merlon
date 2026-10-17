import { describe, it, expect } from 'vitest';
import { DEFAULT_COMPILE_HOOKS, resolveCompileHooks } from '../src/config/resolve-compile-hooks.js';

describe('resolveCompileHooks', () => {
  it('returns all default hooks when compile.hooks is omitted', () => {
    expect(resolveCompileHooks(undefined)).toEqual([...DEFAULT_COMPILE_HOOKS]);
    expect(resolveCompileHooks({})).toEqual([...DEFAULT_COMPILE_HOOKS]);
  });

  it('returns explicit array override unchanged', () => {
    expect(resolveCompileHooks({ hooks: ['stripAnchors'] })).toEqual(['stripAnchors']);
    expect(resolveCompileHooks({ hooks: ['identity'] })).toEqual(['identity']);
  });

  it('opts out hooks listed as false in object form', () => {
    expect(
      resolveCompileHooks({
        hooks: { codeEvidence: false, inlineInserts: false },
      }),
    ).toEqual(['stripAnchors']);
  });

  it('ignores true values in object form', () => {
    expect(
      resolveCompileHooks({
        hooks: { codeEvidence: true, inlineInserts: false },
      }),
    ).toEqual(['stripAnchors', 'codeEvidence']);
  });
});

describe('DEFAULT_COMPILE_HOOKS', () => {
  it('lists built-in hooks in compile order', () => {
    expect(DEFAULT_COMPILE_HOOKS).toEqual(['stripAnchors', 'codeEvidence', 'inlineInserts']);
  });
});
