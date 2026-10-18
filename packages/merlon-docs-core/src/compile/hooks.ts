import type { MerlonConfigInput } from '../config/schema.js';
import type { GuideLinkIndex } from './guide-link-index.js';

export interface InlineInsertsHookState {
  /** Resolved absolute insert shard path → anchor slug for first inline in this guide. */
  firstAnchorByPath: Map<string, string>;
  /** Per-kind insert counters (diagram, table, figure, media, insert) for numbered headings. */
  nextNumberByKind: Map<string, number>;
}

export interface CompileHookState {
  inlineInserts?: InlineInsertsHookState;
}

export function createCompileHookState(): CompileHookState {
  return {};
}

export interface CompileHookContext {
  guideName: string;
  filename: string;
  body: string;
  config: MerlonConfigInput;
  outputBasename?: string;
  /** Absolute path to the rendered document (per-guide output or monolith). */
  outputFile?: string;
  sourceFile: string;
  /** Absolute repo / scope root for resolving evidence paths (compile.scopeRoot). */
  scopeRoot?: string;
  /** Mutable per-guide state shared across shard hook invocations during assemble. */
  hookState?: CompileHookState;
  /** Cross-guide shard index built once per compileGuideResults invocation. */
  linkIndex?: GuideLinkIndex;
}

export type CompileHook = (ctx: CompileHookContext) => string;

const builtinHooks = new Map<string, CompileHook>();

export function registerCompileHook(name: string, hook: CompileHook): void {
  builtinHooks.set(name, hook);
}

export function getCompileHook(name: string): CompileHook | undefined {
  return builtinHooks.get(name);
}

export function applyCompileHooks(
  body: string,
  ctx: Omit<CompileHookContext, 'body'>,
  hookNames: string[] | undefined,
): string {
  if (!hookNames?.length) return body;
  let out = body;
  for (const name of hookNames) {
    const hook = builtinHooks.get(name);
    if (hook) {
      out = hook({ ...ctx, body: out });
    }
  }
  return out;
}

/** No-op hook for tests and extension point verification. */
export const identityHook: CompileHook = (ctx) => ctx.body;

registerCompileHook('identity', identityHook);
