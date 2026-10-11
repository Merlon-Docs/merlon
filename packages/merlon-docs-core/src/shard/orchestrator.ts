import { mkdirSync, rmSync, writeFileSync, readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { createTmpDir, removeTmpDir } from '../tmp-dir.js';
import { getLocalePack } from '../locale/index.js';

export interface ShardGuideMapping {
  name: string;
  h1Index?: number;
  mergeH1Indices?: number[];
  demoteFirstH1InMerge?: boolean[];
  /** Existing shard directory — skip md-tree explode. */
  directoryPath?: string;
  splitLevel?: number;
}

function promotePreambleToH2(
  text: string,
  heading: string = getLocalePack().aboutThisGuideTitle,
): string {
  const lines = text.split('\n');
  const h1Idx = lines.findIndex((l) => l.startsWith('# ') && !l.startsWith('## '));
  if (h1Idx === -1) return text;

  const h2Idx = lines.findIndex(
    (l, i) => i > h1Idx && l.startsWith('## ') && !l.startsWith('### '),
  );
  if (h2Idx === -1) return text;

  const preamble = lines
    .slice(h1Idx + 1, h2Idx)
    .join('\n')
    .trim();
  if (!preamble || preamble.startsWith('## ')) return text;

  const out = [
    ...lines.slice(0, h1Idx + 1),
    '',
    `## ${heading}`,
    '',
    ...lines.slice(h1Idx + 1, h2Idx),
    '',
    ...lines.slice(h2Idx),
  ];
  return out.join('\n');
}

function demoteFirstH1ToH2(text: string): string {
  return text.replace(/^# /m, '## ');
}

export function runMdTree(args: string[]): void {
  execFileSync('npx', ['--yes', '@kayvan/markdown-tree-parser', ...args], {
    stdio: 'inherit',
  });
}

export interface ShardOptions {
  sourceFile: string;
  guidesRoot: string;
  mappings: ShardGuideMapping[];
  compileOrder: string[];
  preambleHeading?: string;
}

export function shardFromMonolith(options: ShardOptions): void {
  const work = createTmpDir('merlon-shard-');

  try {
    const h1Out = join(work, 'h1');
    mkdirSync(h1Out, { recursive: true });
    runMdTree(['extract-all', options.sourceFile, '1', '--output', h1Out]);

    const extracted = readdirSync(h1Out).sort();

    for (const mapping of options.mappings) {
      const splitLevel = String(mapping.splitLevel ?? 2);

      if (mapping.directoryPath) {
        const dest = join(options.guidesRoot, mapping.name);
        const src = resolve(options.guidesRoot, mapping.directoryPath);
        if (!existsSync(src)) {
          throw new Error(`Directory source missing for ${mapping.name}: ${src}`);
        }
        rmSync(dest, { recursive: true, force: true });
        mkdirSync(dest, { recursive: true });
        for (const file of readdirSync(src)) {
          if (file.endsWith('.md')) {
            writeFileSync(join(dest, file), readFileSync(join(src, file), 'utf-8'), 'utf-8');
          }
        }
        continue;
      }

      let sourceText = '';

      if (mapping.mergeH1Indices) {
        const parts: string[] = [];
        mapping.mergeH1Indices.forEach((idx, i) => {
          const file = extracted[idx - 1];
          if (!file) throw new Error(`Missing H1 extract index ${idx}`);
          let part = readFileSync(join(h1Out, file), 'utf-8');
          if (mapping.demoteFirstH1InMerge?.[i]) {
            part = demoteFirstH1ToH2(part);
          }
          parts.push(part.trim());
        });
        sourceText = parts.join('\n\n');
      } else if (mapping.h1Index) {
        const file = extracted[mapping.h1Index - 1];
        if (!file) throw new Error(`Missing H1 extract index ${mapping.h1Index}`);
        sourceText = readFileSync(join(h1Out, file), 'utf-8');
      } else {
        throw new Error(`Mapping ${mapping.name} needs h1Index or mergeH1Indices`);
      }

      sourceText = promotePreambleToH2(sourceText, options.preambleHeading);
      const srcPath = join(work, `${mapping.name}.source.md`);
      writeFileSync(srcPath, sourceText, 'utf-8');

      const dest = join(options.guidesRoot, mapping.name);
      rmSync(dest, { recursive: true, force: true });
      mkdirSync(dest, { recursive: true });
      runMdTree(['explode', srcPath, dest, splitLevel]);
    }

    writeFileSync(
      join(options.guidesRoot, 'compile-order.txt'),
      options.compileOrder.join('\n') + '\n',
      'utf-8',
    );
  } finally {
    removeTmpDir(work);
  }
}
