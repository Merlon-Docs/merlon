import type { GuideConfigInput } from './schema.js';

/** Built-in compile hooks run when `compile.hooks` is omitted. */
export const DEFAULT_COMPILE_HOOKS = ['stripAnchors', 'codeEvidence', 'inlineInserts'] as const;

export type DefaultCompileHook = (typeof DEFAULT_COMPILE_HOOKS)[number];

type CompileHooksInput = NonNullable<GuideConfigInput['compile']>;

/** Resolve the effective hook pipeline for a guide compile config. */
export function resolveCompileHooks(compile?: CompileHooksInput): string[] {
  const hooks = compile?.hooks;

  if (hooks === undefined) {
    return [...DEFAULT_COMPILE_HOOKS];
  }

  if (Array.isArray(hooks)) {
    return hooks;
  }

  return DEFAULT_COMPILE_HOOKS.filter((name) => hooks[name] !== false);
}
