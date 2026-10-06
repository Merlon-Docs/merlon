/**
 * inlineInserts — tests driven by the spec in docs/client-core/compile-hooks/inline-inserts.md.
 * Docs first, then TDD: each describe block maps to a spec section.
 */
import { describe, it, expect } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { compileGuideResults } from '../src/compile/assemble.js';
import { applyCompileHooks, createCompileHookState } from '../src/compile/hooks.js';
import '../src/compile/hooks/builtin.js';
import {
  findInsertLinks,
  insertAnchorSlug,
  numberedInsertHeading,
  isInsertLibraryPath,
} from '../src/compile/hooks/inline-inserts.js';
import { useTmpDir, withCwd } from './helpers/tmp-dir.js';

const baseCtx = {
  guideName: 'review',
  filename: 'claim.md',
  config: { guides: [{ name: 'review' }] } as never,
};

function runInlineInserts(body: string, sourceFile: string, extra: object = {}) {
  return applyCompileHooks(body, { ...baseCtx, sourceFile, ...extra }, ['inlineInserts']);
}

describe('inlineInserts — link matching', () => {
  it('matches typed insert library paths only', () => {
    expect(isInsertLibraryPath('../diagrams/flow.md')).toBe(true);
    expect(isInsertLibraryPath('../tables/codes.md')).toBe(true);
    expect(isInsertLibraryPath('../figures/map.md')).toBe(true);
    expect(isInsertLibraryPath('../media/walkthrough.md')).toBe(true);
    expect(isInsertLibraryPath('../inserts/shared-block.md')).toBe(true);
    expect(isInsertLibraryPath('./inline-inserts.md')).toBe(false);
    expect(isInsertLibraryPath('compile-hooks/inline-inserts.md')).toBe(false);
    expect(isInsertLibraryPath('./intro.md')).toBe(false);
    expect(isInsertLibraryPath('../glossary/term.md')).toBe(false);
    expect(isInsertLibraryPath('../diagrams/flow.png')).toBe(false);
    expect(isInsertLibraryPath('https://example.com/diagrams/flow.md')).toBe(false);
  });

  it('reads the library directory and .md in any case, and needs a path after the directory', () => {
    expect(isInsertLibraryPath('../../Diagrams/Flow.MD')).toBe(true);
    expect(isInsertLibraryPath('./diagram/flow.md')).toBe(true);
    expect(isInsertLibraryPath('TABLES/codes.Md')).toBe(true);
    expect(isInsertLibraryPath('diagrams/flow.md#part.md')).toBe(true);
    expect(isInsertLibraryPath('medias/clip.md')).toBe(false);
    expect(isInsertLibraryPath('./../diagrams/flow.md')).toBe(false);
    expect(isInsertLibraryPath('docs/diagrams/flow.md')).toBe(false);
    expect(isInsertLibraryPath('diagrams/ flow.md')).toBe(false);
    expect(isInsertLibraryPath('diagrams/#flow.md')).toBe(false);
  });

  it('gives the span, label and target of each insert link in a body', () => {
    const body = [
      'See [Flow](../../diagrams/flow.md#top).\r',
      'And [](./Tables/codes.MD) or [x](docs/diagrams/a.md).\r',
      '[Media\r\nclip](media/clip.md)[y](figures/b.md#)',
    ].join('\n');
    const links = findInsertLinks(body);
    expect(links).toEqual([
      { start: 4, end: 38, label: 'Flow', relPath: '../../diagrams/flow.md#top' },
      { start: 45, end: 66, label: '', relPath: './Tables/codes.MD' },
      { start: 96, end: 124, label: 'Media\r\nclip', relPath: 'media/clip.md' },
    ]);
    expect(links.map(({ start, end }) => body.slice(start, end))).toEqual([
      '[Flow](../../diagrams/flow.md#top)',
      '[](./Tables/codes.MD)',
      '[Media\r\nclip](media/clip.md)',
    ]);
  });

  // Unlike the link passes, the hook reads fenced code and code spans, as the spec says.
  describe('in fenced code and code spans', () => {
    const work = useTmpDir('mdcp-inserts-');
    const span = 'Inline: `[Flow](./diagrams/flow.md)` here.';
    const fence = ['~~~md', '[Flow](./diagrams/flow.md)', '~~~'].join('\n');

    function writeFlow(): string {
      const guideDir = join(work.path, 'review');
      mkdirSync(join(guideDir, 'diagrams'), { recursive: true });
      writeFileSync(join(guideDir, 'diagrams', 'flow.md'), '| A | B |\n|---|---|\n| 1 | 2 |\n');
      return join(guideDir, 'claim.md');
    }

    it('inlines the insert in a fence of tildes and back-links it from a code span', () => {
      const out = runInlineInserts(`${fence}\n\n${span}`, writeFlow());
      expect(out).toBe(
        '~~~md\n\n\n#### Diagram 1. Flow\n\n| A | B |\n|---|---|\n| 1 | 2 |\n\n\n~~~\n\n' +
          'Inline: `[Flow](#diagram-1-flow)` here.',
      );
    });

    it('inlines the insert in a code span and back-links it from a fence of tildes', () => {
      const out = runInlineInserts(`${span}\n\n${fence}`, writeFlow());
      expect(out).toBe(
        'Inline: `\n\n#### Diagram 1. Flow\n\n| A | B |\n|---|---|\n| 1 | 2 |\n\n` here.\n\n' +
          '~~~md\n[Flow](#diagram-1-flow)\n~~~',
      );
    });
  });
});

