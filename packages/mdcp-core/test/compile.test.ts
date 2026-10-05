import { describe, it, expect } from 'vitest';
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { slug as githubSlug } from 'github-slugger';
import {
  compileGuides,
  compileGuideResults,
  assembleGuide,
  writeCompiledGuides,
  type CompileOptionsInput,
} from '../src/compile/assemble.js';
import { resolveCompileHooks } from '../src/config/resolve-compile-hooks.js';
import { buildSlugRegistry } from '../src/refs/slugs.js';
import { withTmpDir } from './helpers/tmp-dir.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '../../..');
const FIXTURE = join(REPO_ROOT, 'examples/sample-guides');
const SAMPLE_CONFIG = 'examples/sample-guides/mdcp.config.json';
const COMPILE_ORDER = ['overview', 'admin-guide', 'developer-guide'];
const CLI = join(__dirname, '../../mdcp-cli/dist/cli.js');

describe('compileGuides', () => {
  it('produces compiled output from sample fixture', () => {
    const output = compileGuides({
      guidesRoot: FIXTURE,
      compileOrder: COMPILE_ORDER,
      guides: [
        {
          name: 'overview',
          splitLevel: 2,
          compile: {
            preambleSection: 'about-this-guide.md',
            manifest: 'index.md',
            stripAnchors: true,
          },
        },
      ],
    });

    expect(output).toContain('# Documentation Overview');
    expect(output).toContain('Admin Chapter 1');
    expect(output).toContain('Dev Chapter 1');
    expect(output.split('\n').length).toBeGreaterThan(20);
  });

  it('includes guide H1 headings', () => {
    const output = compileGuides({
      guidesRoot: FIXTURE,
      compileOrder: ['admin-guide'],
    });
    expect(output).toMatch(/^# Admin Guide/m);
    expect(output).toContain('Admin Chapter 1');
  });

  it('keeps a single document H1 when merging multiple guides', () => {
    const output = compileGuides({
      guidesRoot: FIXTURE,
      compileOrder: COMPILE_ORDER,
      config: { outputFile: 'guides.md', outputDir: '.', compileOrder: COMPILE_ORDER },
    });
    const h1Count = output.split('\n').filter((line) => /^# /.test(line)).length;
    expect(h1Count).toBe(1);
    expect(output).toMatch(/^# Documentation Overview/m);
    expect(output).toContain('## Admin Guide');
    expect(output).toContain('## Coverage and where to look');
  });

  it('inserts a blank line after injected compile title before first section', () => {
    withTmpDir('mdcp-compile-title-', (work) => {
      writeFileSync(join(work, 'index.md'), '# Guide\n\n- [Section](section.md)\n');
      writeFileSync(join(work, 'section.md'), '### Product surfaces\n\nContent.\n');

      const out = assembleGuide(work, {
        title: 'Compound glossary',
        manifest: 'index.md',
      });

      expect(out).toMatch(/^## Compound glossary\n\n#### Product surfaces/m);
      expect(out).not.toMatch(/^## Compound glossary#{2,}/m);
    });
  });

  it('strips explicit anchor markers from compiled output', () => {
    withTmpDir('mdcp-compile-', (work) => {
      writeFileSync(join(work, 'index.md'), '# Example\n\n- [Section](section.md)\n');
      writeFileSync(join(work, 'section.md'), '## Term {#my-anchor}\n\nDefinition.\n');

      const out = assembleGuide(work, {
        title: 'Example glossary',
        manifest: 'index.md',
      });
      expect(out).not.toMatch(/\{#[a-z0-9-]+\}/i);
    });
  });

  it('keeps brace ids inside code when the default hooks strip anchors', () => {
    withTmpDir('mdcp-compile-', (work) => {
      writeFileSync(join(work, 'index.md'), '# Example\n\n- [Section](section.md)\n');
      writeFileSync(
        join(work, 'section.md'),
        [
          '## Term {#my-anchor}',
          '',
          'Write `## Heading {#custom-id}` or `{#custom-id}` after a heading.',
          '',
          '```markdown',
          '::: {#note}',
          '## Title {#gone}',
          '```',
          '',
        ].join('\n'),
      );

      const out = assembleGuide(work, {
        manifest: 'index.md',
        hooks: resolveCompileHooks(undefined),
        stripAnchors: true,
      });
      expect(out).not.toContain('{#my-anchor}');
      expect(out).toContain('Write `## Heading {#custom-id}` or `{#custom-id}` after a heading.');
      // A heading line loses its markers even inside a fence; the fence's other lines keep theirs.
      expect(out).toContain('```markdown\n::: {#note}\n## Title\n```');
    });
  });

  it('gives a heading that quotes {#id} in code the slug its links and refs use', () => {
    withTmpDir('mdcp-compile-', (work) => {
      const guideDir = join(work, 'guide');
      mkdirSync(guideDir, { recursive: true });
      writeFileSync(join(guideDir, 'index.md'), '# Guide\n\n- [One](one.md)\n- [Two](two.md)\n');
      writeFileSync(join(guideDir, 'one.md'), '# One\n\nSee [the syntax](./two.md).\n');
      writeFileSync(join(guideDir, 'two.md'), '# The `{#id}` syntax\n\nText.\n');

      const out = compileGuides({ guidesRoot: work, compileOrder: ['guide'] });
      const heading = out.split('\n').find((line) => line.startsWith('## The '));
      expect(heading).toBeDefined();
      // GitHub drops the code span's backticks from the anchor, and so does github-slugger.
      const githubAnchor = githubSlug(heading!.replace(/^#+ /, ''));

      const fragment = /\[the syntax\]\(#([^)]*)\)/.exec(out)?.[1];
      expect(fragment).toBe(githubAnchor);
      const refs = buildSlugRegistry(out);
      expect(refs.headings.map((h) => h.slug)).toContain(githubAnchor);
    });
  });

  it('strips the marker from a heading after a list item leaves its fence unclosed', () => {
    withTmpDir('mdcp-compile-', (work) => {
      const guideDir = join(work, 'guide');
      mkdirSync(guideDir, { recursive: true });
      writeFileSync(
        join(guideDir, 'index.md'),
        '# Guide\n\n- [Setup](setup.md)\n- [Usage](usage.md)\n',
      );
      writeFileSync(
        join(guideDir, 'setup.md'),
        '# Setup\n\n- Install the tool:\n\n  ```bash\n  npm i -g mdcp\n\n## Next step {#next}\n\nText.\n',
      );
      writeFileSync(
        join(guideDir, 'usage.md'),
        '# Usage\n\nSee [next step](./setup.md#next-step).\n',
      );

      const out = compileGuides({ guidesRoot: work, compileOrder: ['guide'] });
      const heading = out.split('\n').find((line) => line.startsWith('### Next step'));
      expect(heading).toBe('### Next step');
      const githubAnchor = githubSlug(heading!.replace(/^#+ /, ''));
      expect(/\[next step\]\(#([^)]*)\)/.exec(out)?.[1]).toBe(githubAnchor);
      expect(buildSlugRegistry(out).headings.map((h) => h.slug)).toContain(githubAnchor);
    });
  });

  it('strips heading markers after a nested fence example and after an indented fence line', () => {
    withTmpDir('mdcp-compile-', (work) => {
      const guideDir = join(work, 'guide');
      mkdirSync(guideDir, { recursive: true });
      writeFileSync(
        join(guideDir, 'index.md'),
        '# Guide\n\n- [Setup](setup.md)\n- [Usage](usage.md)\n',
      );
      writeFileSync(
        join(guideDir, 'setup.md'),
        [
          '# Setup',
          '',
          '```markdown',
          '1.  Install:',
          '',
          '    ```bash',
          '    npm i -g mdcp {#keep}',
          '    ```',
          '```',
          '',
          '## Next step {#next}',
          '',
          'To open a fence, type:',
          '',
          '    ```bash',
          '',
          '## Last step {#last}',
          '',
        ].join('\n'),
      );
      writeFileSync(
        join(guideDir, 'usage.md'),
        '# Usage\n\nSee [next step](./setup.md#next-step) and [last step](./setup.md#last-step).\n',
      );

      const out = compileGuides({ guidesRoot: work, compileOrder: ['guide'] });
      expect(out).toContain('    npm i -g mdcp {#keep}');
      const slugs = buildSlugRegistry(out).headings.map((h) => h.slug);
      for (const [text, title] of [
        ['next step', 'Next step'],
        ['last step', 'Last step'],
      ]) {
        expect(out.split('\n').find((line) => line.startsWith('### ' + title))).toBe(
          '### ' + title,
        );
        const githubAnchor = githubSlug(title);
        expect(new RegExp(`\\[${text}\\]\\(#([^)]*)\\)`).exec(out)?.[1]).toBe(githubAnchor);
        expect(slugs).toContain(githubAnchor);
      }
    });
  });

  it('lands each rewritten section link on the heading that opens the section', () => {
    withTmpDir('mdcp-section-slugs-', (work) => {
      const guideDir = join(work, 'guide');
      mkdirSync(guideDir, { recursive: true });
      writeFileSync(
        join(guideDir, 'index.md'),
        '# Setup\n\n- [Overview](overview.md)\n- [Install](install.md)\n- [Setup](setup.md)\n- [Usage](usage.md)\n',
      );
      writeFileSync(
        join(guideDir, 'overview.md'),
        '# Overview\n\nSee [install](./install.md), [setup](./setup.md) and [usage](./usage.md).\n\n## Install\n\n```bash\n# usage\n```\n',
      );
      writeFileSync(join(guideDir, 'install.md'), '# Install\n\n~~~sh\n# setup\n~~~\n');
      writeFileSync(join(guideDir, 'setup.md'), '# Setup\n\nBody.\n');
      writeFileSync(join(guideDir, 'usage.md'), '# Usage\n\nBody.\n');

      const [compiled] = compileGuideResults({
        guidesRoot: work,
        compileOrder: ['guide'],
        docsRoot: work,
        config: { compileOrder: ['guide'] },
      });
      const assembled = assembleGuide(guideDir, { outputFile: join(work, 'out', 'guide.md') });

      for (const out of [compiled.text, assembled]) {
        const lines = out.split('\n');
        const headings = buildSlugRegistry(out).headings;
        const landed: Record<string, number | undefined> = {};
        const opening: Record<string, number> = {};
        for (const name of ['install', 'setup', 'usage']) {
          const fragment = new RegExp(`\\[${name}\\]\\(#([^)]*)\\)`).exec(out)?.[1];
          landed[name] = headings.find((h) => h.slug === fragment)?.line;
          // A start tag, a blank line, then the section's opening heading.
          const tag = lines.findIndex(
            (l) => l.startsWith('<!-- mdcp-shard: start') && l.endsWith(`/${name}.md -->`),
          );
          expect(lines[tag + 2]).toMatch(/^## /);
          opening[name] = tag + 3;
        }
        expect(landed).toEqual(opening);
      }
    });
  });

  it('injects source tags around sections by default when outputFile is provided', () => {
    withTmpDir('mdcp-source-tags-', (work) => {
      writeFileSync(join(work, 'index.md'), '# Example\n\n- [Section](section.md)\n');
      writeFileSync(join(work, 'section.md'), '# Section\n\nContent.\n');

      const out = assembleGuide(work, {
        manifest: 'index.md',
        outputFile: join(work, 'out', 'guide.md'),
      });

      expect(out).toContain('<!-- mdcp-shard: start ../section.md -->');
      expect(out).toContain('<!-- mdcp-shard: end ../section.md -->');

      // Regression test: ensure formatting matches Prettier expectations (blank line before end tag)
      expect(out).toMatch(
        /<!-- mdcp-shard: start \.\.\/section\.md -->\n\n## Section\n\nContent\.\n\n<!-- mdcp-shard: end \.\.\/section\.md -->/,
      );
    });
  });

  it('omits source tags when sourceTags is false', () => {
    withTmpDir('mdcp-no-source-tags-', (work) => {
      writeFileSync(join(work, 'index.md'), '# Example\n\n- [Section](section.md)\n');
      writeFileSync(join(work, 'section.md'), '# Section\n\nContent.\n');

      const out = assembleGuide(work, {
        manifest: 'index.md',
        outputFile: join(work, 'out', 'guide.md'),
        sourceTags: false,
      });

      expect(out).not.toContain('<!-- mdcp-shard: start');
    });
  });

  it('per-guide sourceTags:false overrides the top-level default', () => {
    withTmpDir('mdcp-per-guide-source-tags-', (work) => {
      mkdirSync(join(work, 'tagged'), { recursive: true });
      mkdirSync(join(work, 'plain'), { recursive: true });
      writeFileSync(join(work, 'tagged', 'index.md'), '# Tagged\n\n- [One](one.md)\n');
      writeFileSync(join(work, 'tagged', 'one.md'), '# One\n\nTagged content.\n');
      writeFileSync(join(work, 'plain', 'index.md'), '# Plain\n\n- [Two](two.md)\n');
      writeFileSync(join(work, 'plain', 'two.md'), '# Two\n\nPlain content.\n');

      const results = compileGuideResults({
        guidesRoot: work,
        compileOrder: ['tagged', 'plain'],
        docsRoot: work,
        config: { outputDir: '.', outputFile: 'guides.md', compileOrder: ['tagged', 'plain'] },
        guides: [
          { name: 'tagged', compile: { outputFile: 'tagged.md' } },
          { name: 'plain', compile: { outputFile: 'plain.md', sourceTags: false } },
        ],
      });

      const tagged = results.find((r) => r.name === 'tagged')!;
      const plain = results.find((r) => r.name === 'plain')!;
      expect(tagged.text).toContain('<!-- mdcp-shard: start tagged/one.md -->');
      expect(plain.text).not.toContain('<!-- mdcp-shard: start');
    });
  });

  it('writes monolith and publish outputs in mixed mode', () => {
    withTmpDir('mdcp-mixed-', (work) => {
      const monolithDir = join(work, 'main');
      const publishDir = join(work, 'publish');
      mkdirSync(monolithDir, { recursive: true });
      mkdirSync(publishDir, { recursive: true });

      writeFileSync(join(monolithDir, 'index.md'), '# Main Guide\n\n- [Intro](intro.md)\n');
      writeFileSync(join(monolithDir, 'intro.md'), '# Intro\n\nMonolith content.\n');

      writeFileSync(join(publishDir, 'index.md'), '# Publish Guide\n\n- [Readme](readme.md)\n');
      writeFileSync(join(publishDir, 'readme.md'), '# @example/pkg\n\nPublish content.\n');

      const publishOut = join(work, 'out', 'README.md');
      const mainOut = join(work, 'main.md');
      const monolithOut = join(work, 'guides.md');
      const opts = {
        guidesRoot: work,
        compileOrder: ['main', 'publish'],
        banner: '<!-- banner -->\n\n',
        docsRoot: work,
        config: { outputDir: '.', outputFile: 'guides.md', compileOrder: ['main', 'publish'] },
        guides: [
          { name: 'main', splitLevel: 2 as const },
          {
            name: 'publish',
            splitLevel: 2 as const,
            compile: {
              outputFile: 'out/README.md',
              includeBanner: false,
              preambleSection: 'about-this-guide.md',
              manifest: 'index.md',
              stripAnchors: true,
            },
          },
        ],
      } satisfies CompileOptionsInput;

      const written = writeCompiledGuides(opts, monolithOut);
      expect(written.map((w) => w.path).sort()).toEqual([monolithOut, publishOut, mainOut].sort());

      const monolith = compileGuides(opts);
      expect(monolith).toContain('<!-- banner -->');
      expect(monolith).toContain('Main Guide');
      expect(monolith).toContain('Intro');
      expect(monolith).not.toContain('@example/pkg');

      const publishText = readFileSync(publishOut, 'utf-8');
      expect(publishText).toContain('@example/pkg');
      expect(publishText).not.toContain('<!-- banner -->');
    });
  });

  it('rewrites intra-guide .md links to anchors in publish output', () => {
    withTmpDir('mdcp-publish-links-', (work) => {
      const guideDir = join(work, 'guide');
      mkdirSync(guideDir, { recursive: true });

      writeFileSync(
        join(guideDir, 'index.md'),
        '# @example/mdcp-cli\n\n- [Install and quick start](install-and-quick-start.md)\n- [LLM collaboration](llm-collaboration.md)\n',
      );
      writeFileSync(
        join(guideDir, 'install-and-quick-start.md'),
        '# Install and quick start\n\nCollaborating with an LLM? See [LLM collaboration](./llm-collaboration.md) for details.\n',
      );
      writeFileSync(join(guideDir, 'llm-collaboration.md'), '# LLM collaboration\n\nContent.\n');

      const publishOut = join(work, 'README.md');
      const opts = {
        guidesRoot: work,
        compileOrder: ['guide'],
        docsRoot: work,
        config: { outputDir: '.', compileOrder: ['guide'] },
        guides: [
          {
            name: 'guide',
            splitLevel: 2 as const,
            compile: {
              outputFile: 'README.md',
              includeBanner: false,
              preambleSection: 'about-this-guide.md',
              manifest: 'index.md',
              stripAnchors: true,
            },
          },
        ],
      } satisfies CompileOptionsInput;

      writeCompiledGuides(opts, join(work, 'guides.md'));
      const text = readFileSync(publishOut, 'utf-8');
      expect(text).toContain('[LLM collaboration](#llm-collaboration)');
      expect(text).not.toMatch(/\]\(\.\/llm-collaboration\.md\)/);
    });
  });

  it('rewrites intra-guide .md links in compiled guide output', () => {
    withTmpDir('mdcp-intra-guide-links-', (work) => {
      const guideDir = join(work, 'guide');
      mkdirSync(guideDir, { recursive: true });

      writeFileSync(
        join(guideDir, 'index.md'),
        '# Feature Guide\n\n- [Intro](intro.md)\n- [Details](details.md)\n',
      );
      writeFileSync(
        join(guideDir, 'intro.md'),
        '# Intro\n\nSee [Details](./details.md) for more.\n',
      );
      writeFileSync(join(guideDir, 'details.md'), '# Details\n\nBody.\n');

      const out = compileGuides({
        guidesRoot: work,
        compileOrder: ['guide'],
      });
      expect(out).toContain('[Details](#details)');
      expect(out).not.toMatch(/\]\(\.\/details\.md\)/);
    });
  });

  it('rewrites publish path links automatically for publish outputs', () => {
    withTmpDir('mdcp-publish-path-rewrite-', (work) => {
      const guideDir = join(work, 'guide');
      mkdirSync(guideDir, { recursive: true });
      writeFileSync(join(work, 'mdcp.config.json'), '{}');

      writeFileSync(join(guideDir, 'index.md'), '# @example/pkg\n\n- [Section](section.md)\n');
      writeFileSync(
        join(guideDir, 'section.md'),
        '# Section\n\nSee [Config](../mdcp.config.json).\n',
      );

      const publishOut = join(work, 'README.md');
      const opts = {
        guidesRoot: work,
        compileOrder: ['guide'],
        docsRoot: work,
        config: { outputDir: '.', compileOrder: ['guide'] },
        guides: [
          {
            name: 'guide',
            compile: {
              outputFile: 'README.md',
              includeBanner: false,
            },
          },
        ],
      } satisfies CompileOptionsInput;

      writeCompiledGuides(opts, join(work, 'guides.md'));
      const text = readFileSync(publishOut, 'utf-8');
      expect(text).toContain('[Config](mdcp.config.json)');
    });
  });

  it('returns empty string when all guides have publish outputs', () => {
    withTmpDir('mdcp-all-publish-', (work) => {
      const guideDir = join(work, 'guide');
      mkdirSync(guideDir, { recursive: true });

      writeFileSync(join(guideDir, 'index.md'), '# Publish\n\n- [Body](body.md)\n');
      writeFileSync(join(guideDir, 'body.md'), '# Body\n\nContent.\n');

      const out = compileGuides({
        guidesRoot: work,
        compileOrder: ['guide'],
        docsRoot: work,
        guides: [
          {
            name: 'guide',
            compile: { outputFile: 'README.md' },
          },
        ],
      });
      expect(out).toContain('# Body');
      expect(out).toContain('Content.');
    });
  });

  it('respects sectionsHeading for glossary-style preamble links', () => {
    withTmpDir('mdcp-glossary-', (work) => {
      writeFileSync(
        join(work, 'index.md'),
        '# Glossary\n\nSee [CSP](./04-security.md).\n\n## Sections\n\n- [One](./01-one.md)\n- [Two](./02-two.md)\n',
      );
      writeFileSync(join(work, '04-security.md'), '## Security\n\nCSP.\n');
      writeFileSync(join(work, '01-one.md'), '## One\n\nFirst.\n');
      writeFileSync(join(work, '02-two.md'), '## Two\n\nSecond.\n');

      const out = assembleGuide(work, {
        title: 'Compound glossary',
        manifest: 'index.md',
        sectionsHeading: 'Sections',
      });

      const onePos = out.indexOf('One');
      const twoPos = out.indexOf('Two');
      const securityPos = out.indexOf('Security');
      expect(onePos).toBeGreaterThan(-1);
      expect(twoPos).toBeGreaterThan(onePos);
      expect(securityPos).toBe(-1);
    });
  });

  it('assembleGuide inlines diagram catalog tables via inlineInserts hook', () => {
    withTmpDir('mdcp-diagrams-', (work) => {
      const guideDir = join(work, 'review');
      const diagramsDir = join(work, 'diagrams');
      mkdirSync(guideDir, { recursive: true });
      mkdirSync(diagramsDir, { recursive: true });
      writeFileSync(
        join(diagramsDir, 'request-flow.md'),
        '| Step | Actor |\n|------|-------|\n| 1 | Client |\n',
      );
      writeFileSync(
        join(guideDir, 'index.md'),
        '# Architecture review\n\n- [Diagram catalog](./diagram-catalog.md)\n- [Claim](./claim.md)\n',
      );
      writeFileSync(
        join(guideDir, 'diagram-catalog.md'),
        [
          '## Diagram catalog',
          '',
          '| Diagram | Summary |',
          '| --- | --- |',
          '| [Request flow](../diagrams/request-flow.md) | Main path |',
        ].join('\n'),
      );
      writeFileSync(
        join(guideDir, 'claim.md'),
        'See [Request flow again](../diagrams/request-flow.md) in the claim shard.',
      );

      const out = assembleGuide(guideDir, {
        manifest: 'index.md',
        hooks: ['inlineInserts'],
      });

      expect(out.match(/\| Step \| Actor \|/g)?.length).toBe(1);
      expect(out).toContain('#### Diagram 1. Request flow');
      expect(out).toContain('[Request flow again](#diagram-1-request-flow)');
      expect(out).not.toMatch(/<a id=/);
      expect(out).not.toContain('](../diagrams/request-flow.md)');
    });
  });

  it('each guide inlines the first diagram mention independently', () => {
    withTmpDir('mdcp-diagram-guides-', (work) => {
      const sharedDiagrams = join(work, 'diagrams');
      mkdirSync(sharedDiagrams, { recursive: true });
      writeFileSync(
        join(sharedDiagrams, 'platform.md'),
        '| Layer | Role |\n|-------|------|\n| API | Gateway |\n',
      );

      const guideA = join(work, 'guide-a');
      const guideB = join(work, 'guide-b');
      mkdirSync(guideA, { recursive: true });
      mkdirSync(guideB, { recursive: true });

      writeFileSync(join(guideA, 'index.md'), '# Guide A\n\n- [Claim](./claim.md)\n');
      writeFileSync(
        join(guideA, 'claim.md'),
        'Uses [platform](../diagrams/platform.md) twice: [platform](../diagrams/platform.md).',
      );
      writeFileSync(join(guideB, 'index.md'), '# Guide B\n\n- [Claim](./claim.md)\n');
      writeFileSync(join(guideB, 'claim.md'), 'Also [platform](../diagrams/platform.md).');

      const outA = assembleGuide(guideA, {
        manifest: 'index.md',
        hooks: ['inlineInserts'],
      });
      const outB = assembleGuide(guideB, {
        manifest: 'index.md',
        hooks: ['inlineInserts'],
      });

      expect(outA.match(/\| Layer \| Role \|/g)?.length).toBe(1);
      expect(outA).toContain('[platform](#diagram-1-platform)');
      expect(outB).toContain('#### Diagram 1. platform');
      expect(outB).toContain('| Layer | Role |');
      expect(outB).not.toMatch(/<a id=/);
    });
  });
});

describe('cli e2e', () => {
  it('compileGuides inlines captioned inserts from sample fixture guide', () => {
    const output = compileGuides({
      guidesRoot: FIXTURE,
      compileOrder: ['inserts-demo'],
      guides: [
        {
          name: 'inserts-demo',
          compile: { hooks: ['inlineInserts'], manifest: 'index.md' },
        },
      ],
    });

    expect(output).toContain('| Step | Actor  | Action');
    expect(output).toContain('| Code | Meaning   |');
    expect(output).toContain('flowchart LR');
    expect(output).toContain('![MDCP logo](./logo.svg)');
    expect(output).toContain('<audio src="./chime.mp3" controls></audio>');
    expect(output).toContain('[Request flow](#diagram-1-request-flow)');
    // The catalog gives each first reference a paragraph of its own, so its table compiles whole,
    // with its back-links re-aligned.
    expect(output).toContain(
      [
        '| Insert                                     | Summary                         |',
        '| ------------------------------------------ | ------------------------------- |',
        '| [Request flow](#diagram-1-request-flow)    | Client to server path (table)   |',
      ].join('\n'),
    );
    expect(output).toContain('[Status codes](#table-1-status-codes)');
    expect(output).toContain('#### Media 1. Walkthrough');
    expect(output).toContain('[Walkthrough](#media-1-walkthrough)');
    expect(output).toContain('#### Figure 3. Raster formats');
    expect(output).toContain('GitHub markdown media reference');
    expect(output.match(/\| Step \| Actor {2}\| Action/g)?.length).toBe(1);
    expect(output.match(/\| Code \| Meaning {3}\|/g)?.length).toBe(1);
    expect(output).not.toContain('](../diagrams/request-flow.md)');
    expect(output).not.toContain('](../tables/status-codes.md)');
    expect(output).not.toContain('](../media/walkthrough.md)');
    expect(output).not.toContain('](../figures/raster-formats.md)');
  });

  it('mdcp compile exits 0 on sample-guides', () => {
    const out = execFileSync(
      'node',
      [CLI, 'compile', '--config', SAMPLE_CONFIG, '--docs-root', FIXTURE],
      { encoding: 'utf-8', cwd: REPO_ROOT },
    );
    expect(out).toMatch(/guides\.md/);
    expect(existsSync(join(FIXTURE, '_build', 'guides.md'))).toBe(true);
  });

  it('mdcp refs lookup is removed (unrecognized command)', () => {
    expect(() =>
      execFileSync(
        'node',
        [CLI, 'refs', 'lookup', 'admin', '--config', SAMPLE_CONFIG, '--docs-root', FIXTURE],
        { encoding: 'utf-8', cwd: REPO_ROOT },
      ),
    ).toThrow();
  });

  it('mdcp refs list still works after compile', () => {
    execFileSync('node', [CLI, 'compile', '--config', SAMPLE_CONFIG, '--docs-root', FIXTURE], {
      encoding: 'utf-8',
      cwd: REPO_ROOT,
    });
    const out = execFileSync(
      'node',
      [CLI, 'refs', 'list', '--config', SAMPLE_CONFIG, '--docs-root', FIXTURE],
      { encoding: 'utf-8', cwd: REPO_ROOT },
    );
    const headings = JSON.parse(out);
    expect(Array.isArray(headings)).toBe(true);
    expect(headings.length).toBeGreaterThan(0);
  });

  it('mdcp check passes on sample-guides (core, no peer require)', () => {
    const out = execFileSync(
      'node',
      [CLI, 'check', '--config', SAMPLE_CONFIG, '--docs-root', FIXTURE, '--skip-vale'],
      { encoding: 'utf-8', cwd: REPO_ROOT },
    );
    expect(out).toContain('mdcp check passed');
  });
});
