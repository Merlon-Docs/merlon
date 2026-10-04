import { resolve } from 'node:path';
import { resolveUnderOutputDir } from '../config/paths.js';
import {
  compileGuidesFromResults,
  monolithGuideFirstLines,
  writtenGuideText,
  type CompileGuideResult,
  type CompileOptions,
} from './assemble.js';

/** A guide's copy in the monolith, and the 1-based line of the monolith on which it starts. */
export interface MonolithCopy {
  guide: CompileGuideResult;
  firstLine: number;
}

/** A file compile writes, with the text it writes there. */
export interface CompiledOutputDocument {
  /** Absolute path of the file. */
  path: string;
  /** The text compile writes to the file, banner included. */
  text: string;
  /** The guide whose compiled guide this is. Absent for the monolith. */
  guide?: CompileGuideResult;
  /** For the monolith only: each guide's copy, in the order the monolith stitches them. */
  copies?: MonolithCopy[];
}

/**
 * Every file compile writes from `results`: each compiled guide in `compileOrder`, then the
 * monolith when the config names one and at least one guide is stitched into it. Each text is
 * what `writeCompiledGuidesFromResults` writes, so a line number in it is a line of the file.
 */
export function compiledOutputDocuments(
  results: CompileGuideResult[],
  options: CompileOptions,
): CompiledOutputDocument[] {
  const docsRoot = resolve(options.docsRoot ?? process.cwd());
  const outputDir = options.config?.outputDir ?? '_build';
  const pathOf = (file: string) => resolve(resolveUnderOutputDir(docsRoot, outputDir, file));

  const docs: CompiledOutputDocument[] = results.map((guide) => ({
    path: pathOf(guide.outputFile),
    text: writtenGuideText(guide, options),
    guide,
  }));

  const monolithFile = options.config?.outputFile;
  if (monolithFile !== undefined && results.some((r) => !r.publishOnly)) {
    const byName = new Map(results.map((r) => [r.name, r]));
    docs.push({
      path: pathOf(monolithFile),
      text: compileGuidesFromResults(results, options),
      copies: monolithGuideFirstLines(results, options).map(({ name, firstLine }) => ({
        guide: byName.get(name)!,
        firstLine,
      })),
    });
  }
  return docs;
}
