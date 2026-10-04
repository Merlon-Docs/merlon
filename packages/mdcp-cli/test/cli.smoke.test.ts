import { describe, it, expect } from 'vitest';
import { execFile, execFileSync, spawnSync } from 'node:child_process';
import { promisify } from 'node:util';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync, mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLI = join(__dirname, '../dist/cli.js');
const REPO_ROOT = join(__dirname, '../../..');
const FIXTURE = join(REPO_ROOT, 'examples/sample-guides');
const SAMPLE_CONFIG = 'examples/sample-guides/mdcp.config.json';
const execFileAsync = promisify(execFile);

async function runCli(args: string[], cwd: string): Promise<string> {
  const { stdout } = await execFileAsync('node', [CLI, ...args], { encoding: 'utf-8', cwd });
  return stdout;
}
const SHARDS_PRESET = join(
  REPO_ROOT,
  'packages/mdcp-presets/markdownlint-shards.markdownlint-cli2.jsonc',
);

function valeInstalled(): boolean {
  return spawnSync('vale', ['--version'], { encoding: 'utf-8' }).status === 0;
}

function writeInScopeLintFixture(docs: string, configExtra: Record<string, unknown> = {}): void {
  mkdirSync(join(docs, 'guide'), { recursive: true });
  mkdirSync(join(docs, 'other-guide'), { recursive: true });
  writeFileSync(
    join(docs, 'getting-started.md'),
    'This legacy flat doc has no top-level heading.\n',
  );
  writeFileSync(
    join(docs, 'other-guide', 'stray.md'),
    'Unregistered guide content without a heading.\n',
  );
  writeFileSync(join(docs, 'guide', 'index.md'), '# Guide\n\n- [section](section.md)\n');
  writeFileSync(join(docs, 'guide', 'section.md'), '# Guide\n\n## Hello\n');
  writeFileSync(
    join(docs, 'mdcp.config.json'),
    JSON.stringify({
      outputDir: '.',
      outputFile: 'guides.md',
      compileOrder: ['guide'],
      guides: [{ name: 'guide', path: 'guide' }],
      refs: { registryFile: 'refs.json' },
      lint: {
        markdownlint: { shardsConfig: SHARDS_PRESET },
      },
      ...configExtra,
    }),
  );
}

/**
 * In-scope fixture plus a scratch Vale style with one warning-level rule (`zorblax`)
 * and one error-level rule (`quuxly`). `body` goes into the guide's section shard.
 */
function writeValeLevelFixture(docs: string, vale: Record<string, unknown>, body: string): void {
  writeInScopeLintFixture(docs, { vale });
  const style = join(docs, 'styles', 'Scratch');
  mkdirSync(style, { recursive: true });
  writeFileSync(
    join(style, 'Warn.yml'),
    'extends: existence\nmessage: "Warn \'%s\'"\nlevel: warning\ntokens:\n  - zorblax\n',
  );
  writeFileSync(
    join(style, 'Err.yml'),
    'extends: existence\nmessage: "Err \'%s\'"\nlevel: error\ntokens:\n  - quuxly\n',
  );
  writeFileSync(
    join(docs, '.vale.ini'),
    'StylesPath = styles\nMinAlertLevel = suggestion\n\n[*.md]\nBasedOnStyles = Scratch\n',
  );
  writeFileSync(join(docs, 'guide', 'section.md'), `# Guide\n\n## Hello\n\n${body}\n`);
}

/**
 * Repo-layout fixture: guide shards under `docs/`, standalone guides at the repo root
 * (the scan root), and a `.vale.ini` in `docs/` on the shipped MDCP style. AGENTS.md
 * trips the error-level `MDCP.UnlinkedSeeChapter`; the guide shard is clean.
 */
