import { describe, it, expect } from 'vitest';
import { mkdirSync, symlinkSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { readSources } from '../../src/source/read.js';
import { formatReviewReport, reviewSourceDocs } from '../../src/validate/review.js';
import { useTmpDir } from '../helpers/tmp-dir.js';

const SENTENCE =
  'Every maintainer must run the checks before sending a patch so that reviewers spend their time on design and not on formatting issues in the thread';

describe('readSources and reviewSourceDocs', () => {
  const work = useTmpDir('merlon-review-sources-');

  function tree(files: Record<string, string>): string {
    const root = join(work.path, 'Documentation');
    for (const [rel, text] of Object.entries(files)) {
      mkdirSync(dirname(join(root, rel)), { recursive: true });
      writeFileSync(join(root, rel), text);
    }
    return root;
  }

  it('assigns each file to the first source that matches it, and skips scripts in text', () => {
    const root = tree({
      'index.rst': 'Index\n=====\n',
      'notes.txt': 'Notes\n=====\n',
      README: 'Readme\n======\n',
      'tools/run': '#!/bin/sh\necho hi\n',
      'node_modules/x/README': 'ignored\n',
    });
    const { docs } = readSources({
      docsRoot: root,
      sources: [
        { glob: '**/*.rst', format: 'rst' },
        { glob: '**/*.txt', format: 'text' },
        { glob: '**/README', format: 'text' },
        { glob: 'tools/*', format: 'text' },
      ],
    });
    expect(docs.map((d) => [d.path.slice(root.length + 1), d.format, d.proseWords])).toEqual([
      ['README', 'text', 1],
      ['index.rst', 'rst', 1],
      ['notes.txt', 'text', 1],
      ['tools/run', 'text', 0],
    ]);
  });

  it('reads a symlinked document once, under its target, so it is not a duplicate', () => {
    const root = tree({
      'process/changes.rst': `Minimal requirements\n====================\n\n${SENTENCE}.\n`,
    });
    symlinkSync('process/changes.rst', join(root, 'Changes'));
    const { docs, symlinks } = readSources({
      docsRoot: root,
      sources: [
        { glob: '**/*.rst', format: 'rst' },
        { glob: 'Changes', format: 'text' },
      ],
    });
    expect(docs.map((d) => d.path)).toEqual([join(root, 'process/changes.rst')]);
    expect(symlinks).toEqual([
      { path: join(root, 'Changes'), target: join(root, 'process/changes.rst') },
    ]);
    expect(reviewSourceDocs({ docs, docsRoot: root }).findings).toEqual([]);
  });

  it('reports all four signals on an RST tree with file and line', () => {
    const entries = Array.from({ length: 13 }, (_, i) => `   page${i}`).join('\n');
    const root = tree({
      'index.rst': `Kernel docs\n===========\n\n.. toctree::\n   :maxdepth: 1\n\n${entries}\n`,
      'process/a.rst': `Submitting patches\n==================\n\n${SENTENCE}.\n`,
      'process/b.rst': `Submitting Patches!\n===================\n\nIntro.\n\n${SENTENCE}.\n`,
      'ref/long.rst': `Reference\n=========\n\n${Array.from({ length: 40 }, () => 'word').join(' ')}\n`,
    });
    const { docs } = readSources({
      docsRoot: root,
      sources: [{ glob: '**/*.rst', format: 'rst' }],
    });
    const result = reviewSourceDocs({ docs, docsRoot: root, thresholds: { maxShardWords: 30 } });
    expect(
      result.findings.map((f) => [f.signal, f.locations?.map((l) => `${l.file}:${l.line}`)]),
    ).toEqual([
      ['index-size', ['index.rst:7']],
      ['long-shard', ['ref/long.rst:1']],
      ['duplicate-paragraph', ['process/a.rst:4', 'process/b.rst:6']],
      ['similar-titles', ['process/a.rst:1', 'process/b.rst:1']],
    ]);
    expect(result.findings[0].detail).toBe(
      '13 shard links in uncaptioned toctree at line 4 (limit 12 per group)',
    );
    expect(formatReviewReport(result)).toContain(
      '  - process/a.rst:1, process/b.rst:1: 2 shards in guide "process"',
    );
  });

  it('applies per-guide thresholds by top-level directory', () => {
    const root = tree({
      'ref/long.rst': `Reference\n=========\n\n${Array.from({ length: 40 }, () => 'word').join(' ')}\n`,
    });
    const { docs } = readSources({
      docsRoot: root,
      sources: [{ glob: '**/*.rst', format: 'rst' }],
    });
    const result = reviewSourceDocs({
      docs,
      docsRoot: root,
      thresholds: { maxShardWords: 30 },
      guideThresholds: { ref: { maxShardWords: 100 } },
    });
    expect(result.findings).toEqual([]);
  });
});
