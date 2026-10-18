import { describe, it, expect } from 'vitest';
import { execFile, execFileSync, spawnSync } from 'node:child_process';
import { promisify } from 'node:util';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  rmSync,
  symlinkSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { DEFAULT_STANDARD_VERSION } from '@merlon-docs/merlon-docs-core';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLI = join(__dirname, '../dist/cli.js');
const REPO_ROOT = join(__dirname, '../../..');
const execFileAsync = promisify(execFile);

async function runCli(args: string[], cwd: string): Promise<string> {
  const { stdout } = await execFileAsync('node', [CLI, ...args], { encoding: 'utf-8', cwd });
  return stdout;
}
const SHARDS_PRESET = join(
  REPO_ROOT,
  'packages/merlon-docs-presets/markdownlint-shards.markdownlint-cli2.jsonc',
);
const COMPILED_PRESET = join(
  REPO_ROOT,
  'packages/merlon-docs-presets/markdownlint-compiled.markdownlint-cli2.jsonc',
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
    join(docs, 'merlon.config.json'),
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
 * (the scan root), and a `.vale.ini` in `docs/` on the shipped MerlonDocs style. AGENTS.md
 * trips the error-level `MerlonDocs.UnlinkedSeeChapter`; the guide shard is clean.
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
    join(docs, 'merlon.config.json'),
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
    `StylesPath = ${join(REPO_ROOT, 'packages/merlon-docs-presets/vale')}\nMinAlertLevel = suggestion\n\n` +
      (opts.ini ?? '[*.md]\nBasedOnStyles = MerlonDocs\n'),
  );
}

/** Run the CLI from the repo root, as `pnpm docs:check` does, with `docs/` as the docs root. */
function runAtRepo(repo: string, args: string[]) {
  const r = spawnSync(
    'node',
    [CLI, ...args, '--config', 'docs/merlon.config.json', '--docs-root', 'docs'],
    { encoding: 'utf-8', cwd: repo },
  );
  return { status: r.status, output: `${r.stdout}${r.stderr}` };
}

function runIn(docs: string, args: string[]) {
  const r = spawnSync(
    'node',
    [CLI, ...args, '--config', 'merlon.config.json', '--docs-root', docs],
    {
      encoding: 'utf-8',
      cwd: docs,
    },
  );
  return { status: r.status, output: `${r.stdout}${r.stderr}` };
}

/**
 * Repo-layout markdownlint fixture for `runAtRepo`: one guide at the default
 * `{docsRoot}/guide/` (no `guides[].path`) and the monolith at the default
 * `_build/guides.md`. The section shard has no blank line after its `## Hello`
 * heading, which markdownlint reports as MD022 in the shard and in the monolith.
 */
function writeMarkdownlintFixture(repo: string, markdownlint: Record<string, unknown>): void {
  const docs = join(repo, 'docs');
  mkdirSync(join(docs, 'guide'), { recursive: true });
  writeFileSync(join(docs, 'guide', 'index.md'), '# Guide\n\n- [section](section.md)\n');
  writeFileSync(join(docs, 'guide', 'section.md'), '# Guide\n\n## Hello\nNo blank line.\n');
  writeFileSync(
    join(docs, 'merlon.config.json'),
    JSON.stringify({ outputFile: 'guides.md', compileOrder: ['guide'], lint: { markdownlint } }),
  );
}

/**
 * Check gate fixture for `runGate`: guide `g` whose shard has a dead anchor and
 * names a missing backtick path, with path resolution at `error`, and an
 * uncaptured `stray.md` beside the guide. Built-in links, paths and coverage
 * each report one problem, so the order of their lines shows the stage order.
 */
function writeGateFixture(docs: string, scan: Record<string, unknown> = {}): void {
  mkdirSync(join(docs, 'g'), { recursive: true });
  writeFileSync(join(docs, 'g', 'index.md'), '# G\n\n- [s](s.md)\n');
  writeFileSync(
    join(docs, 'g', 's.md'),
    '# G\n\n## Hi\n\n[bad](#nope)\n\nThe module is `src/gone/module.ts`.\n',
  );
  writeFileSync(join(docs, 'stray.md'), '# Stray\n');
  writeFileSync(
    join(docs, 'merlon.config.json'),
    JSON.stringify({
      outputDir: '.',
      outputFile: 'guides.md',
      compileOrder: ['g'],
      guides: [{ name: 'g', path: 'g' }],
      refs: { registryFile: 'refs.json' },
      scan: { gitignore: false, ...scan },
      lint: { paths: { severity: 'error' } },
    }),
  );
}

function runGate(docs: string) {
  return spawnSync(
    'node',
    [CLI, 'check', '--config', 'merlon.config.json', '--docs-root', docs, '--skip-vale'],
    { encoding: 'utf-8', cwd: docs },
  );
}

/** Offset of the first line of `text` that `re` matches, or -1. */
function lineAt(text: string, re: RegExp): number {
  return text.search(new RegExp(re.source, 'm'));
}