describe('inlineInserts — heading and slug helpers', () => {
  it('formats numbered captions and GFM slugs per kind', () => {
    expect(numberedInsertHeading('/docs/diagrams/request-flow.md', 'Request flow', 1)).toBe(
      'Diagram 1. Request flow',
    );
    expect(insertAnchorSlug('/docs/diagrams/request-flow.md', 'Request flow', 1)).toBe(
      'diagram-1-request-flow',
    );
    expect(numberedInsertHeading('/docs/tables/status-codes.md', 'Status codes', 2)).toBe(
      'Table 2. Status codes',
    );
    expect(numberedInsertHeading('/docs/figures/component-map.md', '', 1)).toBe(
      'Figure 1. Component Map',
    );
    expect(numberedInsertHeading('/docs/media/walkthrough.md', 'Walkthrough', 1)).toBe(
      'Media 1. Walkthrough',
    );
    expect(numberedInsertHeading('/docs/misc/other.md', 'Other', 1)).toBe('Other');
  });
});

describe('inlineInserts — exclusions', () => {
  const work = useTmpDir('mdcp-inserts-');

  it('leaves regular shard links unchanged', () => {
    const guideDir = join(work.path, 'review');
    mkdirSync(guideDir, { recursive: true });
    writeFileSync(join(guideDir, 'intro.md'), '# Intro\n');
    const body = 'Read [intro](./intro.md) and [overview](../overview/index.md).';
    expect(runInlineInserts(body, join(guideDir, 'claim.md'))).toBe(body);
  });

  it('leaves external https URLs unchanged', () => {
    const guideDir = join(work.path, 'review');
    mkdirSync(guideDir, { recursive: true });
    const body = 'See [remote](https://example.com/diagrams/flow.md).';
    expect(runInlineInserts(body, join(guideDir, 'claim.md'))).toBe(body);
  });

  it('leaves direct binary asset links unchanged', () => {
    const guideDir = join(work.path, 'review');
    mkdirSync(guideDir, { recursive: true });
    const body = [
      'See [screenshot](../figures/architecture.png).',
      'Watch [demo](../figures/walkthrough.mp4).',
    ].join('\n');
    expect(runInlineInserts(body, join(guideDir, 'claim.md'))).toBe(body);
  });

  it('leaves missing insert files unchanged', () => {
    const guideDir = join(work.path, 'review');
    mkdirSync(guideDir, { recursive: true });
    const body = 'See [missing](../diagrams/missing.md) for details.';
    expect(runInlineInserts(body, join(guideDir, 'claim.md'))).toBe(body);
  });

  it('does nothing when hook is not configured', () => {
    const guideDir = join(work.path, 'review');
    mkdirSync(join(guideDir, 'diagrams'), { recursive: true });
    writeFileSync(join(guideDir, 'diagrams', 'flow.md'), '| A |\n');
    const body = '[flow](./diagrams/flow.md)';
    const out = applyCompileHooks(body, { ...baseCtx, sourceFile: join(guideDir, 'claim.md') }, []);
    expect(out).toBe(body);
  });
});

