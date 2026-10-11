import { describe, it, expect } from 'vitest';
import { registerCompileHook, applyCompileHooks, identityHook } from '../src/compile/hooks.js';
import '../src/compile/hooks/builtin.js';

describe('compile hooks', () => {
  it('identity hook returns body unchanged', () => {
    expect(
      identityHook({
        body: 'x',
        guideName: 'g',
        filename: 'f.md',
        config: {} as never,
        sourceFile: '/f',
      }),
    ).toBe('x');
  });

  it('applyCompileHooks runs registered hooks in order', () => {
    registerCompileHook('testUpper', (ctx) => ctx.body.toUpperCase());
    const out = applyCompileHooks(
      'hi',
      { guideName: 'g', filename: 'f.md', config: {} as never, sourceFile: '/f' },
      ['testUpper'],
    );
    expect(out).toBe('HI');
  });

  it('stripAnchors builtin hook removes brace ids', () => {
    const out = applyCompileHooks(
      '## Title {#id}\n',
      { guideName: 'g', filename: 'f.md', config: {} as never, sourceFile: '/f' },
      ['stripAnchors'],
    );
    expect(out).toBe('## Title\n');
  });
});
