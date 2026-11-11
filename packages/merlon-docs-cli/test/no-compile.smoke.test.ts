import { describe, it, expect, afterEach } from 'vitest';
import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { DEFAULT_CONFIG_VERSION } from '@merlon-docs/merlon-docs-core';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLI = join(__dirname, '../dist/cli.js');

const SENTENCE =
  'Every maintainer must run the checks before sending a patch so that reviewers spend their time on design and not on formatting issues in the thread';

/**
 * A Sphinx-built project with no Merlon files in it, and a review config kept in a separate
 * directory, as a project reviewed from outside would have.
 */
function writeProject(config: Record<string, unknown>, hook?: string) {
  const base = mkdtempSync(join(tmpdir(), 'merlon-no-compile-'));
  const docs = join(base, 'project', 'Documentation');
  const files: Record<string, string> = {
    'index.rst': 'Kernel docs\n===========\n\n.. toctree::\n\n   process/index\n',
    'process/index.rst': 'Process\n=======\n\n.. toctree::\n\n   ../RCU/index\n   coding-style\n',
    'process/coding-style.rst': `Coding style\n============\n\n13) Printing kernel messages\n----------------------------\n\n${SENTENCE}.\n`,
    'RCU/index.rst': `RCU\n===\n\nSee :ref:\`process/coding-style:13) Printing\n kernel messages\` and :ref:\`genindex\`.\n\n${SENTENCE}.\n`,
    'generated.rst': 'Generated\n=========\n',
    README: 'Read me\n=======\n\nPlain text.\n',
  };
  for (const [rel, text] of Object.entries(files)) {
    mkdirSync(dirname(join(docs, rel)), { recursive: true });
    writeFileSync(join(docs, rel), text);
  }
  const configDir = join(base, 'review');
  mkdirSync(configDir, { recursive: true });
  writeFileSync(
    join(configDir, 'merlon.config.json'),
    JSON.stringify({
      configVersion: DEFAULT_CONFIG_VERSION,
      sources: [
        { glob: '**/*.rst', format: 'rst' },
        { glob: '**/README', format: 'text' },
      ],
      roots: ['index.rst'],
      ...config,
    }),
  );
  if (hook) writeFileSync(join(configDir, 'hook.mjs'), hook);
  return { base, docs, config: join(configDir, 'merlon.config.json') };
}

function run(p: { base: string; docs: string; config: string }, ...args: string[]) {
  return spawnSync('node', [CLI, ...args, '--config', p.config, '--docs-root', p.docs], {
    encoding: 'utf-8',
    cwd: p.base,
  });
}

const made: string[] = [];
afterEach(() => {
  for (const dir of made.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe('merlon check --no-compile', () => {
  it('passes with autosectionlabel and a manifest hook, from a config outside the docs root', () => {
    const p = writeProject(
      { sphinx: { autosectionlabel: { prefixDocument: true } }, manifestHook: 'hook.mjs' },
      'export default ({ docs }) => docs.filter((d) => d.startsWith("generated"));\n',
    );
    made.push(p.base);
    const r = run(p, 'check', '--no-compile');
    expect(r.stderr).toBe('');
    expect(r.stdout).toContain('merlon check --no-compile passed: 6 document(s)');
    expect(r.status).toBe(0);
  });

  it('reports undefined refs and orphans with file and line, and exits 1', () => {
    const p = writeProject({});
    made.push(p.base);
    const r = run(p, 'check', '--no-compile');
    expect(r.status).toBe(1);
    expect(r.stderr).toContain(
      'undefined-ref: RCU/index.rst:4: label is not defined "process/coding-style:13) printing kernel messages"',
    );
    expect(r.stderr).toContain('orphan: generated.rst: no table of contents');
    expect(r.stderr).not.toContain('README');
  });

  it('reports a manifest hook that does not export a function', () => {
    const p = writeProject({ manifestHook: 'hook.mjs' }, 'export const x = 1;\n');
    made.push(p.base);
    const r = run(p, 'check', '--no-compile');
    expect(r.status).toBe(1);
    expect(r.stderr).toContain('manifestHook hook.mjs: the module has no default export function');
  });
});

describe('merlon review --no-compile', () => {
  it('reports findings with file and line, as text and as JSON', () => {
    const p = writeProject({});
    made.push(p.base);
    const text = run(p, 'review', '--no-compile');
    expect(text.status).toBe(0);
    expect(text.stdout).toContain(
      '  - RCU/index.rst:7, process/coding-style.rst:7: 26-word paragraph in 2 shards',
    );
    const json = run(p, 'review', '--no-compile', '--json');
    const findings = JSON.parse(json.stdout) as { signal: string; locations: unknown[] }[];
    expect(findings.map((f) => [f.signal, f.locations])).toEqual([
      [
        'duplicate-paragraph',
        [
          { file: 'RCU/index.rst', line: 7 },
          { file: 'process/coding-style.rst', line: 7 },
        ],
      ],
    ]);
  });
});

describe('commands that compile', () => {
  it('fail without compileOrder and point at --no-compile', () => {
    const p = writeProject({});
    made.push(p.base);
    const r = run(p, 'check');
    expect(r.status).toBe(1);
    expect(r.stderr).toContain('This config has no compileOrder');
    expect(r.stderr).toContain('--no-compile');
  });
});