describe('inlineInserts — first inline', () => {
  const work = useTmpDir('mdcp-inserts-');

  it('inlines diagram from shared library with numbered GFM heading', () => {
    const guideDir = join(work.path, 'review');
    mkdirSync(guideDir, { recursive: true });
    mkdirSync(join(work.path, 'diagrams'), { recursive: true });
    writeFileSync(join(work.path, 'diagrams', 'flow.md'), '| A | B |\n|---|---|\n| 1 | 2 |\n');
    const out = runInlineInserts('See [flow](../diagrams/flow.md).', join(guideDir, 'claim.md'));
    expect(out).toContain('#### Diagram 1. flow');
    expect(out).not.toMatch(/<[^>]+>/);
    expect(out).toContain('| A | B |');
    expect(out).not.toContain('](../diagrams/flow.md)');
  });

  it('inlines table and figure links in one shard', () => {
    const guideDir = join(work.path, 'review');
    mkdirSync(guideDir, { recursive: true });
    mkdirSync(join(work.path, 'tables'), { recursive: true });
    mkdirSync(join(work.path, 'figures'), { recursive: true });
    writeFileSync(
      join(work.path, 'tables', 'codes.md'),
      '| Code | Meaning |\n|---|---|\n| 200 | OK |\n',
    );
    writeFileSync(
      join(work.path, 'figures', 'map.md'),
      '| Node | Role |\n|---|---|\n| API | Gateway |\n',
    );
    const body = ['[Codes](../tables/codes.md)', '[Map](../figures/map.md)'].join('\n');
    const out = runInlineInserts(body, join(guideDir, 'catalog.md'));
    expect(out).toContain('#### Table 1. Codes');
    expect(out).toContain('#### Figure 1. Map');
  });

  it('inlines media/ library path with video embed', () => {
    const guideDir = join(work.path, 'review');
    mkdirSync(guideDir, { recursive: true });
    mkdirSync(join(work.path, 'media'), { recursive: true });
    writeFileSync(
      join(work.path, 'media', 'walkthrough.md'),
      '<video src="./walkthrough.mp4" controls></video>\n',
    );
    const out = runInlineInserts(
      '[Walkthrough](../media/walkthrough.md)',
      join(guideDir, 'claim.md'),
    );
    expect(out).toContain('#### Media 1. Walkthrough');
    expect(out).toContain('<video src="./walkthrough.mp4" controls></video>');
  });

  it('inlines inserts/ generic library path', () => {
    const guideDir = join(work.path, 'review');
    mkdirSync(guideDir, { recursive: true });
    mkdirSync(join(work.path, 'inserts'), { recursive: true });
    writeFileSync(join(work.path, 'inserts', 'callout.md'), '> Important note.\n');
    const out = runInlineInserts('[Note](../inserts/callout.md)', join(guideDir, 'claim.md'));
    expect(out).toContain('#### Insert 1. Note');
    expect(out).toContain('> Important note.');
  });

  it('inlines figure shard with embedded image markdown', () => {
    const guideDir = join(work.path, 'review');
    mkdirSync(guideDir, { recursive: true });
    mkdirSync(join(work.path, 'figures'), { recursive: true });
    writeFileSync(
      join(work.path, 'figures', 'screenshot.md'),
      '![Architecture overview](./architecture.png)\n',
    );
    const out = runInlineInserts(
      '[Screenshot](../figures/screenshot.md)',
      join(guideDir, 'claim.md'),
    );
    expect(out).toContain('#### Figure 1. Screenshot');
    expect(out).toContain('![Architecture overview](./architecture.png)');
  });

  it('inlines catalog table cell links', () => {
    const guideDir = join(work.path, 'review');
    mkdirSync(join(guideDir, 'diagrams'), { recursive: true });
    writeFileSync(
      join(guideDir, 'diagrams', 'request-flow.md'),
      '| Step | Actor |\n|------|-------|\n| 1 | Client |\n',
    );
    const table = [
      '| Diagram | Summary |',
      '| --- | --- |',
      '| [Request flow](./diagrams/request-flow.md) | Main path |',
    ].join('\n');
    const out = runInlineInserts(table, join(guideDir, 'catalog.md'));
    expect(out).toContain('| Step | Actor |');
    expect(out).not.toContain('](./diagrams/request-flow.md)');
  });

  it('inlines links on CRLF lines and in upper case, but not one with an empty #fragment', () => {
    const guideDir = join(work.path, 'review');
    mkdirSync(join(work.path, 'diagrams'), { recursive: true });
    mkdirSync(join(work.path, 'Tables'), { recursive: true });
    writeFileSync(join(work.path, 'diagrams', 'flow.md'), '| Step | Actor |\n');
    writeFileSync(join(work.path, 'Tables', 'codes.MD'), '| Code | Meaning |\n');
    const body = [
      'See [Flow](../diagrams/flow.md#top).\r',
      'See [Codes](../Tables/codes.MD).\r',
      'Again [Flow](../diagrams/flow.md#).\r',
      '',
    ].join('\n');
    const out = runInlineInserts(body, join(guideDir, 'claim.md'));
    expect(out).toContain('#### Diagram 1. Flow');
    expect(out).toContain('#### Table 1. Codes');
    expect(out).toContain('Again [Flow](../diagrams/flow.md#).\r');
  });

  it('ignores #fragment for file lookup', () => {
    const guideDir = join(work.path, 'review');
    mkdirSync(join(work.path, 'diagrams'), { recursive: true });
    writeFileSync(
      join(work.path, 'diagrams', 'flow.md'),
      '| Step | Actor |\n|---|---|\n| 1 | x |\n',
    );
    const out = runInlineInserts('[Flow](../diagrams/flow.md#step-1)', join(guideDir, 'claim.md'));
    expect(out).toContain('#### Diagram 1. Flow');
    expect(out).toContain('| Step | Actor |');
  });
});

