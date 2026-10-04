import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { MdcpConfigSchema, type MdcpConfigInput } from '@bwilliamson/mdcp-core';
import { valeArgs, valeCheckHints, valeMinAlertLevel, valeScanPaths } from '../src/vale-args.js';

function config(extra: Partial<MdcpConfigInput> = {}) {
  return MdcpConfigSchema.parse({ compileOrder: ['g'], ...extra });
}

describe('valeMinAlertLevel', () => {
  it('passes no level in a non-strict run, so .vale.ini MinAlertLevel applies', () => {
    expect(valeMinAlertLevel(config(), false)).toBeUndefined();
    // A vale block defaults strictMinAlertLevel to error; non-strict runs still ignore it.
    expect(valeMinAlertLevel(config({ vale: {} }), false)).toBeUndefined();
  });

  it('defaults a strict run to error', () => {
    expect(valeMinAlertLevel(config(), true)).toBe('error');
    expect(valeMinAlertLevel(config({ vale: {} }), true)).toBe('error');
  });

  it('uses vale.strictMinAlertLevel in a strict run', () => {
    const cfg = config({ vale: { strictMinAlertLevel: 'warning' } });
    expect(valeMinAlertLevel(cfg, true)).toBe('warning');
    expect(valeMinAlertLevel(cfg, false)).toBeUndefined();
  });
});

describe('valeArgs', () => {
  it('builds the config flag, the level and the scan paths', () => {
    const cfg = config({ vale: { config: 'v.ini', strictMinAlertLevel: 'suggestion' } });
    expect(valeArgs(cfg, ['/d/g'], true)).toEqual([
      '--config',
      'v.ini',
      '--minAlertLevel=suggestion',
      '/d/g',
    ]);
    expect(valeArgs(cfg, ['/d/g'], false)).toEqual(['--config', 'v.ini', '/d/g']);
  });

  it('defaults the config to .vale.ini', () => {
    expect(valeArgs(config(), ['/d/g'], true)).toEqual([
      '--config',
      '.vale.ini',
      '--minAlertLevel=error',
      '/d/g',
    ]);
  });
});