function writeStandaloneValeFixture(
  repo: string,
  opts: {
    standalone?: Record<string, string>;
    vale?: Record<string, unknown>;
    ini?: string;
    /** Body of the guide shard; clean by default. */
    shard?: string;
    /** Set `guides[].path` (default true); without it the guide resolves to `{docsRoot}/guide`. */
    guidePath?: boolean;
  } = {},
): void {
  const docs = join(repo, 'docs');
  mkdirSync(join(docs, 'guide'), { recursive: true });
  writeFileSync(join(docs, 'guide', 'index.md'), '# Guide\n\n- [section](section.md)\n');
  writeFileSync(
    join(docs, 'guide', 'section.md'),
    `# Guide\n\n## Hello\n\n${opts.shard ?? 'The guide is clean.'}\n`,
  );
  const standalone = opts.standalone ?? { 'AGENTS.md': '# Agents\n\nSee Chapter 2 for details.\n' };
  for (const [file, body] of Object.entries(standalone)) writeFileSync(join(repo, file), body);
  writeFileSync(
    join(docs, 'mdcp.config.json'),
    JSON.stringify({
      outputDir: '.',
      outputFile: 'guides.md',
      compileOrder: ['guide'],
      ...(opts.guidePath === false ? {} : { guides: [{ name: 'guide', path: 'guide' }] }),
      refs: { registryFile: 'refs.json' },
      standaloneGuides: Object.keys(standalone),
      ...(opts.vale ? { vale: opts.vale } : {}),
    }),
  );
  writeFileSync(
    join(docs, '.vale.ini'),
    `StylesPath = ${join(REPO_ROOT, 'packages/mdcp-presets/vale')}\nMinAlertLevel = suggestion\n\n` +
      (opts.ini ?? '[*.md]\nBasedOnStyles = MDCP\n'),
  );
}

/** Run the CLI from the repo root, as `pnpm docs:check` does, with `docs/` as the docs root. */
function runAtRepo(repo: string, args: string[]) {
  const r = spawnSync(
    'node',
    [CLI, ...args, '--config', 'docs/mdcp.config.json', '--docs-root', 'docs'],
    { encoding: 'utf-8', cwd: repo },
  );
  return { status: r.status, output: `${r.stdout}${r.stderr}` };
}

function runIn(docs: string, args: string[]) {
  const r = spawnSync('node', [CLI, ...args, '--config', 'mdcp.config.json', '--docs-root', docs], {
    encoding: 'utf-8',
    cwd: docs,
  });
  return { status: r.status, output: `${r.stdout}${r.stderr}` };
}