describe('inlineInserts — numbered captions', () => {
  const work = useTmpDir('mdcp-inserts-');

  it('increments diagram, table, and figure counters independently', () => {
    const guideDir = join(work.path, 'review');
    mkdirSync(guideDir, { recursive: true });
    mkdirSync(join(work.path, 'diagrams'), { recursive: true });
    mkdirSync(join(work.path, 'tables'), { recursive: true });
    mkdirSync(join(work.path, 'figures'), { recursive: true });
    writeFileSync(join(work.path, 'diagrams', 'a.md'), 'Diagram A.\n');
    writeFileSync(join(work.path, 'diagrams', 'b.md'), 'Diagram B.\n');
    writeFileSync(join(work.path, 'tables', 'a.md'), '| A |\n|---|---|\n| 1 |\n');
    writeFileSync(join(work.path, 'figures', 'a.md'), 'Figure A.\n');
    const body = [
      '[D1](../diagrams/a.md)',
      '[T1](../tables/a.md)',
      '[F1](../figures/a.md)',
      '[D2](../diagrams/b.md)',
    ].join('\n');
    const out = runInlineInserts(body, join(guideDir, 'claim.md'));
    expect(out).toContain('#### Diagram 1. D1');
    expect(out).toContain('#### Diagram 2. D2');
    expect(out).toContain('#### Table 1. T1');
    expect(out).toContain('#### Figure 1. F1');
  });

  it('continues table numbering across shards', () => {
    const guideDir = join(work.path, 'review');
    mkdirSync(join(work.path, 'tables'), { recursive: true });
    writeFileSync(join(work.path, 'tables', 'one.md'), '| 1 |\n');
    writeFileSync(join(work.path, 'tables', 'two.md'), '| 2 |\n');
    const hookState = createCompileHookState();
    applyCompileHooks(
      '[One](../tables/one.md)',
      {
        ...baseCtx,
        hookState,
        sourceFile: join(guideDir, '01.md'),
      },
      ['inlineInserts'],
    );
    const second = applyCompileHooks(
      '[Two](../tables/two.md)',
      {
        ...baseCtx,
        hookState,
        sourceFile: join(guideDir, '02.md'),
      },
      ['inlineInserts'],
    );
    expect(second).toContain('#### Table 2. Two');
  });

  it('assigns Table 3 when two tables preceded by a diagram', () => {
    const guideDir = join(work.path, 'review');
    mkdirSync(join(work.path, 'diagrams'), { recursive: true });
    mkdirSync(join(work.path, 'tables'), { recursive: true });
    for (let i = 1; i <= 3; i++) {
      writeFileSync(join(work.path, 'tables', `t${i}.md`), `| ${i} |\n`);
    }
    writeFileSync(join(work.path, 'diagrams', 'd1.md'), 'Diagram.\n');
    const body = [
      '[D](../diagrams/d1.md)',
      '[T1](../tables/t1.md)',
      '[T2](../tables/t2.md)',
      '[T3](../tables/t3.md)',
    ].join('\n');
    const out = runInlineInserts(body, join(guideDir, 'claim.md'));
    expect(out).toContain('#### Diagram 1.');
    expect(out).toContain('#### Table 1.');
    expect(out).toContain('#### Table 2.');
    expect(out).toContain('#### Table 3. T3');
  });

  it('resets counters per guide compile', () => {
    mkdirSync(join(work.path, 'diagrams'), { recursive: true });
    writeFileSync(join(work.path, 'diagrams', 'shared.md'), 'Shared.\n');
    const body = '[Shared](../diagrams/shared.md)';
    const guideA = join(work.path, 'guide-a');
    const guideB = join(work.path, 'guide-b');
    mkdirSync(guideA, { recursive: true });
    mkdirSync(guideB, { recursive: true });
    const outA = runInlineInserts(body, join(guideA, 'claim.md'));
    const outB = runInlineInserts(body, join(guideB, 'claim.md'));
    expect(outA).toContain('#### Diagram 1.');
    expect(outB).toContain('#### Diagram 1.');
  });
});