describe('valeScanPaths', () => {
  // repo/ is the scan root; repo/docs/ is the docs root with one guide directory.
  let repo: string;
  let docs: string;
  beforeAll(() => {
    repo = mkdtempSync(join(tmpdir(), 'mdcp-vale-scan-'));
    docs = join(repo, 'docs');
    mkdirSync(join(docs, 'g'), { recursive: true });
    mkdirSync(join(repo, 'skills', 'a'), { recursive: true });
    writeFileSync(join(docs, 'g', 'index.md'), '# G\n');
    writeFileSync(join(docs, 'g', 'notes.md'), '# G\n');
    writeFileSync(join(docs, 'skills.md'), '# Skills\n');
    writeFileSync(join(repo, 'AGENTS.md'), '# Agents\n');
    writeFileSync(join(repo, 'skills', 'a', 'SKILL.md'), '# A\n');
  });
  afterAll(() => rmSync(repo, { recursive: true, force: true }));

  it('scans the guide directories when no standalone guides are registered', () => {
    expect(valeScanPaths(config(), docs, repo)).toEqual([join(docs, 'g')]);
  });

  it('returns absolute paths when the docs root is relative', () => {
    // Vale runs with the docs root as its cwd, so `docs/g` would point at `docs/docs/g`.
    // The guide has no `guides[].path`, so it resolves to `{docsRoot}/{name}`.
    const rel = relative(process.cwd(), docs);
    const cfg = config({ standaloneGuides: ['AGENTS.md', 'docs/g/notes.md'] });
    expect(valeScanPaths(cfg, rel, repo)).toEqual([join(docs, 'g'), join(repo, 'AGENTS.md')]);
  });

  it('adds every standalone guide, resolved against the scan root', () => {
    const cfg = config({ standaloneGuides: ['AGENTS.md', 'skills/**/*.md', 'docs/skills.md'] });
    expect(valeScanPaths(cfg, docs, repo)).toEqual([
      join(docs, 'g'),
      join(repo, 'AGENTS.md'),
      join(docs, 'skills.md'),
      join(repo, 'skills', 'a', 'SKILL.md'),
    ]);
  });

  it('adds standalone guides when vale.scanGlobs replaces the guide directories', () => {
    const cfg = config({ standaloneGuides: ['AGENTS.md'], vale: { scanGlobs: ['g/notes.md'] } });
    expect(valeScanPaths(cfg, docs, repo)).toEqual([
      join(docs, 'g', 'notes.md'),
      join(repo, 'AGENTS.md'),
    ]);
  });

  it('leaves out a standalone guide that a scanned path already reaches', () => {
    // Vale lints a file once for every argument that reaches it.
    const cfg = config({ standaloneGuides: ['docs/g/notes.md', 'docs/skills.md'] });
    expect(valeScanPaths(cfg, docs, repo)).toEqual([join(docs, 'g'), join(docs, 'skills.md')]);
    const exact = config({
      standaloneGuides: ['AGENTS.md'],
      vale: { scanGlobs: ['../AGENTS.md'] },
    });
    expect(valeScanPaths(exact, docs, repo)).toEqual([join(repo, 'AGENTS.md')]);
  });

  it('skips an empty standalone guide entry, which fast-glob rejects', () => {
    const cfg = config({ standaloneGuides: ['AGENTS.md', ''] });
    expect(valeScanPaths(cfg, docs, repo)).toEqual([join(docs, 'g'), join(repo, 'AGENTS.md')]);
  });

  it('passes a standalone guide once when two entries spell it differently', () => {
    const cfg = config({ standaloneGuides: ['AGENTS.md', './AGENTS.md', './docs/g/notes.md'] });
    expect(valeScanPaths(cfg, docs, repo)).toEqual([join(docs, 'g'), join(repo, 'AGENTS.md')]);
  });

  it('matches a standalone guide inside a guide directory when the docs root is a symlink', () => {
    // The docs root keeps the linked spelling, and standalone guides resolve from the scan root.
    const link = `${repo}-link`;
    symlinkSync(repo, link, 'dir');
    try {
      const cfg = config({ standaloneGuides: ['docs/g/notes.md', 'AGENTS.md'] });
      expect(valeScanPaths(cfg, join(link, 'docs'), repo)).toEqual([
        join(link, 'docs', 'g'),
        join(repo, 'AGENTS.md'),
      ]);
    } finally {
      rmSync(link, { force: true });
    }
  });

  it('keeps a standalone guide under node_modules or .git, which Vale skips when it walks', () => {
    // Vale 3.15.1 skips every directory named node_modules or .git when it walks a scanned
    // directory, the scanned directory itself included, so such a file needs its own argument.
    const pkg = join(docs, 'g', 'node_modules', 'pkg', 'README.md');
    const git = join(docs, 'g', 'sub', '.git', 'notes.md');
    mkdirSync(join(docs, 'g', 'node_modules', 'pkg'), { recursive: true });
    mkdirSync(join(docs, 'g', 'sub', '.git'), { recursive: true });
    writeFileSync(pkg, '# Pkg\n');
    writeFileSync(git, '# Notes\n');
    try {
      const cfg = config({ standaloneGuides: ['docs/g/**/*.md'] });
      expect(valeScanPaths(cfg, docs, repo)).toEqual([join(docs, 'g'), pkg, git]);
      const inside = config({
        standaloneGuides: ['docs/g/node_modules/**/*.md'],
        vale: { scanGlobs: ['g/node_modules'] },
      });
      expect(valeScanPaths(inside, docs, repo)).toEqual([join(docs, 'g', 'node_modules'), pkg]);
    } finally {
      rmSync(join(docs, 'g', 'node_modules'), { recursive: true, force: true });
      rmSync(join(docs, 'g', 'sub'), { recursive: true, force: true });
    }
  });
});

describe('valeCheckHints', () => {
  it('points error-level alerts at the prose and the standalone opt-out', () => {
    const hints = valeCheckHints({ ran: true, exitCode: 1 });
    expect(hints).toHaveLength(2);
    expect(hints[1]).toMatch(
      /\[\*\*\/<file>\].*after every section that matches the file, such as `\[\*\.md\]` or `\[\*\.\{md,mdx\}\]`/,
    );
    expect(hints[1]).toMatch(/set to `NO` each rule that an earlier section names/);
  });

  it('points a Vale runtime error at the config and scanned paths, not the opt-out', () => {
    const hints = valeCheckHints({ ran: true, exitCode: 2 });
    expect(hints.join('\n')).toMatch(/runtime error[\s\S]*Vale does not expand globs/);
    expect(hints.join('\n')).not.toMatch(/<file>/);
  });

  it('gives only the skip hint when Vale never ran', () => {
    expect(valeCheckHints({ ran: false, exitCode: 1 })).toEqual([
      expect.stringMatching(/--skip-vale/),
    ]);
  });
});
