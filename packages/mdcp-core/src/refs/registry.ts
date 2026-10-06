import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, relative, resolve, sep } from 'node:path';
import type { CompileGuideResult, CompileOptions } from '../compile/assemble.js';
import { compiledOutputDocuments } from '../compile/output-documents.js';
import { buildSlugRegistry, type RefsOutput, type RefsRegistry } from './slugs.js';

/** A file compile writes, as the refs registry records it. */
export interface RefsOutputText {
  /** The file's path relative to the docs root, with `/` separators. */
  file: string;
  /** The text compile writes to the file, banner included. */
  text: string;
  /** The guide whose compiled guide this is. Absent for the monolith. */
  guideName?: string;
}

/**
 * Every file compile writes from `results`, as `compiledOutputDocuments` gives them, with each
 * path relative to `options.docsRoot`. Pass the list to `genRefsFromCompiled` and
 * `checkRefsRegistry` so the registry lists each output's headings on its own.
 */
export function refsOutputTexts(
  results: CompileGuideResult[],
  options: CompileOptions,
): RefsOutputText[] {
  const docsRoot = resolve(options.docsRoot ?? process.cwd());
  return compiledOutputDocuments(results, options).map((doc) => ({
    file: relative(docsRoot, doc.path).split(sep).join('/'),
    text: doc.text,
    ...(doc.guide ? { guideName: doc.guide.name } : {}),
  }));
}

/**
 * The registry for `compiledText`. With `outputs`, it also lists each output's headings, slugged
 * on their own and numbered by the lines of that output's text.
 */
export function buildRefsRegistry(compiledText: string, outputs?: RefsOutputText[]): RefsRegistry {
  const registry = buildSlugRegistry(compiledText);
  if (outputs === undefined) return registry;
  return {
    ...registry,
    outputs: outputs.map((output): RefsOutput => {
      const { headings, slugs } = buildSlugRegistry(output.text);
      return {
        file: output.file,
        ...(output.guideName !== undefined ? { guideName: output.guideName } : {}),
        headings,
        slugs,
      };
    }),
  };
}

export function writeRefsRegistry(registry: RefsRegistry, outputPath: string): void {
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, JSON.stringify(registry, null, 2) + '\n', 'utf-8');
}

export function readRefsRegistry(path: string): RefsRegistry {
  return JSON.parse(readFileSync(path, 'utf-8')) as RefsRegistry;
}

/**
 * Compare the registry at `registryPath` with the one `genRefsFromCompiled` would write for the
 * same arguments. A registry written without `outputs` is stale when `outputs` is passed.
 */
export function checkRefsRegistry(
  compiledText: string,
  registryPath: string,
  outputs?: RefsOutputText[],
): { ok: boolean; message: string } {
  const fresh = buildRefsRegistry(compiledText, outputs);
  const freshJson = JSON.stringify(fresh, null, 2) + '\n';

  if (!existsSync(registryPath)) {
    return { ok: false, message: `Missing ${registryPath}; run: mdcp refs gen` };
  }

  const existing = readFileSync(registryPath, 'utf-8');
  if (existing !== freshJson) {
    return { ok: false, message: 'refs.json is stale; run: mdcp refs gen' };
  }
  return { ok: true, message: 'refs.json is up to date' };
}

/**
 * Write the registry for `compiledText` to `registryPath`. Pass `outputs` from `refsOutputTexts`
 * to list each compiled output's headings too.
 */
export function genRefsFromCompiled(
  compiledText: string,
  registryPath: string,
  outputs?: RefsOutputText[],
): RefsRegistry {
  const registry = buildRefsRegistry(compiledText, outputs);
  writeRefsRegistry(registry, registryPath);
  return registry;
}