describe('inlineInserts — deduplication', () => {
  const work = useTmpDir('mdcp-inserts-');

  it('back-links repeat references in the same shard', () => {
    const guideDir = join(work.path, 'review');
    mkdirSync(join(guideDir, 'diagrams'), { recursive: true });
    writeFileSync(
      join(guideDir, 'diagrams', 'request-flow.md'),
      '| Step | Actor |\n|------|-------|\n| 1 | Client |\n',
    );
    const body = [
      'First: [Request flow](./diagrams/request-flow.md).',
      'Again: [Request flow](./diagrams/request-flow.md).',
    ].join('\n');
    const out = runInlineInserts(body, join(guideDir, 'claim.md'));
    expect(out.match(/\| Step \| Actor \|/g)?.length).toBe(1);
    expect(out).toContain('[Request flow](#diagram-1-request-flow)');
  });

  it('back-links repeat references across shards', () => {
    const guideDir = join(work.path, 'review');
    mkdirSync(join(guideDir, 'diagrams'), { recursive: true });
    writeFileSync(
      join(guideDir, 'diagrams', 'request-flow.md'),
      '| Step | Actor |\n|------|-------|\n| 1 | Client |\n',
    );
    const hookState = createCompileHookState();
    const ctx = { hookState };
    const firstOut = applyCompileHooks(
      '[Request flow](./diagrams/request-flow.md)',
      { ...baseCtx, ...ctx, sourceFile: join(guideDir, '01-catalog.md') },
      ['inlineInserts'],
    );
    const secondOut = applyCompileHooks(
      'See again [Request flow](./diagrams/request-flow.md).',
      { ...baseCtx, ...ctx, sourceFile: join(guideDir, '02-claim.md') },
      ['inlineInserts'],
    );
    expect(firstOut).toContain('| Step | Actor |');
    expect(secondOut).toBe('See again [Request flow](#diagram-1-request-flow).');
  });

  it('treats path spelling aliases as one insert', () => {
    const guideDir = join(work.path, 'review');
    mkdirSync(join(guideDir, 'diagrams'), { recursive: true });
    writeFileSync(join(guideDir, 'diagrams', 'flow.md'), '| A | B |\n|---|---|\n| 1 | 2 |\n');
    const body = ['[First](diagrams/flow.md)', '[Second](./diagrams/flow.md)'].join('\n');
    const out = runInlineInserts(body, join(guideDir, 'claim.md'));
    expect(out.match(/\| A \| B \|/g)?.length).toBe(1);
    expect(out).toContain('[Second](#diagram-1-first)');
  });

  it('treats path with and without #fragment as one insert', () => {
    const guideDir = join(work.path, 'review');
    mkdirSync(join(work.path, 'diagrams'), { recursive: true });
    writeFileSync(join(work.path, 'diagrams', 'flow.md'), '| A | B |\n|---|---|\n| 1 | 2 |\n');
    const body = ['[First](../diagrams/flow.md)', '[Second](../diagrams/flow.md#detail)'].join(
      '\n',
    );
    const out = runInlineInserts(body, join(guideDir, 'claim.md'));
    expect(out.match(/\| A \| B \|/g)?.length).toBe(1);
    expect(out).toContain('[Second](#diagram-1-first)');
  });

  it('uses default back-link label when empty', () => {
    const guideDir = join(work.path, 'review');
    mkdirSync(join(guideDir, 'diagrams'), { recursive: true });
    writeFileSync(join(guideDir, 'diagrams', 'flow.md'), '| A |\n|---|---|\n| 1 |\n');
    const body = ['[Flow](./diagrams/flow.md)', '[](./diagrams/flow.md)'].join('\n');
    const out = runInlineInserts(body, join(guideDir, 'claim.md'));
    expect(out).toContain('[See insert](#diagram-1-flow)');
  });

  it('keeps separate headings for same basename in different libraries', () => {
    const guideDir = join(work.path, 'review');
    mkdirSync(join(work.path, 'diagrams'), { recursive: true });
    mkdirSync(join(work.path, 'tables'), { recursive: true });
    writeFileSync(join(work.path, 'diagrams', 'overview.md'), 'Diagram overview.\n');
    writeFileSync(
      join(work.path, 'tables', 'overview.md'),
      '| Col | Val |\n|---|---|\n| a | 1 |\n',
    );
    const body = [
      '[Diagram overview](../diagrams/overview.md)',
      '[Table overview](../tables/overview.md)',
    ].join('\n');
    const out = runInlineInserts(body, join(guideDir, 'claim.md'));
    expect(out).toContain('#### Diagram 1. overview');
    expect(out).toContain('#### Table 1. overview');
  });

  it('inlines found inserts and leaves missing or non-insert links unchanged', () => {
    const guideDir = join(work.path, 'review');
    mkdirSync(join(work.path, 'tables'), { recursive: true });
    writeFileSync(
      join(work.path, 'tables', 'codes.md'),
      '| Code | Meaning |\n|---|---|\n| 200 | OK |\n',
    );
    const body = [
      '[Codes](../tables/codes.md)',
      '[Missing](../tables/missing.md)',
      '[Intro](./intro.md)',
    ].join('\n');
    const out = runInlineInserts(body, join(guideDir, 'claim.md'));
    expect(out).toContain('#### Table 1. Codes');
    expect(out).toContain('[Missing](../tables/missing.md)');
    expect(out).toContain('[Intro](./intro.md)');
  });
});