describe('cli smoke', () => {
  it('does not run Vale prose or Pandoc-id checks in core check', () => {
    const docs = mkdtempSync(join(tmpdir(), 'merlon-no-core-prose-lint-'));
    try {
      const guide = join(docs, 'g');
      mkdirSync(guide, { recursive: true });
      writeFileSync(join(guide, 'index.md'), '# G\n\n- [intro](introduction.md)\n');
      writeFileSync(
        join(guide, 'introduction.md'),
        '# G\n\n## Intro\n\nSee Section 2 for details.\n',
      );
      writeFileSync(
        join(docs, 'merlon.config.json'),
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
        [CLI, 'check', '--config', 'merlon.config.json', '--docs-root', docs, '--skip-vale'],
        { encoding: 'utf-8', cwd: docs },
      );
      expect(r.status).toBe(0);
      expect(r.stdout).toContain('merlon check passed');
    } finally {
      rmSync(docs, { recursive: true, force: true });
    }
  });

  it('resolves --config from invocation directory, not --docs-root (#10)', async () => {
    const project = mkdtempSync(join(tmpdir(), 'merlon-config-cwd-'));
    try {
      const docs = join(project, 'docs');
      const guide = join(docs, 'g');
      mkdirSync(guide, { recursive: true });
      writeFileSync(join(guide, 'index.md'), '# Guide\n\n- [section](section.md)\n');
      writeFileSync(join(guide, 'section.md'), '# Guide\n\n## Hello\n');
      writeFileSync(
        join(docs, 'merlon.config.json'),
        JSON.stringify({
          outputDir: '_build',
          outputFile: 'guides.md',
          compileOrder: ['g'],
          guides: [{ name: 'g', path: 'g' }],
          lint: { links: { enabled: false } },
        }),
      );

      const out = await runCli(
        ['compile', '--config', 'docs/merlon.config.json', '--docs-root', 'docs'],
        project,
      );
      expect(out).toMatch(/guides\.md|→/);
      expect(existsSync(join(docs, '_build', 'guides.md'))).toBe(true);
    } finally {
      rmSync(project, { recursive: true, force: true });
    }
  });

  describe('default config file name', () => {
    function writeMinimalProject(
      dir: string,
      configName: string,
      extra: Record<string, unknown> = {},
    ): void {
      mkdirSync(join(dir, 'g'), { recursive: true });
      writeFileSync(join(dir, 'g', 'index.md'), '# Guide\n\n- [section](section.md)\n');
      writeFileSync(join(dir, 'g', 'section.md'), '# Guide\n\n## Hello\n');
      writeFileSync(
        join(dir, configName),
        JSON.stringify({
          outputDir: '_build',
          outputFile: 'guides.md',
          compileOrder: ['g'],
          guides: [{ name: 'g', path: 'g' }],
          lint: { links: { enabled: false } },
          ...extra,
        }),
      );
    }

    function compileWithoutConfigFlag(dir: string) {
      const r = spawnSync('node', [CLI, 'compile', '--docs-root', '.'], {
        encoding: 'utf-8',
        cwd: dir,
      });
      return { status: r.status, stdout: r.stdout, stderr: r.stderr };
    }

    it('reads merlon.config.json without a notice', () => {
      const dir = mkdtempSync(join(tmpdir(), 'merlon-default-config-'));
      try {
        writeMinimalProject(dir, 'merlon.config.json');
        const r = compileWithoutConfigFlag(dir);
        expect(r.status).toBe(0);
        expect(r.stderr).not.toMatch(/mdcp\.config\.json/);
        expect(existsSync(join(dir, '_build', 'guides.md'))).toBe(true);
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    });

    it('upgrades mdcp.config.json to merlon.config.json with a notice', () => {
      const dir = mkdtempSync(join(tmpdir(), 'merlon-legacy-config-'));
      try {
        writeMinimalProject(dir, 'mdcp.config.json', { protocolVersion: '0.4.0.0' });
        const r = compileWithoutConfigFlag(dir);
        expect(r.status).toBe(0);
        expect(r.stderr).toMatch(
          /Upgraded mdcp\.config\.json to merlon\.config\.json, and its protocolVersion key is now standardVersion/,
        );
        expect(existsSync(join(dir, 'mdcp.config.json'))).toBe(false);
        const upgraded = JSON.parse(readFileSync(join(dir, 'merlon.config.json'), 'utf-8')) as {
          standardVersion?: string;
          protocolVersion?: string;
          compileOrder?: string[];
        };
        expect(upgraded.standardVersion).toBe(DEFAULT_STANDARD_VERSION);
        expect(upgraded.protocolVersion).toBeUndefined();
        expect(upgraded.compileOrder).toEqual(['g']);
        expect(existsSync(join(dir, '_build', 'guides.md'))).toBe(true);

        const again = compileWithoutConfigFlag(dir);
        expect(again.status).toBe(0);
        expect(again.stderr).not.toMatch(/mdcp\.config\.json/);
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    });

    it('upgrades a former config without protocolVersion by renaming it', () => {
      const dir = mkdtempSync(join(tmpdir(), 'merlon-legacy-config-'));
      try {
        writeMinimalProject(dir, 'mdcp.config.json');
        const before = readFileSync(join(dir, 'mdcp.config.json'), 'utf-8');
        const r = compileWithoutConfigFlag(dir);
        expect(r.status).toBe(0);
        expect(r.stderr).toMatch(/Upgraded mdcp\.config\.json to merlon\.config\.json\./);
        expect(readFileSync(join(dir, 'merlon.config.json'), 'utf-8')).toBe(before);
        expect(existsSync(join(dir, 'mdcp.config.json'))).toBe(false);
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    });

    it('prefers merlon.config.json when both files exist', () => {
      const dir = mkdtempSync(join(tmpdir(), 'merlon-both-configs-'));
      try {
        writeMinimalProject(dir, 'merlon.config.json');
        writeFileSync(join(dir, 'mdcp.config.json'), '{ "not": "valid config" ');
        const r = compileWithoutConfigFlag(dir);
        expect(r.status).toBe(0);
        expect(r.stderr).not.toMatch(/mdcp\.config\.json/);
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    });
  });

  it('writes refs.registryFile under outputDir after compile when guides use nested outputFile (#62)', () => {
    const docs = mkdtempSync(join(tmpdir(), 'merlon-smoke-'));
    try {
      const guide = join(docs, 'guide-a');
      mkdirSync(guide, { recursive: true });
      writeFileSync(join(guide, 'index.md'), '# Guide A\n\n- [Section one](section-1.md)\n');
      writeFileSync(join(guide, 'section-1.md'), '# Section one\n\nBody text.\n');
      writeFileSync(
        join(docs, 'merlon.config.json'),
        JSON.stringify({
          outputDir: '_build',
          compileOrder: ['guide-a'],
          guides: [{ name: 'guide-a', compile: { outputFile: 'compiled/guide-a.md' } }],
          refs: { registryFile: '.caches/refs.json' },
          lint: { links: { enabled: false } },
        }),
      );

      execFileSync(
        'node',
        [CLI, 'compile', '--config', 'merlon.config.json', '--docs-root', docs],
        {
          encoding: 'utf-8',
          cwd: docs,
        },
      );

      expect(existsSync(join(docs, '_build/.caches/refs.json'))).toBe(true);
      expect(existsSync(join(docs, '_build/compiled/refs.json'))).toBe(false);

      const listed = execFileSync(
        'node',
        [CLI, 'refs', 'list', '--config', 'merlon.config.json', '--docs-root', docs],
        { encoding: 'utf-8', cwd: docs },
      );
      expect(listed).toContain('section-one');
    } finally {
      rmSync(docs, { recursive: true, force: true });
    }
  });

  // Guide p is a publish output, so the monolith leaves it out. The registry still lists it.
  it('lists the headings of every compiled output with its file when a monolith is set', () => {
    const repo = mkdtempSync(join(tmpdir(), 'merlon-refs-outputs-'));
    const docs = join(repo, 'docs');
    const run = (args: string[]) =>
      spawnSync(
        'node',
        [CLI, ...args, '--config', 'docs/merlon.config.json', '--docs-root', 'docs'],
        {
          encoding: 'utf-8',
          cwd: repo,
        },
      );
    try {
      const files: Record<string, string> = {
        'a/index.md': '# Guide A\n\n- [Setup](./setup.md)\n',
        'a/setup.md': '# Setup\n\nText.\n',
        'p/index.md': '# Pub\n\n- [Start](./start.md)\n',
        'p/start.md': '# Start\n\nText.\n\n## When it runs\n\nText.\n',
      };
      for (const [rel, text] of Object.entries(files)) {
        mkdirSync(dirname(join(docs, rel)), { recursive: true });
        writeFileSync(join(docs, rel), text);
      }
      writeFileSync(
        join(docs, 'merlon.config.json'),
        JSON.stringify({
          outputFile: 'guides.md',
          compileOrder: ['a', 'p'],
          guides: [{ name: 'p', compile: { outputFile: '../../README.md' } }],
          refs: { registryFile: 'refs.json' },
        }),
      );
      expect(run(['compile']).status).toBe(0);

      const registry = JSON.parse(readFileSync(join(docs, '_build', 'refs.json'), 'utf-8'));
      // The top level is still the monolith alone.
      expect(registry.headings.map((h: { slug: string }) => h.slug)).toEqual(['guide-a', 'setup']);
      expect(
        registry.outputs.map((o: { file: string; headings: { slug: string }[] }) => [
          o.file,
          o.headings.map((h) => h.slug),
        ]),
      ).toEqual([
        ['_build/a.md', ['guide-a', 'setup']],
        ['../README.md', ['pub', 'start', 'when-it-runs']],
        ['_build/guides.md', ['guide-a', 'setup']],
      ]);

      const listed = run(['refs', 'list']);
      expect(listed.status).toBe(0);
      const headings = JSON.parse(listed.stdout) as { file: string; slug: string; line: number }[];
      const runs = headings.find((h) => h.slug === 'when-it-runs');
      expect(runs?.file).toBe('../README.md');
      const readme = readFileSync(join(repo, 'README.md'), 'utf-8').split('\n');
      expect(readme[runs!.line - 1]).toBe('### When it runs');
      expect(headings.filter((h) => h.slug === 'setup').map((h) => h.file)).toEqual([
        '_build/a.md',
        '_build/guides.md',
      ]);

      const table = run(['refs-list', '--format', 'table']);
      expect(table.stdout).toContain('../README.md\twhen-it-runs\tWhen it runs\n');

      // refs-check compiles again, so a new heading in the publish output makes the file stale.
      expect(run(['refs-check']).status).toBe(0);
      writeFileSync(join(docs, 'p', 'start.md'), `${files['p/start.md']}\n## Later\n\nText.\n`);
      const stale = run(['refs-check']);
      expect(stale.status).toBe(1);
      expect(stale.stdout).toContain('refs.json is stale');
      expect(run(['refs-gen']).status).toBe(0);
      expect(run(['refs-check']).status).toBe(0);
    } finally {
      rmSync(repo, { recursive: true, force: true });
    }
  });

  it('lists the top-level headings of a registry that has no outputs, and says to regenerate it', () => {
    const docs = mkdtempSync(join(tmpdir(), 'merlon-refs-old-'));
    try {
      // The registry has another name, so the message has to give its path.
      writeFileSync(
        join(docs, 'merlon.config.json'),
        JSON.stringify({ compileOrder: ['a'], refs: { registryFile: 'registry.json' } }),
      );
      const heading = {
        key: 'guide-a.guide-a',
        slug: 'guide-a',
        title: 'Guide A',
        guide: 'guide-a',
        sourceFile: null,
        level: 1,
        line: 3,
      };
      const refsPath = join(docs, '_build', 'registry.json');
      mkdirSync(join(docs, '_build'));
      writeFileSync(
        refsPath,
        JSON.stringify({ generatedFrom: 'compiled', headings: [heading], slugs: {} }),
      );
      const list = (...args: string[]) =>
        spawnSync(
          'node',
          [CLI, 'refs-list', ...args, '--config', 'merlon.config.json', '--docs-root', docs],
          { encoding: 'utf-8', cwd: docs },
        );
      const listed = list();
      expect(listed.status).toBe(0);
      expect(JSON.parse(listed.stdout)).toEqual([heading]);
      expect(listed.stderr).toBe(
        `${refsPath} lists no compiled outputs; run \`merlon refs-gen\` to list each heading with its file.\n`,
      );

      // With no file to give, a table row is the slug and the title.
      const table = list('--format', 'table');
      expect(table.status).toBe(0);
      expect(table.stdout).toBe('guide-a\tGuide A\n');
    } finally {
      rmSync(docs, { recursive: true, force: true });
    }
  });

  it('normalizes cwd-relative refs.registryFile under outputDir (#11)', () => {
    const docs = mkdtempSync(join(tmpdir(), 'merlon-smoke-'));
    try {
      const guide = join(docs, 'g');
      mkdirSync(guide, { recursive: true });
      writeFileSync(join(guide, 'index.md'), '# Guide\n\n- [intro](introduction.md)\n');
      writeFileSync(join(guide, 'introduction.md'), '# Guide\n\n## Hello\n');
      writeFileSync(
        join(docs, 'merlon.config.json'),
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
        [CLI, 'check', '--config', 'merlon.config.json', '--docs-root', docs, '--skip-vale'],
        { encoding: 'utf-8', cwd: docs },
      );
      expect(existsSync(join(docs, '_build/compiled/.caches/refs.json'))).toBe(true);
    } finally {
      rmSync(docs, { recursive: true, force: true });
    }
  });

  it('creates cache backup on re-compile with --backup', () => {
    const docs = mkdtempSync(join(tmpdir(), 'merlon-backup-smoke-'));
    try {
      const guide = join(docs, 'g');
      mkdirSync(guide, { recursive: true });
      writeFileSync(join(guide, 'index.md'), '# Guide\n\n- [intro](introduction.md)\n');
      writeFileSync(join(guide, 'introduction.md'), '# Guide\n\n## Hello\n');
      writeFileSync(
        join(docs, 'merlon.config.json'),
        JSON.stringify({
          outputDir: '_build',
          outputFile: 'guides.md',
          compileOrder: ['g'],
          guides: [{ name: 'g', path: 'g' }],
        }),
      );

      execFileSync(
        'node',
        [CLI, 'compile', '--config', 'merlon.config.json', '--docs-root', docs],
        {
          encoding: 'utf-8',
          cwd: docs,
        },
      );
      const outPath = join(docs, '_build', 'guides.md');
      writeFileSync(outPath, 'stale monolith\n');

      execFileSync(
        'node',
        [CLI, 'compile', '--config', 'merlon.config.json', '--docs-root', docs, '--backup'],
        { encoding: 'utf-8', cwd: docs },
      );

      const backupPath = join(docs, '_build', '.caches', 'backups', '_build', 'guides.md');
      expect(existsSync(backupPath)).toBe(true);
      expect(readFileSync(backupPath, 'utf-8')).toBe('stale monolith\n');
    } finally {
      rmSync(docs, { recursive: true, force: true });
    }
  });

  it('writes default per-guide output under outputDir', () => {
    const docs = mkdtempSync(join(tmpdir(), 'merlon-outfile-'));
    try {
      const guide = join(docs, 'glossary');
      mkdirSync(guide, { recursive: true });
      writeFileSync(join(guide, 'index.md'), '# Glossary\n\n- [term](term.md)\n');
      writeFileSync(join(guide, 'term.md'), '# Glossary\n\n## Term\n');
      writeFileSync(
        join(docs, 'merlon.config.json'),
        JSON.stringify({
          outputDir: '_build/compiled',
          compileOrder: ['glossary'],
          guides: [{ name: 'glossary' }],
        }),
      );

      execFileSync(
        'node',
        [CLI, 'compile', '--config', 'merlon.config.json', '--docs-root', docs],
        {
          encoding: 'utf-8',
          cwd: docs,
        },
      );
      expect(existsSync(join(docs, '_build/compiled/guide.md'))).toBe(true);
      expect(existsSync(join(docs, 'glossary.md'))).toBe(false);
    } finally {
      rmSync(docs, { recursive: true, force: true });
    }
  });

  it('skips out-of-scope markdown for shard lint (#17)', () => {
    const docs = mkdtempSync(join(tmpdir(), 'merlon-scope-'));
    try {
      writeInScopeLintFixture(docs);
      const out = execFileSync(
        'node',
        [
          CLI,
          'check',
          '--config',
          'merlon.config.json',
          '--docs-root',
          docs,
          '--skip-vale',
          '--require-lint',
        ],
        { encoding: 'utf-8', cwd: docs },
      );
      expect(out).toContain('merlon check passed');
    } finally {
      rmSync(docs, { recursive: true, force: true });
    }
  });

  it('honors shardsGlobs override for shard lint (#17)', () => {
    const docs = mkdtempSync(join(tmpdir(), 'merlon-shards-globs-'));
    try {
      mkdirSync(join(docs, 'narrow'), { recursive: true });
      mkdirSync(join(docs, 'wide'), { recursive: true });
      writeFileSync(join(docs, 'narrow', 'index.md'), '# Narrow\n\n- [a](a.md)\n');
      writeFileSync(join(docs, 'narrow', 'a.md'), '# Narrow\n\n## A\n');
      writeFileSync(join(docs, 'wide', 'index.md'), '# Wide\n\n- [b](b.md)\n');
      writeFileSync(join(docs, 'wide', 'b.md'), 'No heading — would fail MD041 if linted.\n');
      writeFileSync(
        join(docs, 'merlon.config.json'),
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
          'merlon.config.json',
          '--docs-root',
          docs,
          '--skip-vale',
          '--require-lint',
        ],
        { encoding: 'utf-8', cwd: docs },
      );
      expect(out).toContain('merlon check passed');
    } finally {
      rmSync(docs, { recursive: true, force: true });
    }
  });

  it('lints guide shards with a relative --docs-root and no guides[].path', () => {
    // The documented setup: `--docs-root docs` from the repo root, the guide at the default
    // {docsRoot}/{name}/, no shardsGlobs. markdownlint-cli2 runs with docs/ as its cwd, so
    // a relative guide path would point at docs/docs/guide and lint 0 files.
    const repo = mkdtempSync(join(tmpdir(), 'merlon-mdlint-relroot-'));
    try {
      writeMarkdownlintFixture(repo, { shardsConfig: SHARDS_PRESET });
      const lint = runAtRepo(repo, ['lint', '--require-lint']);
      expect(lint.output).toMatch(/guide\/section\.md:\d+.*MD022/);
      expect(lint.status).toBe(1);

      const check = runAtRepo(repo, ['check', '--require-lint', '--skip-vale']);
      expect(check.output).toMatch(/markdownlint \(shards\): peer exited non-zero/);
      expect(check.status).toBe(1);
    } finally {
      rmSync(repo, { recursive: true, force: true });
    }
  });

  it('lints the monolith under the default _build outputDir with the compiled preset', () => {
    const repo = mkdtempSync(join(tmpdir(), 'merlon-mdlint-compiled-'));
    try {
      writeMarkdownlintFixture(repo, { compiledConfig: COMPILED_PRESET });
      const lint = runAtRepo(repo, ['lint', '--require-lint']);
      expect(lint.output).toMatch(/_build\/guides\.md:\d+.*MD022/);
      expect(lint.status).toBe(1);

      const check = runAtRepo(repo, ['check', '--require-lint', '--skip-vale']);
      expect(check.output).toMatch(/markdownlint \(compiled\): peer exited non-zero/);
      expect(check.status).toBe(1);
    } finally {
      rmSync(repo, { recursive: true, force: true });
    }
  });

  it('lints only the Markdown files in a guide directory', () => {
    // markdownlint-cli2 expands a bare directory to every file in it, so an image or a text
    // file beside the shards was linted as Markdown.
    const repo = mkdtempSync(join(tmpdir(), 'merlon-mdlint-md-only-'));
    try {
      writeMarkdownlintFixture(repo, { shardsConfig: SHARDS_PRESET });
      const guide = join(repo, 'docs', 'guide');
      writeFileSync(join(guide, 'section.md'), '# Guide\n\n## Hello\n\nClean.\n');
      writeFileSync(
        join(guide, 'photo.jpg'),
        Buffer.from('\xff\xd8\xff\xe0 JFIF\tdata \x00', 'latin1'),
      );
      writeFileSync(join(guide, 'notes.txt'), 'trailing space \nno final newline');
      const lint = runAtRepo(repo, ['lint', '--require-lint']);
      expect(lint.output).not.toMatch(/photo\.jpg|notes\.txt/);
      expect(lint.status).toBe(0);
    } finally {
      rmSync(repo, { recursive: true, force: true });
    }
  });

  it('lints guide shards when the checkout path has glob characters', () => {
    // markdownlint-cli2 reads each shard lint path as a glob. A glob built from a checkout
    // under `repo (copy)` or `proj {a,b}` matched nothing, so the shard pass printed
    // "Linting: 0 files" and passed, with any form of --docs-root.
    const repo = mkdtempSync(join(tmpdir(), 'merlon (copy) {a,b} '));
    try {
      writeMarkdownlintFixture(repo, { shardsConfig: SHARDS_PRESET });
      const docs = join(repo, 'docs');
      const check = ['check', '--require-lint', '--skip-vale'];
      const dot = spawnSync(
        'node',
        [CLI, ...check, '--config', 'merlon.config.json', '--docs-root', '.'],
        { encoding: 'utf-8', cwd: docs },
      );
      const runs = {
        '--docs-root docs': runAtRepo(repo, check),
        '--docs-root .': { status: dot.status, output: `${dot.stdout}${dot.stderr}` },
        'absolute --docs-root': runIn(docs, check),
      };
      for (const [form, run] of Object.entries(runs)) {
        expect(run.output, form).toMatch(/guide\/section\.md:\d+.*MD022/);
        expect(run.output, form).toMatch(/markdownlint \(shards\): peer exited non-zero/);
        expect(run.status, form).toBe(1);
      }
    } finally {
      rmSync(repo, { recursive: true, force: true });
    }
  });

  it('lints a guide directory whose name has glob characters', () => {
    const repo = mkdtempSync(join(tmpdir(), 'merlon (copy) '));
    try {
      const guide = join(repo, 'docs', 'guide (v2) {a,b}');
      mkdirSync(guide, { recursive: true });
      writeFileSync(join(guide, 'index.md'), '# Guide\n\n- [section](section.md)\n');
      writeFileSync(join(guide, 'section.md'), '# Guide\n\n## Hello\nNo blank line.\n');
      writeFileSync(
        join(repo, 'docs', 'merlon.config.json'),
        JSON.stringify({
          outputFile: 'guides.md',
          compileOrder: ['guide'],
          guides: [{ name: 'guide', path: 'guide (v2) {a,b}' }],
          lint: { markdownlint: { shardsConfig: SHARDS_PRESET } },
        }),
      );
      const lint = runAtRepo(repo, ['lint', '--require-lint']);
      expect(lint.output).toMatch(/guide \(v2\) \{a,b\}\/section\.md:\d+.*MD022/);
      expect(lint.status).toBe(1);
    } finally {
      rmSync(repo, { recursive: true, force: true });
    }
  });

  it('passes shardsGlobs to markdownlint-cli2 as written, so a negated entry excludes files', () => {
    // markdownlint-cli2 resolves each entry against its cwd, the docs root. An entry resolved
    // to an absolute path carried the checkout path into the glob, and `!guide/legacy/**`
    // became `<docs>/!guide/legacy/**`, which excludes nothing.
    const repo = mkdtempSync(join(tmpdir(), 'merlon (copy) '));
    try {
      writeMarkdownlintFixture(repo, {
        shardsConfig: SHARDS_PRESET,
        shardsGlobs: ['guide', '!guide/legacy/**'],
      });
      const legacy = join(repo, 'docs', 'guide', 'legacy');
      mkdirSync(legacy, { recursive: true });
      writeFileSync(join(legacy, 'old.md'), '# Old\n\n## Old heading\nNo blank line.\n');
      const lint = runAtRepo(repo, ['lint', '--require-lint']);
      expect(lint.output).toMatch(/guide\/section\.md:\d+.*MD022/);
      expect(lint.output).not.toMatch(/legacy\/old\.md/);
      expect(lint.status).toBe(1);
    } finally {
      rmSync(repo, { recursive: true, force: true });
    }
  });

  it('lints a guide outside a docs root that is a symlink', () => {
    // docs links to ../real/docs. markdownlint-cli2 runs in the link target, so a ../pkg/guide
    // glob resolved beside real/docs, matched nothing, and the guide's MD022 went unreported.
    const work = mkdtempSync(join(tmpdir(), 'merlon-mdlint-symlink-'));
    try {
      const real = join(work, 'real', 'docs');
      mkdirSync(join(real, 'inner'), { recursive: true });
      writeFileSync(join(real, 'inner', 'index.md'), '# Inner\n\n- [a](a.md)\n');
      writeFileSync(join(real, 'inner', 'a.md'), '# Inner\n\n## A\n\nText.\n');
      const repo = join(work, 'repo');
      const outer = join(repo, 'pkg', 'guide');
      mkdirSync(outer, { recursive: true });
      writeFileSync(join(outer, 'index.md'), '# Outer\n\n- [b](b.md)\n');
      writeFileSync(join(outer, 'b.md'), '# Outer\n\n## B\nNo blank line.\n');
      symlinkSync(join('..', 'real', 'docs'), join(repo, 'docs'), 'dir');
      writeFileSync(
        join(real, 'merlon.config.json'),
        JSON.stringify({
          outputFile: 'guides.md',
          compileOrder: ['inner', 'outer'],
          guides: [{ name: 'outer', path: '../pkg/guide' }],
          lint: { markdownlint: { shardsConfig: SHARDS_PRESET } },
        }),
      );
      const lint = runAtRepo(repo, ['lint', '--require-lint']);
      expect(lint.output).toMatch(/pkg\/guide\/b\.md:\d+.*MD022/);
      expect(lint.status).toBe(1);
    } finally {
      rmSync(work, { recursive: true, force: true });
    }
  });

  it('lints guides whose names have quote characters', () => {
    // markdownlint-cli2's brace expansion reads ', " and ` as quoting, so a glob such as
    // what's-new/**/*.{md,markdown} never expanded {md,markdown}, matched nothing and passed.
    const repo = mkdtempSync(join(tmpdir(), 'merlon-mdlint-quotes-'));
    try {
      const docs = join(repo, 'docs');
      const names = ["what's-new", 'say "hi"', 'run `x`'];
      for (const name of names) {
        mkdirSync(join(docs, name), { recursive: true });
        writeFileSync(join(docs, name, 'index.md'), '# Guide\n\n- [s](s.md)\n');
        writeFileSync(join(docs, name, 's.md'), '# Guide\n\n## S\nNo blank line.\n');
      }
      writeFileSync(
        join(docs, 'merlon.config.json'),
        JSON.stringify({
          outputFile: 'guides.md',
          compileOrder: names,
          lint: { markdownlint: { shardsConfig: SHARDS_PRESET } },
        }),
      );
      const lint = runAtRepo(repo, ['lint', '--require-lint']);
      for (const name of names) {
        expect(lint.output, name).toMatch(
          new RegExp(`${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/s\\.md:\\d+.*MD022`),
        );
      }
      expect(lint.status).toBe(1);
    } finally {
      rmSync(repo, { recursive: true, force: true });
    }
  });

  it('reports an orphan beside a nested shard of the same name with a relative --docs-root', () => {
    // The manifest links sub/a.md; a.md at the guide top level is in no manifest. A guide
    // dir built from a relative --docs-root never prefixes the absolute shard paths, so the
    // nested shard was keyed as guide/a.md and hid the orphan.
    const repo = mkdtempSync(join(tmpdir(), 'merlon-orphan-relroot-'));
    try {
      const guide = join(repo, 'docs', 'guide');
      mkdirSync(join(guide, 'sub'), { recursive: true });
      writeFileSync(join(guide, 'index.md'), '# Guide\n\n- [a](sub/a.md)\n');
      writeFileSync(join(guide, 'sub', 'a.md'), '# Guide\n\n## Nested A\n');
      writeFileSync(join(guide, 'a.md'), '# Guide\n\n## Top A\n');
      writeFileSync(
        join(repo, 'docs', 'merlon.config.json'),
        JSON.stringify({ outputFile: 'guides.md', compileOrder: ['guide'] }),
      );
      const check = runAtRepo(repo, ['check', '--skip-vale']);
      expect(check.output).toMatch(/Orphaned shard not in sections manifest: guide\/a\.md/);
      expect(check.status).toBe(1);
    } finally {
      rmSync(repo, { recursive: true, force: true });
    }
  });

  it('shows warnings in non-strict merlon prose when a vale block is set (D3)', () => {
    if (!valeInstalled()) return;

    const docs = mkdtempSync(join(tmpdir(), 'merlon-vale-prose-level-'));
    try {
      writeValeLevelFixture(docs, {}, 'The zorblax setting is on.');
      const r = runIn(docs, ['prose', '--require-vale']);
      expect(r.status).toBe(0);
      expect(r.output).toMatch(/Scratch\.Warn/);
    } finally {
      rmSync(docs, { recursive: true, force: true });
    }
  });

  it('shows only errors in merlon prose --strict and merlon check by default', () => {
    if (!valeInstalled()) return;

    const docs = mkdtempSync(join(tmpdir(), 'merlon-vale-strict-level-'));
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

  it('shows alerts at vale.strictMinAlertLevel in merlon check and fails only on errors (D3)', () => {
    if (!valeInstalled()) return;

    const docs = mkdtempSync(join(tmpdir(), 'merlon-vale-check-level-'));
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

  it('runs Vale over standalone guides in merlon check and merlon prose (D2)', () => {
    if (!valeInstalled()) return;

    const repo = mkdtempSync(join(tmpdir(), 'merlon-vale-standalone-'));
    try {
      writeStandaloneValeFixture(repo);
      const check = runAtRepo(repo, ['check', '--require-vale']);
      expect(check.output).toMatch(/AGENTS\.md[\s\S]*MerlonDocs\.UnlinkedSeeChapter/);
      expect(check.output).toMatch(/vale/);
      // The failure hint names the per-file opt-out, not only --skip-vale, including the
      // rules the Markdown section sets by name, which an empty BasedOnStyles leaves on.
      expect(check.output).toMatch(/\[\*\*\/<file>\][\s\S]*Opt a standalone guide out of Vale/);
      expect(check.output).toMatch(/after every section that matches the file/);
      expect(check.output).toMatch(/set to `NO` each rule that an earlier section names/);
      expect(check.output).not.toMatch(/runtime error/);
      expect(check.status).toBe(1);

      const prose = runAtRepo(repo, ['prose', '--require-vale']);
      expect(prose.output).toMatch(/AGENTS\.md[\s\S]*MerlonDocs\.UnlinkedSeeChapter/);
      expect(prose.status).toBe(1);
    } finally {
      rmSync(repo, { recursive: true, force: true });
    }
  });

  it('runs Vale over standalone guides when vale.scanGlobs is set (D2)', () => {
    if (!valeInstalled()) return;

    const repo = mkdtempSync(join(tmpdir(), 'merlon-vale-standalone-globs-'));
    try {
      writeStandaloneValeFixture(repo, { vale: { scanGlobs: ['guide'] } });
      const check = runAtRepo(repo, ['check', '--require-vale']);
      expect(check.output).toMatch(/AGENTS\.md[\s\S]*MerlonDocs\.UnlinkedSeeChapter/);
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
    const repo = mkdtempSync(join(tmpdir(), 'merlon-vale-standalone-relroot-'));
    try {
      writeStandaloneValeFixture(repo, {
        guidePath: false,
        shard: 'See Chapter 3 for details.',
      });
      const check = runAtRepo(repo, ['check', '--require-vale']);
      expect(check.output).toMatch(/guide\/section\.md[\s\S]*MerlonDocs\.UnlinkedSeeChapter/);
      expect(check.output).toMatch(/AGENTS\.md[\s\S]*MerlonDocs\.UnlinkedSeeChapter/);
      expect(check.status).toBe(1);

      const prose = runAtRepo(repo, ['prose', '--require-vale']);
      expect(prose.output).toMatch(/guide\/section\.md[\s\S]*MerlonDocs\.UnlinkedSeeChapter/);
      expect(prose.output).toMatch(/AGENTS\.md[\s\S]*MerlonDocs\.UnlinkedSeeChapter/);
      expect(prose.status).toBe(1);
    } finally {
      rmSync(repo, { recursive: true, force: true });
    }
  });

  it('lints a standalone guide that sits under node_modules in a scanned directory (D2)', () => {
    if (!valeInstalled()) return;

    // Vale's directory walk skips node_modules, so the file reaches Vale only by name.
    const repo = mkdtempSync(join(tmpdir(), 'merlon-vale-standalone-nodemodules-'));
    try {
      mkdirSync(join(repo, 'docs', 'guide', 'node_modules', 'pkg'), { recursive: true });
      writeStandaloneValeFixture(repo, {
        standalone: {
          'docs/guide/node_modules/pkg/README.md': '# Pkg\n\nSee Chapter 2 for details.\n',
        },
      });
      const prose = runAtRepo(repo, ['prose', '--require-vale']);
      expect(prose.output).toMatch(
        /node_modules\/pkg\/README\.md[\s\S]*MerlonDocs\.UnlinkedSeeChapter/,
      );
      expect(prose.status).toBe(1);
    } finally {
      rmSync(repo, { recursive: true, force: true });
    }
  });

  it('points a Vale runtime error at the config, not the opt-out (D2)', () => {
    if (!valeInstalled()) return;

    // Vale does not expand globs: with more than one argument, a missing path stops the run.
    const repo = mkdtempSync(join(tmpdir(), 'merlon-vale-standalone-runtime-'));
    try {
      writeStandaloneValeFixture(repo, {
        vale: { scanGlobs: ['guide/*.md'] },
        standalone: { 'AGENTS.md': '# Agents\n\nThe agent notes are clean.\n' },
      });
      const check = runAtRepo(repo, ['check', '--require-vale']);
      expect(check.output).toMatch(/Vale stopped with a runtime error/);
      expect(check.output).toMatch(/Vale does not expand globs/);
      expect(check.output).not.toMatch(/Opt a standalone guide out of Vale/);
      expect(check.status).toBe(1);
    } finally {
      rmSync(repo, { recursive: true, force: true });
    }
  });

  it('exits 1 on broken internal links by default', () => {
    const docs = mkdtempSync(join(tmpdir(), 'merlon-link-fail-'));
    try {
      mkdirSync(join(docs, 'g'), { recursive: true });
      writeFileSync(join(docs, 'g', 'index.md'), '# G\n\n- [s](s.md)\n');
      writeFileSync(join(docs, 'g', 's.md'), '# G\n\n## Hi\n\n[bad](#nope)\n');
      writeFileSync(
        join(docs, 'merlon.config.json'),
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
        [CLI, 'check', '--config', 'merlon.config.json', '--docs-root', docs, '--skip-vale'],
        { encoding: 'utf-8', cwd: docs },
      );
      expect(r.status).toBe(1);
      expect(r.stderr).toMatch(/link:/);
      expect(r.stderr).toMatch(/merlon check failed:/);
      expect(r.stderr).toMatch(/built-in links:/);
      expect(r.stderr).toMatch(/dead anchor:/);
      expect(r.stderr).toMatch(/Resolve the diagnostics above, then re-run: merlon check/);
    } finally {
      rmSync(docs, { recursive: true, force: true });
    }
  });

  it('runs the stages after a continuing failure and lists each failed step in stage order', () => {
    const docs = mkdtempSync(join(tmpdir(), 'merlon-gate-continue-'));
    try {
      writeGateFixture(docs);
      const r = runGate(docs);
      expect(r.status).toBe(1);
      const link = lineAt(r.stderr, /^link: /);
      const path = lineAt(r.stderr, /^path: .*unresolved path "src\/gone\/module\.ts"/);
      const uncaptured = lineAt(r.stderr, /^uncaptured: stray\.md$/);
      const summary = lineAt(r.stderr, /^merlon check failed:$/);
      expect(link).toBeGreaterThanOrEqual(0);
      expect(path).toBeGreaterThan(link);
      expect(uncaptured).toBeGreaterThan(path);
      expect(summary).toBeGreaterThan(uncaptured);
      const linkStep = lineAt(r.stderr, /^ {2}- built-in links: 1 issue/);
      expect(linkStep).toBeGreaterThan(summary);
      expect(lineAt(r.stderr, /^ {2}- path resolution: 1 unresolved/)).toBeGreaterThan(linkStep);
      expect(r.stderr).toMatch(/Resolve the diagnostics above, then re-run: merlon check/);
    } finally {
      rmSync(docs, { recursive: true, force: true });
    }
  });

  it('includes coverage under scan.strict alongside earlier continuing stages in the failure summary', () => {
    const docs = mkdtempSync(join(tmpdir(), 'merlon-gate-strict-'));
    try {
      writeGateFixture(docs, { strict: true });
      const r = runGate(docs);
      expect(r.status).toBe(1);
      const link = lineAt(r.stderr, /^link: /);
      const path = lineAt(r.stderr, /^path: /);
      const uncaptured = lineAt(r.stderr, /^uncaptured: stray\.md$/);
      expect(link).toBeGreaterThanOrEqual(0);
      expect(path).toBeGreaterThan(link);
      expect(uncaptured).toBeGreaterThan(path);
      expect(lineAt(r.stderr, /^merlon check failed: coverage gaps/)).toBeGreaterThan(uncaptured);
      const summary = lineAt(r.stderr, /^merlon check failed:$/);
      expect(summary).toBeGreaterThan(uncaptured);
      const linkStep = lineAt(r.stderr, /^ {2}- built-in links: 1 issue/);
      const pathStep = lineAt(r.stderr, /^ {2}- path resolution: 1 unresolved/);
      const covStep = lineAt(r.stderr, /^ {2}- coverage: 1 uncaptured, 0 missing standalone/);
      expect(linkStep).toBeGreaterThan(summary);
      expect(pathStep).toBeGreaterThan(linkStep);
      expect(covStep).toBeGreaterThan(pathStep);
      expect(r.stderr).toMatch(/Resolve the diagnostics above, then re-run: merlon check/);
    } finally {
      rmSync(docs, { recursive: true, force: true });
    }
  });

  it('stops at an orphan before compile writes an output, with no failure summary', () => {
    const docs = mkdtempSync(join(tmpdir(), 'merlon-gate-orphan-'));
    try {
      writeGateFixture(docs);
      writeFileSync(join(docs, 'g', 'orphan.md'), '# G\n\n## Orphan\n');
      const r = runGate(docs);
      expect(r.status).toBe(1);
      expect(r.stderr).toMatch(/^orphan: Orphaned shard not in sections manifest: g\/orphan\.md$/m);
      expect(r.stderr).toMatch(/^merlon check failed: 1 orphan shard\(s\)/m);
      expect(existsSync(join(docs, 'guides.md'))).toBe(false);
      expect(r.stdout).not.toMatch(/ lines\)$/m);
      expect(r.stderr).not.toMatch(/^(link|path|uncaptured): /m);
      expect(r.stderr).not.toMatch(/Resolve the diagnostics above/);
    } finally {
      rmSync(docs, { recursive: true, force: true });
    }
  });

  it('exits 0 with --warn-broken-links and prints link-warn', () => {
    const docs = mkdtempSync(join(tmpdir(), 'merlon-link-warn-'));
    try {
      mkdirSync(join(docs, 'g'), { recursive: true });
      writeFileSync(join(docs, 'g', 'index.md'), '# G\n\n- [s](s.md)\n');
      writeFileSync(join(docs, 'g', 's.md'), '# G\n\n## Hi\n\n[bad](#nope)\n');
      writeFileSync(
        join(docs, 'merlon.config.json'),
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
          'merlon.config.json',
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

  it('merlon compile exits 1 when output contains broken link', () => {
    const docs = mkdtempSync(join(tmpdir(), 'merlon-compile-link-'));
    try {
      mkdirSync(join(docs, 'g'), { recursive: true });
      writeFileSync(join(docs, 'g', 'index.md'), '# G\n\n- [s](s.md)\n');
      writeFileSync(join(docs, 'g', 's.md'), '# G\n\n## Hi\n\n[bad](#nope)\n');
      writeFileSync(
        join(docs, 'merlon.config.json'),
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
        [CLI, 'compile', '--config', 'merlon.config.json', '--docs-root', docs],
        { encoding: 'utf-8', cwd: docs },
      );
      expect(r.status).toBe(1);
      expect(r.stderr).toMatch(/link:/);
    } finally {
      rmSync(docs, { recursive: true, force: true });
    }
  });
  it('compiles and checks two monolith guides whose monolith sits in a subdirectory', () => {
    const docs = mkdtempSync(join(tmpdir(), 'merlon-monolith-guides-'));
    try {
      const files: Record<string, string> = {
        'package.json': '{}\n',
        'a/index.md': '# Guide A\n\n- [One](./one.md)\n',
        'a/one.md': '# One\n\nSee [pkg](../package.json) and [Topic](../b/topic.md).\n',
        'b/index.md': '# Guide B\n\n- [Topic](./topic.md)\n',
        'b/topic.md': '# Topic B\n\nBody.\n',
        'c/index.md': '# Guide C\n\n- [See](./see.md)\n',
        'c/see.md': '# See\n\nRead [Topic](../b/topic.md).\n',
      };
      for (const [rel, text] of Object.entries(files)) {
        mkdirSync(dirname(join(docs, rel)), { recursive: true });
        writeFileSync(join(docs, rel), text);
      }
      writeFileSync(
        join(docs, 'merlon.config.json'),
        JSON.stringify({
          outputDir: '_build',
          outputFile: 'sub/guides.md',
          compileOrder: ['a', 'b', 'c'],
          guides: [{ name: 'c', compile: { outputFile: 'c-out.md' } }],
          refs: { registryFile: 'refs.json' },
        }),
      );

      const compiled = runIn(docs, ['compile']);
      expect(compiled.output).not.toMatch(/link:/);
      expect(compiled.status).toBe(0);

      const own = readFileSync(join(docs, '_build', 'a.md'), 'utf-8');
      expect(own).toContain('See [pkg](../package.json) and [Topic](b.md#topic-b).');
      const monolith = readFileSync(join(docs, '_build', 'sub', 'guides.md'), 'utf-8');
      expect(monolith).toContain('See [pkg](../../package.json) and [Topic](#topic-b).');
      const publish = readFileSync(join(docs, '_build', 'c-out.md'), 'utf-8');
      expect(publish).toContain('Read [Topic](./sub/guides.md#topic-b).');

      const checked = runIn(docs, ['check', '--skip-vale']);
      expect(checked.output).toMatch(/merlon check passed/);
      expect(checked.status).toBe(0);
    } finally {
      rmSync(docs, { recursive: true, force: true });
    }
  });

  it("keeps a link to another monolith guide's sub-heading live in the monolith", () => {
    const docs = mkdtempSync(join(tmpdir(), 'merlon-monolith-subheading-'));
    try {
      const files: Record<string, string> = {
        'a/index.md': '# Guide A\n\n- [Setup](./setup.md)\n',
        'a/setup.md': '# Setup\n\nA setup.\n\n## Details\n\nMore.\n',
        'b/index.md': '# Guide B\n\n- [Use](./use.md)\n',
        'b/use.md': '# Use\n\nRead [the details](../a/setup.md#details).\n',
      };
      for (const [rel, text] of Object.entries(files)) {
        mkdirSync(dirname(join(docs, rel)), { recursive: true });
        writeFileSync(join(docs, rel), text);
      }
      writeFileSync(
        join(docs, 'merlon.config.json'),
        JSON.stringify({ outputFile: 'guides.md', compileOrder: ['a', 'b'] }),
      );

      const compiled = runIn(docs, ['compile']);
      expect(compiled.output).not.toMatch(/link:/);
      expect(compiled.status).toBe(0);

      const own = readFileSync(join(docs, '_build', 'b.md'), 'utf-8');
      expect(own).toContain('Read [the details](a.md#details).');
      const monolith = readFileSync(join(docs, '_build', 'guides.md'), 'utf-8');
      expect(monolith).toContain('Read [the details](#details).');
      expect(monolith).not.toContain('BROKEN LINK');

      const checked = runIn(docs, ['check', '--skip-vale']);
      expect(checked.output).toMatch(/merlon check passed/);
      expect(checked.status).toBe(0);
    } finally {
      rmSync(docs, { recursive: true, force: true });
    }
  });

  it("reports a #fragment that only another guide's compiled guide has, at its written line", () => {
    const docs = mkdtempSync(join(tmpdir(), 'merlon-own-fragment-'));
    try {
      const files: Record<string, string> = {
        'a/index.md': '# Guide A\n\n- [Intro](./intro.md)\n',
        'a/intro.md': '# Intro\n\nSee [Topic](#topic-b).\n',
        'b/index.md': '# Guide B\n\n- [Topic](./topic.md)\n',
        'b/topic.md': '# Topic B\n\nBody.\n',
      };
      for (const [rel, text] of Object.entries(files)) {
        mkdirSync(dirname(join(docs, rel)), { recursive: true });
        writeFileSync(join(docs, rel), text);
      }
      writeFileSync(
        join(docs, 'merlon.config.json'),
        JSON.stringify({
          outputFile: 'guides.md',
          compileOrder: ['a', 'b'],
          guides: [{ name: 'a', compile: { links: { markBroken: false } } }],
        }),
      );

      const checked = runIn(docs, ['check', '--skip-vale']);
      expect(checked.status).toBe(1);
      const own = readFileSync(join(docs, '_build', 'a.md'), 'utf-8').split('\n');
      const line = own.indexOf('See [Topic](#topic-b).') + 1;
      // The default banner takes the first two lines of the written file.
      expect(line).toBe(9);
      const reported = checked.output.split('\n').filter((l) => l.startsWith('link:'));
      expect(reported).toEqual([
        `link: ${join(docs, '_build', 'a.md')}:${line}: dead anchor "#topic-b" (compiled guide "a")`,
      ]);

      // The hint sends the reader to the slugs of each output, where a.md has no topic-b. It also
      // names the section ids a bare #fragment may take, which refs-list doesn't print.
      expect(checked.output).toContain(
        "→ dead anchor: change the #fragment to a slug of the file the link points at, which for a bare #fragment is the file that holds it. A bare #fragment may also point at a section's id there, such as a FIND-* id or a declared {#id}. For a compiled output, `merlon refs-list --format table` lists its slugs by file, relative to the docs root. A standalone guide's headings aren't in the registry.",
      );
      const table = runIn(docs, ['refs-list', '--format', 'table']);
      expect(table.status).toBe(0);
      expect(table.output.split('\n').filter((l) => l.startsWith('_build/a.md\t'))).toEqual([
        '_build/a.md\tguide-a\tGuide A',
        '_build/a.md\tintro\tIntro',
      ]);
      expect(table.output).toContain('_build/b.md\ttopic-b\tTopic B');
    } finally {
      rmSync(docs, { recursive: true, force: true });
    }
  });

  // The examples under "Diagnostic shape" in docs/features/link-validation.md come from this run.
  it("discards a shard's front matter and reports its lines as the shard file numbers them", () => {
    const docs = mkdtempSync(join(tmpdir(), 'merlon-front-matter-'));
    try {
      mkdirSync(join(docs, 'g'), { recursive: true });
      writeFileSync(join(docs, 'g', 'index.md'), '# G\n\n- [Spec](./spec.md)\n');
      writeFileSync(
        join(docs, 'g', 'spec.md'),
        [
          '---', // 1
          'title: Spec', // 2
          'tags: [spec, draft]', // 3
          '---', // 4
          '', // 5
          '# Spec', // 6
          '', // 7
          'See [x](#nope).', // 8
          '',
        ].join('\n'),
      );
      writeFileSync(
        join(docs, 'merlon.config.json'),
        JSON.stringify({ outputFile: 'guides.md', compileOrder: ['g'] }),
      );

      const checked = runIn(docs, ['check', '--skip-vale']);
      const compiled = readFileSync(join(docs, '_build', 'guides.md'), 'utf-8');
      expect(compiled).not.toContain('title: Spec');
      expect(compiled).not.toContain('tags: [spec, draft]');
      expect(compiled).toContain('## Spec');
      expect(checked.output).toContain(`→ shard: ${join(docs, 'g', 'spec.md')}:8 → #nope`);
    } finally {
      rmSync(docs, { recursive: true, force: true });
    }
  });

  it('prints each link issue as the link validation spec shows it', () => {
    const docs = mkdtempSync(join(tmpdir(), 'merlon-diagnostic-shape-'));
    try {
      const files: Record<string, string> = {
        'AGENTS.md': '# Agents\n\nRead [the guide](./gone.md).\n',
        'a/index.md': '# Guide A\n\n- [Intro](./intro.md)\n',
        'a/intro.md': '# Intro\n\nFirst see [x](../b/topic.md#nope).\n\nThen see [x](#nope).\n',
        'b/index.md': '# Guide B\n\n- [Topic](./topic.md)\n',
        'b/topic.md': '# Topic\n\nBody.\n',
      };
      for (const [rel, text] of Object.entries(files)) {
        mkdirSync(dirname(join(docs, rel)), { recursive: true });
        writeFileSync(join(docs, rel), text);
      }
      writeFileSync(
        join(docs, 'merlon.config.json'),
        JSON.stringify({
          outputFile: 'guides.md',
          compileOrder: ['a', 'b'],
          standaloneGuides: ['AGENTS.md'],
        }),
      );

      const checked = runIn(docs, ['check', '--skip-vale']);
      expect(checked.status).toBe(1);
      const marker = (target: string) =>
        `**BROKEN LINK:** "x" (\`${target}\`) → \`#nope\` (dead anchor in compiled guide).`;
      // Compiled outputs carry merlon-shard source tags, so each compiled issue records its shard.
      const reported = checked.output.split('\n').filter((l) => /^(link:|\s+→ shard:)/.test(l));
      expect(reported).toEqual([
        `link: ${join(docs, 'AGENTS.md')}:3: missing file "./gone.md"`,
        `link: ${join(docs, '_build', 'a.md')}:11: dead anchor "Then see ${marker('#nope')}" (compiled guide "a")`,
        `  → shard: ${join(docs, 'a', 'intro.md')}:5 → #nope`,
        `link: ${join(docs, '_build', 'a.md')}:9: dead anchor "b.md#nope" (compiled guide "a")`,
        `  → shard: ${join(docs, 'a', 'intro.md')}:3 → b.md#nope`,
        `link: ${join(docs, '_build', 'guides.md')}:9: dead anchor "First see ${marker('../b/topic.md#nope')}" (guide "a" in the monolith)`,
        `  → shard: ${join(docs, 'a', 'intro.md')}:3 → ../b/topic.md#nope`,
      ]);
    } finally {
      rmSync(docs, { recursive: true, force: true });
    }
  });

  it('summarizes warnings at the tail and writes split --errors-file, --warnings-file, and --diagnostics-dir sinks', () => {
    const docs = mkdtempSync(join(tmpdir(), 'merlon-diagnostics-sinks-'));
    try {
      mkdirSync(join(docs, 'g'), { recursive: true });
      writeFileSync(join(docs, 'g', 'index.md'), '# G\n\n- [s](s.md)\n');
      writeFileSync(
        join(docs, 'g', 's.md'),
        '# G\n\n## Hi\n\n[bad](#nope)\n\nThe module is `src/gone/module.ts`.\n',
      );
      writeFileSync(join(docs, 'stray.md'), '# Stray\n');

      // 1) Warn-only run with --diagnostics-dir: exits 0, prints merlon check warnings + merlon check passed with warning(s), writes warnings.txt and empty errors.txt.
      writeFileSync(
        join(docs, 'merlon.config.json'),
        JSON.stringify({
          outputDir: '_build',
          outputFile: 'guides.md',
          compileOrder: ['g'],
          guides: [{ name: 'g', path: 'g' }],
          refs: { registryFile: 'refs.json' },
          scan: { gitignore: false, strict: false },
          lint: {
            links: { enabled: true, severity: 'warn' },
            paths: { severity: 'warn' },
          },
        }),
      );

      const diagDir = join(docs, '_build', '.caches', 'diag-out');
      const warnRun = runIn(docs, ['check', '--skip-vale', '--diagnostics-dir', diagDir]);
      expect(warnRun.status).toBe(0);
      expect(warnRun.output).toContain('merlon check passed with warning(s) (3 step(s))');
      expect(warnRun.output).toContain('merlon check warnings (3 step(s)):');
      expect(warnRun.output).toContain('  - built-in links: 1 warning(s)');
      expect(warnRun.output).toContain('  - path resolution: 1 unresolved path(s)');
      expect(warnRun.output).toContain('  - coverage: 1 uncaptured, 0 missing standalone');
      expect(warnRun.output).toContain(`warnings_file: ${join(diagDir, 'warnings.txt')}`);
      expect(existsSync(join(diagDir, 'warnings.txt'))).toBe(true);
      expect(existsSync(join(diagDir, 'errors.txt'))).toBe(true);
      const warningsText = readFileSync(join(diagDir, 'warnings.txt'), 'utf-8');
      expect(warningsText).toContain('link-warn:');
      expect(warningsText).toContain('path-warn:');
      expect(warningsText).toContain('uncaptured: stray.md');
      expect(readFileSync(join(diagDir, 'errors.txt'), 'utf-8')).toBe('');

      // 2) Mixed errors (links) + warnings (paths + coverage) with explicit --errors-file and --warnings-file:
      writeFileSync(
        join(docs, 'merlon.config.json'),
        JSON.stringify({
          outputDir: '_build',
          outputFile: 'guides.md',
          compileOrder: ['g'],
          guides: [{ name: 'g', path: 'g' }],
          refs: { registryFile: 'refs.json' },
          scan: { gitignore: false, strict: false },
          lint: {
            links: { enabled: true, severity: 'error' },
            paths: { severity: 'warn' },
          },
        }),
      );
      const errFile = join(docs, '_build', 'custom-errors.txt');
      const warnFile = join(docs, '_build', 'custom-warnings.txt');
      const failRun = runIn(docs, [
        'check',
        '--skip-vale',
        '--errors-file',
        errFile,
        '--warnings-file',
        warnFile,
      ]);
      expect(failRun.status).toBe(1);
      const warnHeaderAt = lineAt(failRun.output, /^merlon check warnings \(2 step\(s\)\):$/);
      const failHeaderAt = lineAt(failRun.output, /^merlon check failed:$/);
      expect(warnHeaderAt).toBeGreaterThanOrEqual(0);
      expect(failHeaderAt).toBeGreaterThan(warnHeaderAt);
      expect(failRun.output).toContain(`warnings_file: ${warnFile}`);
      expect(failRun.output).toContain(`errors_file: ${errFile}`);
      expect(readFileSync(errFile, 'utf-8')).toContain('link:');
      expect(readFileSync(errFile, 'utf-8')).not.toContain('path-warn:');
      expect(readFileSync(warnFile, 'utf-8')).toContain('path-warn:');
      expect(readFileSync(warnFile, 'utf-8')).toContain('uncaptured: stray.md');
      expect(readFileSync(warnFile, 'utf-8')).not.toContain('link:');

      // 3) Config-driven diagnostics.splitFiles: true writes under {outputDir}/.caches/diagnostics
      writeFileSync(
        join(docs, 'merlon.config.json'),
        JSON.stringify({
          outputDir: '_build',
          outputFile: 'guides.md',
          compileOrder: ['g'],
          guides: [{ name: 'g', path: 'g' }],
          refs: { registryFile: 'refs.json' },
          scan: { gitignore: false, strict: false },
          diagnostics: { splitFiles: true },
        }),
      );
      const cfgRun = runIn(docs, ['check', '--skip-vale']);
      expect(cfgRun.status).toBe(1);
      expect(existsSync(join(docs, '_build', '.caches', 'diagnostics', 'errors.txt'))).toBe(true);
      expect(existsSync(join(docs, '_build', '.caches', 'diagnostics', 'warnings.txt'))).toBe(true);
    } finally {
      rmSync(docs, { recursive: true, force: true });
    }
  });
});