describe('cli smoke', () => {
  it('prints version', () => {
    // cac exits 0 on --version but logs and terminates, so we can capture stdout via execFileSync
    try {
      execFileSync('node', [CLI, '--version'], { encoding: 'utf-8' });
    } catch (e: unknown) {
      if (
        e instanceof Error &&
        'stdout' in e &&
        typeof (e as { stdout?: unknown }).stdout === 'string'
      ) {
        expect((e as { stdout: string }).stdout).toMatch(/mdcp\/\d+\.\d+\.\d+/);
      } else {
        throw e;
      }
    }
  });

  it('compiles sample guides', () => {
    const out = execFileSync(
      'node',
      [CLI, 'compile', '--config', SAMPLE_CONFIG, '--docs-root', FIXTURE],
      { encoding: 'utf-8', cwd: REPO_ROOT },
    );
    expect(out).toMatch(/guides\.md/);
    expect(existsSync(join(FIXTURE, '_build', 'guides.md'))).toBe(true);
  });

  it('checks sample guides with vale skipped', () => {
    const out = execFileSync(
      'node',
      [CLI, 'check', '--config', SAMPLE_CONFIG, '--docs-root', FIXTURE, '--skip-vale'],
      { encoding: 'utf-8', cwd: REPO_ROOT },
    );
    expect(out).toContain('mdcp check passed');
  });

  it('does not run Vale prose or Pandoc-id checks in core check', () => {
    const docs = mkdtempSync(join(tmpdir(), 'mdcp-no-core-prose-lint-'));
    try {
      const guide = join(docs, 'g');
      mkdirSync(guide, { recursive: true });
      writeFileSync(join(guide, 'index.md'), '# G\n\n- [intro](introduction.md)\n');
      writeFileSync(
        join(guide, 'introduction.md'),
        '# G\n\n## Intro\n\nSee Section 2 for details.\n',
      );
      writeFileSync(
        join(docs, 'mdcp.config.json'),
        JSON.stringify({
          outputDir: '.',
          outputFile: 'guides.md',
          compileOrder: ['g'],
          guides: [{ name: 'g', path: 'g' }],
          refs: { registryFile: 'refs.json' },
          lint: { links: { enabled: false } },
        }),
      );

      const r = spawnSync(
        'node',
        [CLI, 'check', '--config', 'mdcp.config.json', '--docs-root', docs, '--skip-vale'],
        { encoding: 'utf-8', cwd: docs },
      );
      expect(r.status).toBe(0);
      expect(r.stdout).toContain('mdcp check passed');
    } finally {
      rmSync(docs, { recursive: true, force: true });
    }
  });

  it('resolves --config from invocation directory, not --docs-root (#10)', async () => {
    const project = mkdtempSync(join(tmpdir(), 'mdcp-config-cwd-'));
    try {
      const docs = join(project, 'docs');
      const guide = join(docs, 'g');
      mkdirSync(guide, { recursive: true });
      writeFileSync(join(guide, 'index.md'), '# Guide\n\n- [section](section.md)\n');
      writeFileSync(join(guide, 'section.md'), '# Guide\n\n## Hello\n');
      writeFileSync(
        join(docs, 'mdcp.config.json'),
        JSON.stringify({
          outputDir: '_build',
          outputFile: 'guides.md',
          compileOrder: ['g'],
          guides: [{ name: 'g', path: 'g' }],
          lint: { links: { enabled: false } },
        }),
      );

      const out = await runCli(
        ['compile', '--config', 'docs/mdcp.config.json', '--docs-root', 'docs'],
        project,
      );
      expect(out).toMatch(/guides\.md|→/);
      expect(existsSync(join(docs, '_build', 'guides.md'))).toBe(true);
    } finally {
      rmSync(project, { recursive: true, force: true });
    }
  });

  it('writes refs.registryFile under outputDir after compile when guides use nested outputFile (#62)', () => {
    const docs = mkdtempSync(join(tmpdir(), 'mdcp-smoke-'));
    try {
      const guide = join(docs, 'guide-a');
      mkdirSync(guide, { recursive: true });
      writeFileSync(join(guide, 'index.md'), '# Guide A\n\n- [Section one](section-1.md)\n');
      writeFileSync(join(guide, 'section-1.md'), '# Section one\n\nBody text.\n');
      writeFileSync(
        join(docs, 'mdcp.config.json'),
        JSON.stringify({
          outputDir: '_build',
          compileOrder: ['guide-a'],
          guides: [{ name: 'guide-a', compile: { outputFile: 'compiled/guide-a.md' } }],
          refs: { registryFile: '.caches/refs.json' },
          lint: { links: { enabled: false } },
        }),
      );

      execFileSync('node', [CLI, 'compile', '--config', 'mdcp.config.json', '--docs-root', docs], {
        encoding: 'utf-8',
        cwd: docs,
      });

      expect(existsSync(join(docs, '_build/.caches/refs.json'))).toBe(true);
      expect(existsSync(join(docs, '_build/compiled/refs.json'))).toBe(false);

      const listed = execFileSync(
        'node',
        [CLI, 'refs', 'list', '--config', 'mdcp.config.json', '--docs-root', docs],
        { encoding: 'utf-8', cwd: docs },
      );
      expect(listed).toContain('section-one');
    } finally {
      rmSync(docs, { recursive: true, force: true });
    }
  });

  it('normalizes cwd-relative refs.registryFile under outputDir (#11)', () => {
    const docs = mkdtempSync(join(tmpdir(), 'mdcp-smoke-'));
    try {
      const guide = join(docs, 'g');
      mkdirSync(guide, { recursive: true });
      writeFileSync(join(guide, 'index.md'), '# Guide\n\n- [intro](introduction.md)\n');
      writeFileSync(join(guide, 'introduction.md'), '# Guide\n\n## Hello\n');
      writeFileSync(
        join(docs, 'mdcp.config.json'),
        JSON.stringify({
          outputDir: '_build/compiled',
          outputFile: 'guides.md',
          compileOrder: ['g'],
          guides: [{ name: 'g', path: 'g' }],
          refs: { registryFile: '.caches/refs.json' },
        }),
      );

      execFileSync(
        'node',
        [CLI, 'check', '--config', 'mdcp.config.json', '--docs-root', docs, '--skip-vale'],
        { encoding: 'utf-8', cwd: docs },
      );
      expect(existsSync(join(docs, '_build/compiled/.caches/refs.json'))).toBe(true);
    } finally {
      rmSync(docs, { recursive: true, force: true });
    }
  });

  it('creates cache backup on re-compile with --backup', () => {
    const docs = mkdtempSync(join(tmpdir(), 'mdcp-backup-smoke-'));
    try {
      const guide = join(docs, 'g');
      mkdirSync(guide, { recursive: true });
      writeFileSync(join(guide, 'index.md'), '# Guide\n\n- [intro](introduction.md)\n');
      writeFileSync(join(guide, 'introduction.md'), '# Guide\n\n## Hello\n');
      writeFileSync(
        join(docs, 'mdcp.config.json'),
        JSON.stringify({
          outputDir: '_build',
          outputFile: 'guides.md',
          compileOrder: ['g'],
          guides: [{ name: 'g', path: 'g' }],
        }),
      );

      execFileSync('node', [CLI, 'compile', '--config', 'mdcp.config.json', '--docs-root', docs], {
        encoding: 'utf-8',
        cwd: docs,
      });
      const outPath = join(docs, '_build', 'guides.md');
      writeFileSync(outPath, 'stale monolith\n');

      execFileSync(
        'node',
        [CLI, 'compile', '--config', 'mdcp.config.json', '--docs-root', docs, '--backup'],
        { encoding: 'utf-8', cwd: docs },
      );

      const backupPath = join(docs, '_build', '.caches', 'backups', '_build', 'guides.md');
      expect(existsSync(backupPath)).toBe(true);
      expect(readFileSync(backupPath, 'utf-8')).toBe('stale monolith\n');
    } finally {
      rmSync(docs, { recursive: true, force: true });
    }
  });

  it('rejects removed export command', () => {
    const docs = mkdtempSync(join(tmpdir(), 'mdcp-export-gone-'));
    try {
      const guide = join(docs, 'g');
      mkdirSync(guide, { recursive: true });
      writeFileSync(join(guide, 'index.md'), '# Guide\n\n- [intro](introduction.md)\n');
      writeFileSync(join(guide, 'introduction.md'), '# Guide\n\n## Hello\n');
      writeFileSync(
        join(docs, 'mdcp.config.json'),
        JSON.stringify({
          outputDir: '_build',
          outputFile: 'guides.md',
          compileOrder: ['g'],
          guides: [{ name: 'g', path: 'g' }],
        }),
      );

      expect(() =>
        execFileSync(
          'node',
          [CLI, 'export', '--llm', '--config', 'mdcp.config.json', '--docs-root', docs],
          { encoding: 'utf-8', cwd: docs },
        ),
      ).toThrow();
    } finally {
      rmSync(docs, { recursive: true, force: true });
    }
  });

  it('writes default per-guide output under outputDir', () => {
    const docs = mkdtempSync(join(tmpdir(), 'mdcp-outfile-'));
    try {
      const guide = join(docs, 'glossary');
      mkdirSync(guide, { recursive: true });
      writeFileSync(join(guide, 'index.md'), '# Glossary\n\n- [term](term.md)\n');
      writeFileSync(join(guide, 'term.md'), '# Glossary\n\n## Term\n');
      writeFileSync(
        join(docs, 'mdcp.config.json'),
        JSON.stringify({
          outputDir: '_build/compiled',
          compileOrder: ['glossary'],
          guides: [{ name: 'glossary' }],
        }),
      );

      execFileSync('node', [CLI, 'compile', '--config', 'mdcp.config.json', '--docs-root', docs], {
        encoding: 'utf-8',
        cwd: docs,
      });
      expect(existsSync(join(docs, '_build/compiled/guide.md'))).toBe(true);
      expect(existsSync(join(docs, 'glossary.md'))).toBe(false);
    } finally {
      rmSync(docs, { recursive: true, force: true });
    }
  });

  it('skips out-of-scope markdown for shard lint (#17)', () => {
    const docs = mkdtempSync(join(tmpdir(), 'mdcp-scope-'));
    try {
      writeInScopeLintFixture(docs);
      const out = execFileSync(
        'node',
        [
          CLI,
          'check',
          '--config',
          'mdcp.config.json',
          '--docs-root',
          docs,
          '--skip-vale',
          '--require-lint',
        ],
        { encoding: 'utf-8', cwd: docs },
      );
      expect(out).toContain('mdcp check passed');
    } finally {
      rmSync(docs, { recursive: true, force: true });
    }
  });

  it('honors shardsGlobs override for shard lint (#17)', () => {
    const docs = mkdtempSync(join(tmpdir(), 'mdcp-shards-globs-'));
    try {
      mkdirSync(join(docs, 'narrow'), { recursive: true });
      mkdirSync(join(docs, 'wide'), { recursive: true });
      writeFileSync(join(docs, 'narrow', 'index.md'), '# Narrow\n\n- [a](a.md)\n');
      writeFileSync(join(docs, 'narrow', 'a.md'), '# Narrow\n\n## A\n');
      writeFileSync(join(docs, 'wide', 'index.md'), '# Wide\n\n- [b](b.md)\n');
      writeFileSync(join(docs, 'wide', 'b.md'), 'No heading — would fail MD041 if linted.\n');
      writeFileSync(
        join(docs, 'mdcp.config.json'),
        JSON.stringify({
          outputDir: '.',
          outputFile: 'guides.md',
          compileOrder: ['narrow', 'wide'],
          guides: [
            { name: 'narrow', path: 'narrow' },
            { name: 'wide', path: 'wide' },
          ],
          refs: { registryFile: 'refs.json' },
          lint: {
            markdownlint: {
              shardsConfig: SHARDS_PRESET,
              shardsGlobs: ['narrow'],
            },
          },
        }),
      );

      const out = execFileSync(
        'node',
        [
          CLI,
          'check',
          '--config',
          'mdcp.config.json',
          '--docs-root',
          docs,
          '--skip-vale',
          '--require-lint',
        ],
        { encoding: 'utf-8', cwd: docs },
      );
      expect(out).toContain('mdcp check passed');
    } finally {
      rmSync(docs, { recursive: true, force: true });
    }
  });

  it('skips out-of-scope markdown for Vale prose (#17)', () => {
    if (!valeInstalled()) return;

    const docs = mkdtempSync(join(tmpdir(), 'mdcp-vale-scope-'));
    try {
      writeInScopeLintFixture(docs);
      writeFileSync(
        join(docs, '.vale.ini'),
        `StylesPath = ${join(REPO_ROOT, 'docs/styles')}\nMinAlertLevel = error\n`,
      );

      execFileSync(
        'node',
        [CLI, 'check', '--config', 'mdcp.config.json', '--docs-root', docs, '--require-lint'],
        { encoding: 'utf-8', cwd: docs },
      );
    } finally {
      rmSync(docs, { recursive: true, force: true });
    }
  });

  it('shows warnings in non-strict mdcp prose when a vale block is set (D3)', () => {
    if (!valeInstalled()) return;

    const docs = mkdtempSync(join(tmpdir(), 'mdcp-vale-prose-level-'));
    try {
      writeValeLevelFixture(docs, {}, 'The zorblax setting is on.');
      const r = runIn(docs, ['prose', '--require-vale']);
      expect(r.status).toBe(0);
      expect(r.output).toMatch(/Scratch\.Warn/);
    } finally {
      rmSync(docs, { recursive: true, force: true });
    }
  });

  it('shows only errors in mdcp prose --strict and mdcp check by default', () => {
    if (!valeInstalled()) return;

    const docs = mkdtempSync(join(tmpdir(), 'mdcp-vale-strict-level-'));
    try {
      writeValeLevelFixture(docs, {}, 'The zorblax setting is on.');
      const prose = runIn(docs, ['prose', '--strict', '--require-vale']);
      expect(prose.status).toBe(0);
      expect(prose.output).not.toMatch(/Scratch\.Warn/);
      const check = runIn(docs, ['check', '--require-vale']);
      expect(check.status).toBe(0);
      expect(check.output).not.toMatch(/Scratch\.Warn/);
    } finally {
      rmSync(docs, { recursive: true, force: true });
    }
  });

  it('shows alerts at vale.strictMinAlertLevel in mdcp check and fails only on errors (D3)', () => {
    if (!valeInstalled()) return;

    const docs = mkdtempSync(join(tmpdir(), 'mdcp-vale-check-level-'));
    try {
      writeValeLevelFixture(docs, { strictMinAlertLevel: 'warning' }, 'The zorblax setting is on.');
      const warned = runIn(docs, ['check', '--require-vale']);
      expect(warned.output).toMatch(/Scratch\.Warn/);
      expect(warned.status).toBe(0);

      writeFileSync(join(docs, 'guide', 'section.md'), '# Guide\n\n## Hello\n\nThe quuxly flag.\n');
      const failed = runIn(docs, ['check', '--require-vale']);
      expect(failed.output).toMatch(/Scratch\.Err/);
      expect(failed.status).toBe(1);
    } finally {
      rmSync(docs, { recursive: true, force: true });
    }
  });

  it('runs Vale over standalone guides in mdcp check and mdcp prose (D2)', () => {
    if (!valeInstalled()) return;

    const repo = mkdtempSync(join(tmpdir(), 'mdcp-vale-standalone-'));
    try {
      writeStandaloneValeFixture(repo);
      const check = runAtRepo(repo, ['check', '--require-vale']);
      expect(check.output).toMatch(/AGENTS\.md[\s\S]*MDCP\.UnlinkedSeeChapter/);
      expect(check.output).toMatch(/vale/);
      // The failure hint names the per-file opt-out, not only --skip-vale, including the
      // rules the Markdown section sets by name, which an empty BasedOnStyles leaves on.
      expect(check.output).toMatch(/\[\*\*\/<file>\][\s\S]*Opt a standalone guide out of Vale/);
      expect(check.output).toMatch(/after every section that matches the file/);
      expect(check.output).toMatch(/set to `NO` each rule that an earlier section names/);
      expect(check.output).not.toMatch(/runtime error/);
      expect(check.status).toBe(1);

      const prose = runAtRepo(repo, ['prose', '--require-vale']);
      expect(prose.output).toMatch(/AGENTS\.md[\s\S]*MDCP\.UnlinkedSeeChapter/);
      expect(prose.status).toBe(1);
    } finally {
      rmSync(repo, { recursive: true, force: true });
    }
  });

  it('runs Vale over standalone guides when vale.scanGlobs is set (D2)', () => {
    if (!valeInstalled()) return;

    const repo = mkdtempSync(join(tmpdir(), 'mdcp-vale-standalone-globs-'));
    try {
      writeStandaloneValeFixture(repo, { vale: { scanGlobs: ['guide'] } });
      const check = runAtRepo(repo, ['check', '--require-vale']);
      expect(check.output).toMatch(/AGENTS\.md[\s\S]*MDCP\.UnlinkedSeeChapter/);
      expect(check.status).toBe(1);
    } finally {
      rmSync(repo, { recursive: true, force: true });
    }
  });

  it('lints guide shards and standalone guides with a relative --docs-root and no guides[].path (D2)', () => {
    if (!valeInstalled()) return;

    // The documented setup: `--docs-root docs` from the repo root, the guide at the default
    // {docsRoot}/{name}/, no vale.scanGlobs. Vale runs with docs/ as its cwd, so a relative
    // guide path would point at docs/docs/guide.
    const repo = mkdtempSync(join(tmpdir(), 'mdcp-vale-standalone-relroot-'));
    try {
      writeStandaloneValeFixture(repo, {
        guidePath: false,
        shard: 'See Chapter 3 for details.',
      });
      const check = runAtRepo(repo, ['check', '--require-vale']);
      expect(check.output).not.toMatch(/does not exist/);
      expect(check.output).toMatch(/guide\/section\.md[\s\S]*MDCP\.UnlinkedSeeChapter/);
      expect(check.output).toMatch(/AGENTS\.md[\s\S]*MDCP\.UnlinkedSeeChapter/);
      expect(check.status).toBe(1);

      const prose = runAtRepo(repo, ['prose', '--require-vale']);
      expect(prose.output).toMatch(/guide\/section\.md[\s\S]*MDCP\.UnlinkedSeeChapter/);
      expect(prose.output).toMatch(/AGENTS\.md[\s\S]*MDCP\.UnlinkedSeeChapter/);
      expect(prose.status).toBe(1);
    } finally {
      rmSync(repo, { recursive: true, force: true });
    }
  });

  it('lints a standalone guide that sits under node_modules in a scanned directory (D2)', () => {
    if (!valeInstalled()) return;

    // Vale's directory walk skips node_modules, so the file reaches Vale only by name.
    const repo = mkdtempSync(join(tmpdir(), 'mdcp-vale-standalone-nodemodules-'));
    try {
      mkdirSync(join(repo, 'docs', 'guide', 'node_modules', 'pkg'), { recursive: true });
      writeStandaloneValeFixture(repo, {
        standalone: {
          'docs/guide/node_modules/pkg/README.md': '# Pkg\n\nSee Chapter 2 for details.\n',
        },
      });
      const prose = runAtRepo(repo, ['prose', '--require-vale']);
      expect(prose.output).toMatch(/node_modules\/pkg\/README\.md[\s\S]*MDCP\.UnlinkedSeeChapter/);
      expect(prose.status).toBe(1);
    } finally {
      rmSync(repo, { recursive: true, force: true });
    }
  });

  it('points a Vale runtime error at the config, not the opt-out (D2)', () => {
    if (!valeInstalled()) return;

    // Vale does not expand globs: with more than one argument, a missing path stops the run.
    const repo = mkdtempSync(join(tmpdir(), 'mdcp-vale-standalone-runtime-'));
    try {
      writeStandaloneValeFixture(repo, {
        vale: { scanGlobs: ['guide/*.md'] },
        standalone: { 'AGENTS.md': '# Agents\n\nThe agent notes are clean.\n' },
      });
      const check = runAtRepo(repo, ['check', '--require-vale']);
      expect(check.output).toMatch(/guide\/\*\.md' does not exist/);
      expect(check.output).toMatch(/Vale stopped with a runtime error/);
      expect(check.output).toMatch(/Vale does not expand globs/);
      expect(check.output).not.toMatch(/Opt a standalone guide out of Vale/);
      expect(check.status).toBe(1);
    } finally {
      rmSync(repo, { recursive: true, force: true });
    }
  });

  it('opts a standalone guide out of Vale with the .vale.ini section optional-linters documents', () => {
    if (!valeInstalled()) return;

    const shard = readFileSync(join(REPO_ROOT, 'docs/client-cli/optional-linters.md'), 'utf-8');
    const block = [...shard.matchAll(/```ini\n([\s\S]*?)```/g)]
      .map((m) => m[1])
      .find((b) => /^BasedOnStyles =$/m.test(b!));
    expect(block).toBeDefined();
    const optOut = block!.slice(block!.search(/^;|^\[\*\*\//m));
    expect(optOut).toMatch(/^\[\*\*\/CODE_OF_CONDUCT\.md\]$/m);

    const repo = mkdtempSync(join(tmpdir(), 'mdcp-vale-standalone-optout-'));
    const vendored = 'See Chapter 2 for details.\n\nAs of 2026-07-27 this text is vendored.\n';
    const standalone = {
      'AGENTS.md': '# Agents\n\nSee Chapter 2 for details.\n',
      'CODE_OF_CONDUCT.md': `# Code of conduct\n\n${vendored}`,
    };
    try {
      // Without the opt-out section, the vendored file fails the check.
      writeStandaloneValeFixture(repo, { standalone, ini: block!.replace(optOut, '') });
      const before = runAtRepo(repo, ['check', '--require-vale']);
      expect(before.output).toMatch(/CODE_OF_CONDUCT\.md/);
      expect(before.status).toBe(1);

      // With the documented block, Vale skips the vendored file at every level and still
      // lints the other standalone guide.
      writeStandaloneValeFixture(repo, { standalone, ini: block! });
      const prose = runAtRepo(repo, ['prose', '--require-vale']);
      expect(prose.output).toMatch(/AGENTS\.md/);
      expect(prose.output).not.toMatch(/CODE_OF_CONDUCT\.md/);

      writeFileSync(join(repo, 'AGENTS.md'), '# Agents\n\nThe agent notes are clean.\n');
      const check = runAtRepo(repo, ['check', '--require-vale']);
      expect(check.output).toMatch(/mdcp check passed/);
      expect(check.status).toBe(0);
    } finally {
      rmSync(repo, { recursive: true, force: true });
    }
  });

  it('exits 1 on broken internal links by default', () => {
    const docs = mkdtempSync(join(tmpdir(), 'mdcp-link-fail-'));
    try {
      mkdirSync(join(docs, 'g'), { recursive: true });
      writeFileSync(join(docs, 'g', 'index.md'), '# G\n\n- [s](s.md)\n');
      writeFileSync(join(docs, 'g', 's.md'), '# G\n\n## Hi\n\n[bad](#nope)\n');
      writeFileSync(
        join(docs, 'mdcp.config.json'),
        JSON.stringify({
          outputDir: '.',
          outputFile: 'guides.md',
          compileOrder: ['g'],
          guides: [{ name: 'g', path: 'g' }],
          refs: { registryFile: 'refs.json' },
          lint: { links: { enabled: true } },
        }),
      );

      const r = spawnSync(
        'node',
        [CLI, 'check', '--config', 'mdcp.config.json', '--docs-root', docs, '--skip-vale'],
        { encoding: 'utf-8', cwd: docs },
      );
      expect(r.status).toBe(1);
      expect(r.stderr).toMatch(/link:/);
      expect(r.stderr).toMatch(/mdcp check failed:/);
      expect(r.stderr).toMatch(/built-in links:/);
      expect(r.stderr).toMatch(/dead anchor:/);
      expect(r.stderr).toMatch(/Resolve the diagnostics above, then re-run: mdcp check/);
    } finally {
      rmSync(docs, { recursive: true, force: true });
    }
  });

  it('exits 0 with --warn-broken-links and prints link-warn', () => {
    const docs = mkdtempSync(join(tmpdir(), 'mdcp-link-warn-'));
    try {
      mkdirSync(join(docs, 'g'), { recursive: true });
      writeFileSync(join(docs, 'g', 'index.md'), '# G\n\n- [s](s.md)\n');
      writeFileSync(join(docs, 'g', 's.md'), '# G\n\n## Hi\n\n[bad](#nope)\n');
      writeFileSync(
        join(docs, 'mdcp.config.json'),
        JSON.stringify({
          outputDir: '.',
          outputFile: 'guides.md',
          compileOrder: ['g'],
          guides: [{ name: 'g', path: 'g' }],
          refs: { registryFile: 'refs.json' },
          lint: { links: { enabled: true } },
        }),
      );

      const r = spawnSync(
        'node',
        [
          CLI,
          'check',
          '--config',
          'mdcp.config.json',
          '--docs-root',
          docs,
          '--skip-vale',
          '--warn-broken-links',
        ],
        { encoding: 'utf-8', cwd: docs },
      );
      expect(r.status).toBe(0);
      expect(r.stderr).toMatch(/link-warn:/);
    } finally {
      rmSync(docs, { recursive: true, force: true });
    }
  });

  it('mdcp compile exits 1 when output contains broken link', () => {
    const docs = mkdtempSync(join(tmpdir(), 'mdcp-compile-link-'));
    try {
      mkdirSync(join(docs, 'g'), { recursive: true });
      writeFileSync(join(docs, 'g', 'index.md'), '# G\n\n- [s](s.md)\n');
      writeFileSync(join(docs, 'g', 's.md'), '# G\n\n## Hi\n\n[bad](#nope)\n');
      writeFileSync(
        join(docs, 'mdcp.config.json'),
        JSON.stringify({
          outputDir: '.',
          outputFile: 'guides.md',
          compileOrder: ['g'],
          guides: [{ name: 'g', path: 'g' }],
          refs: { registryFile: 'refs.json' },
          lint: { links: { enabled: true } },
        }),
      );

      const r = spawnSync(
        'node',
        [CLI, 'compile', '--config', 'mdcp.config.json', '--docs-root', docs],
        { encoding: 'utf-8', cwd: docs },
      );
      expect(r.status).toBe(1);
      expect(r.stderr).toMatch(/link:/);
    } finally {
      rmSync(docs, { recursive: true, force: true });
    }
  });
  it('applies the presets README path section to the absolute paths mdcp passes Vale', () => {
    if (!valeInstalled()) return;

    // The documented .vale.ini block that exempts research records from MDCP.DatedClaim.
    const readme = readFileSync(join(REPO_ROOT, 'packages/mdcp-presets/README.md'), 'utf-8');
    const section = [...readme.matchAll(/```ini\n([\s\S]*?)```/g)]
      .map((m) => m[1])
      .find((block) => block.includes('MDCP.DatedClaim = NO'));
    expect(section).toBeDefined();
    const valeIni = (block: string) =>
      `StylesPath = ${join(REPO_ROOT, 'packages/mdcp-presets/vale')}\nMinAlertLevel = suggestion\n\n${block}`;

    const docs = mkdtempSync(join(tmpdir(), 'mdcp-vale-path-section-'));
    const run = (args: string[]) => {
      const r = spawnSync(
        'node',
        [CLI, ...args, '--config', 'mdcp.config.json', '--docs-root', docs],
        { encoding: 'utf-8', cwd: docs },
      );
      return { status: r.status, output: `${r.stdout}${r.stderr}` };
    };
    try {
      const claims: Record<string, string> = {
        guide: 'The flag stays on until 2026-09-01.',
        research: 'As of 2026-07-27 the runner image is pinned.',
      };
      for (const [name, claim] of Object.entries(claims)) {
        mkdirSync(join(docs, name));
        writeFileSync(join(docs, name, 'index.md'), `# ${name}\n\n- [notes](notes.md)\n`);
        writeFileSync(join(docs, name, 'notes.md'), `# ${name}\n\n## Notes\n\n${claim}\n`);
      }
      writeFileSync(
        join(docs, 'mdcp.config.json'),
        JSON.stringify({
          outputDir: '.',
          outputFile: 'guides.md',
          compileOrder: ['guide', 'research'],
          guides: [
            { name: 'guide', path: 'guide' },
            { name: 'research', path: 'research' },
          ],
          refs: { registryFile: 'refs.json' },
        }),
      );

      // The block as documented: dated claims are warnings, and research/ is exempt.
      writeFileSync(join(docs, '.vale.ini'), valeIni(section!));
      const prose = run(['prose', '--require-vale']);
      expect(prose.status).toBe(0);
      expect(prose.output).toMatch(/guide\/notes\.md/);
      expect(prose.output).not.toMatch(/research\/notes\.md/);

      // At the rule's own error level, only the research claim is left, so the check
      // passes only when the path section matches.
      writeFileSync(
        join(docs, '.vale.ini'),
        valeIni(section!.replace(/^MDCP\.DatedClaim = warning\n/m, '')),
      );
      writeFileSync(join(docs, 'guide', 'notes.md'), '# guide\n\n## Notes\n\nThe flag is on.\n');
      const check = run(['check', '--require-vale']);
      expect(check.output).toMatch(/mdcp check passed/);
      expect(check.status).toBe(0);
    } finally {
      rmSync(docs, { recursive: true, force: true });
    }
  });
});