describe('inlineInserts — config', () => {
  const work = useTmpDir('mdcp-inserts-');

  it('resolves short paths via hooksConfig.inlineInserts.searchRoots', () => {
    const guideDir = join(work.path, 'review', 'technical');
    mkdirSync(guideDir, { recursive: true });
    // The root holds the diagrams/ library, and the link's whole path resolves against it.
    mkdirSync(join(work.path, 'shared', 'diagrams'), { recursive: true });
    writeFileSync(
      join(work.path, 'shared', 'diagrams', 'shared-flow.md'),
      '| Shared | Table |\n|---|---|\n| x | y |\n',
    );
    withCwd(work.path, () => {
      const out = applyCompileHooks(
        '[shared flow](diagrams/shared-flow.md)',
        {
          guideName: 'review',
          filename: 'claim.md',
          config: {
            guides: [
              {
                name: 'review',
                compile: { hooksConfig: { inlineInserts: { searchRoots: ['shared'] } } },
              },
            ],
          } as never,
          sourceFile: join(guideDir, 'claim.md'),
        },
        ['inlineInserts'],
      );
      expect(out).toContain('| Shared | Table |');
    });
  });

  it('reads searchRoots for a guide whose name differs from its directory', () => {
    mkdirSync(join(work.path, 'review'), { recursive: true });
    mkdirSync(join(work.path, 'lib', 'diagrams'), { recursive: true });
    writeFileSync(join(work.path, 'review', 'index.md'), '# Review\n\n- [A](./a.md)\n');
    writeFileSync(join(work.path, 'review', 'a.md'), '# A\n\nSee [Flow](diagrams/flow.md).\n');
    writeFileSync(join(work.path, 'lib', 'diagrams', 'flow.md'), 'Flow body.\n');
    const guides = [
      {
        name: 'architecture-review',
        path: 'review',
        compile: {
          outputFile: 'architecture-review.md',
          hooksConfig: { inlineInserts: { searchRoots: ['lib'] } },
        },
      },
    ];
    withCwd(work.path, () => {
      const [result] = compileGuideResults({
        guidesRoot: work.path,
        docsRoot: work.path,
        compileOrder: ['architecture-review'],
        guides,
        config: { compileOrder: ['architecture-review'], guides } as never,
      });
      expect(result.text).toContain('#### Diagram 1. Flow');
      expect(result.text).toContain('Flow body.');
    });
  });
});

describe('inlineInserts — compile output', () => {
  const work = useTmpDir('mdcp-inserts-');

  it('matches catalog + prose back-link shape', () => {
    const guideDir = join(work.path, 'review');
    mkdirSync(join(work.path, 'diagrams'), { recursive: true });
    writeFileSync(
      join(work.path, 'diagrams', 'request-flow.md'),
      '| Step | Actor |\n| --- | --- |\n| 1 | Client |\n',
    );
    const body = [
      '| Insert | Summary |',
      '| --- | --- |',
      '| [Request flow](../diagrams/request-flow.md) | Client path |',
      '',
      'See [Request flow](../diagrams/request-flow.md) again in prose.',
    ].join('\n');
    const out = runInlineInserts(body, join(guideDir, 'catalog.md'));
    expect(out).toContain('#### Diagram 1. Request flow');
    expect(out).toContain('| Step | Actor |');
    expect(out).toContain('[Request flow](#diagram-1-request-flow) again in prose');
    expect(out.match(/\| Step \| Actor \|/g)?.length).toBe(1);
    expect(out).not.toMatch(/<[^>]+>/);
  });
});
