import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { after, describe, it } from 'node:test';
import GithubSlugger from 'github-slugger';
import {
  SyncError,
  buildSlugOwners,
  extractTitle,
  maskInline,
  mermaidToHtml,
  pageAnchors,
  parseManifest,
  plainText,
  resolveUnderOutputDir,
  rewriteLinksInText,
  splitFences,
  syncContent,
} from './sync-content.mjs';

/** Minimal stand-in for mdcp-core's buildSlugRegistry (headings → GitHub slugs). */
function fakeRegistry(text) {
  const slugger = new GithubSlugger();
  const headings = [];
  text.split('\n').forEach((line, i) => {
    const m = /^(#{1,6})\s+(.*)$/.exec(line);
    if (m) headings.push({ slug: slugger.slug(m[2]), title: m[2], line: i + 1 });
  });
  return { generatedFrom: 'compiled', headings, slugs: {} };
}

describe('markdown scanning', () => {
  it('mermaidToHtml turns mermaid fences into escaped pre blocks and leaves other fences', () => {
    const md = 'a\n```mermaid\nflowchart LR\n  A[x<y] --> B\n```\n```js\n1 < 2\n```';
    assert.equal(
      mermaidToHtml(md),
      'a\n<pre class="mermaid">flowchart LR\n  A[x&lt;y] --&gt; B</pre>\n```js\n1 < 2\n```',
    );
  });

  it('plainText strips nested tags until none can reassemble', () => {
    assert.equal(plainText('Use <<b>script>alert(1)<</b>/script> **here**'), 'Use alert(1) here');
    assert.equal(plainText('A <code>tag</code> and a \\< b'), 'A tag and a < b');
  });

  it('splitFences separates fenced code and round-trips the input', () => {
    const md = 'a\n```js\n[x](y.md)\n```\nb\n~~~~\n```\n~~~~\nc';
    const segs = splitFences(md);
    assert.deepEqual(
      segs.map((s) => s.type),
      ['text', 'code', 'text', 'code', 'text'],
    );
    assert.equal(segs.map((s) => s.value).join('\n'), md);
  });

  it('maskInline hides code spans and HTML comments but keeps length', () => {
    const text = 'see `[a](b.md)` and <!-- [c](d.md) --> ok';
    const masked = maskInline(text);
    assert.equal(masked.length, text.length);
    assert.ok(!masked.includes('b.md'));
    assert.ok(!masked.includes('d.md'));
    assert.ok(masked.endsWith(' ok'));
  });

  it('rewriteLinksInText rewrites inline links, nested images and <dest>, not code', () => {
    const seen = [];
    const out = rewriteLinksInText(
      '[A](./a.md#x) `[B](./b.md)` [![img](i.png)](<./c d.md>) [t](e.md "title")',
      (dest, { image }) => {
        seen.push([dest, image]);
        return `R(${dest})`;
      },
    );
    assert.equal(
      out,
      '[A](R(./a.md#x)) `[B](./b.md)` [![img](R(i.png))](<R(./c d.md)>) [t](R(e.md) "title")',
    );
    assert.deepEqual(seen, [
      ['./a.md#x', false],
      ['i.png', true],
      ['./c d.md', false],
      ['e.md', false],
    ]);
  });

  it('extractTitle takes the first h1 (outside code) and strips it from the body', () => {
    const { title, body } = extractTitle('```\n# not me\n```\n# The `mdcp` title\n\nBody text\n');
    assert.equal(title, 'The mdcp title');
    assert.equal(body, '```\n# not me\n```\nBody text\n');
  });

  it('extractTitle falls back to an opening h2 and fails without any heading', () => {
    assert.equal(extractTitle('## Opening\n\ntext').title, 'Opening');
    assert.throws(() => extractTitle('just text', 'x.md'), SyncError);
  });

  it('pageAnchors slugs headings like Astro (deduplicated per page)', () => {
    const anchors = pageAnchors('## Path (`--config`)\n\n## Usage\n\n## Usage\n');
    assert.deepEqual(
      anchors.map((a) => a.slug),
      ['path---config', 'usage', 'usage-1'],
    );
  });

  it('parseManifest builds a nested tree of link list items', () => {
    const tree = parseManifest(
      '# Guide\n\n- [Guide](#table-of-contents)\n  - [About](./about.md)\n  - [Sub](./sub/index.md)\n\n    - [Leaf `x`](./sub/leaf.md)\n- [Top](./top.md)\n',
    );
    assert.equal(tree.length, 2);
    assert.equal(tree[0].children[1].label, 'Sub');
    assert.equal(tree[0].children[1].children[0].label, 'Leaf x');
    assert.equal(tree[1].target, './top.md');
  });

  it('parseManifest turns ## headings into sections and drops empty ones', () => {
    const tree = parseManifest(
      [
        '# Guide',
        '',
        'Intro.',
        '',
        '## Start',
        '',
        '- [A](./a.md)',
        '  - [A1](./a1.md)',
        '',
        '## Empty',
        '',
        'Text only.',
        '',
        '## More',
        '',
        '- [B](./b.md)',
      ].join('\n'),
    );
    assert.deepEqual(tree, [
      {
        label: 'Start',
        target: null,
        children: [
          {
            label: 'A',
            target: './a.md',
            children: [{ label: 'A1', target: './a1.md', children: [] }],
          },
        ],
      },
      { label: 'More', target: null, children: [{ label: 'B', target: './b.md', children: [] }] },
    ]);
  });

  it('resolveUnderOutputDir mirrors mdcp-core path rules', () => {
    assert.equal(
      resolveUnderOutputDir('/r/docs', '_build', '_build/refs.json'),
      '/r/docs/_build/refs.json',
    );
    assert.equal(
      resolveUnderOutputDir('/r/docs', '_build', 'guides.md'),
      '/r/docs/_build/guides.md',
    );
    assert.equal(resolveUnderOutputDir('/r/docs', '_build', '../../README.md'), '/r/README.md');
  });
});

describe('buildSlugOwners', () => {
  const compiled = [
    '# Guide',
    '<!-- mdcp-shard: start ../g/a.md -->',
    '## Alpha',
    '<!-- mdcp-shard: end ../g/a.md -->',
    '<!-- mdcp-shard: start ../g/b.md -->',
    '## Beta',
    '### Alpha',
    '<!-- mdcp-shard: end ../g/b.md -->',
  ].join('\n');

  it('maps each slug to the shard whose markers enclose the heading', () => {
    const owners = buildSlugOwners(compiled, fakeRegistry(compiled), '/r/docs/_build/guides.md');
    assert.equal(owners.get('guide').sourceAbs, null);
    assert.equal(owners.get('alpha').sourceAbs, '/r/docs/g/a.md');
    assert.equal(owners.get('alpha-1').sourceAbs, '/r/docs/g/b.md');
    assert.equal(owners.get('alpha-1').title, 'Alpha');
  });

  it('fails loudly when the registry does not match the compiled file', () => {
    const registry = { headings: [{ slug: 'x', title: 'X', line: 2 }] };
    assert.throws(() => buildSlugOwners(compiled, registry, '/r/c.md'), /stale/);
  });
});

describe('syncContent (fixture repository)', () => {
  const root = mkdtempSync(join(tmpdir(), 'mdcp-site-'));
  after(() => rmSync(root, { recursive: true, force: true }));

  const write = (rel, text) => {
    const abs = join(root, rel);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, text);
  };

  const guides = [
    { name: 'guide', route: 'g', label: 'Guide' },
    { name: 'glossary', route: 'glossary', label: 'Glossary' },
  ];

  function setup(introExtra = '') {
    write(
      'docs/mdcp.config.json',
      JSON.stringify({
        outputDir: '_build',
        outputFile: 'guides.md',
        compileOrder: ['guide'],
        guides: [{ name: 'guide', compile: { scopeRoot: 'glossary' } }],
        refs: { registryFile: '_build/refs.json' },
      }),
    );
    write(
      'docs/guide/index.md',
      '# Guide\n\n- [Guide](#table-of-contents)\n  - [Intro](./intro.md)\n  - [Deep](./deep/index.md)\n',
    );
    write(
      'docs/guide/intro.md',
      [
        '# Intro',
        '',
        'See [term](../glossary/term.md), [details](#details), [deep part](./deep/index.md#deep-part),',
        'the [README](../../README.md), the [config](../mdcp.config.json) and [web](https://example.com).',
        '',
        '```md',
        '[ignored](./nowhere.md)',
        '```',
        introExtra,
      ].join('\n'),
    );
    write(
      'docs/guide/deep/index.md',
      '# Deep\n\n- [Leaf](./leaf.md)\n\n## Deep part\n\n### Details\n',
    );
    write('docs/guide/deep/leaf.md', '# Leaf\n\nBack to [intro](../intro.md).\n');
    write('docs/glossary/index.md', '# Glossary\n\nTerms.\n\n- [term](./term.md)\n');
    write('docs/glossary/term.md', '# term\n\nA word.\n');
    write('README.md', '# Readme\n');
    const compiled = [
      '# Guide',
      '<!-- mdcp-shard: start ../guide/intro.md -->',
      '## Intro',
      '<!-- mdcp-shard: end ../guide/intro.md -->',
      '<!-- mdcp-shard: start ../guide/deep/index.md -->',
      '## Deep',
      '### Deep part',
      '#### Details',
      '<!-- mdcp-shard: end ../guide/deep/index.md -->',
    ].join('\n');
    write('docs/_build/guides.md', compiled);
    write('docs/_build/refs.json', JSON.stringify(fakeRegistry(compiled)));
    write('site/src/content/docs/index.mdx', '---\ntitle: Home\n---\n');
    write('site/src/content/docs/stale/old.md', 'old');
  }

  const run = () =>
    syncContent({
      repoRoot: root,
      docsRoot: join(root, 'docs'),
      configPath: join(root, 'docs/mdcp.config.json'),
      contentDir: join(root, 'site/src/content/docs'),
      generatedDir: join(root, 'site/.generated'),
      buildSlugRegistry: fakeRegistry,
      guides,
      base: '/b',
      repoUrl: 'https://github.com/o/r',
      branch: 'main',
    });

  it('generates one page per shard with titles, edit links and rewritten links', () => {
    setup();
    const result = run();
    assert.deepEqual(result.pages.sort(), [
      'g',
      'g/deep',
      'g/deep/leaf',
      'g/intro',
      'glossary',
      'glossary/term',
    ]);
    const intro = readFileSync(join(root, 'site/src/content/docs/g/intro.md'), 'utf8');
    assert.match(intro, /^---\ntitle: "Intro"\nslug: "g\/intro"\n/);
    assert.match(intro, /editUrl: "https:\/\/github.com\/o\/r\/edit\/main\/docs\/guide\/intro.md"/);
    assert.ok(!/^# Intro/m.test(intro));
    assert.ok(intro.includes('[term](/b/glossary/term/)'));
    assert.ok(intro.includes('[details](/b/g/deep/#details)'), 'compiled #slug → owning shard');
    assert.ok(intro.includes('[deep part](/b/g/deep/#deep-part)'));
    assert.ok(intro.includes('[README](https://github.com/o/r/blob/main/README.md)'));
    assert.ok(intro.includes('[config](https://github.com/o/r/blob/main/docs/mdcp.config.json)'));
    assert.ok(intro.includes('[web](https://example.com)'));
    assert.ok(intro.includes('[ignored](./nowhere.md)'), 'links in code fences stay as written');
    const leaf = readFileSync(join(root, 'site/src/content/docs/g/deep/leaf.md'), 'utf8');
    assert.ok(leaf.includes('[intro](/b/g/intro/)'));
    assert.ok(readFileSync(join(root, 'site/src/content/docs/index.mdx'), 'utf8').includes('Home'));
    assert.throws(() => readFileSync(join(root, 'site/src/content/docs/stale/old.md')));
  });

  it('writes the sidebar in manifest order with sub-index groups', () => {
    setup();
    run();
    const sidebar = JSON.parse(readFileSync(join(root, 'site/.generated/sidebar.json'), 'utf8'));
    assert.deepEqual(sidebar[0], {
      label: 'Guide',
      collapsed: false,
      items: [
        { label: 'Intro', slug: 'g/intro' },
        {
          label: 'Deep',
          collapsed: true,
          items: [
            { label: 'Overview', slug: 'g/deep' },
            { label: 'Leaf', slug: 'g/deep/leaf' },
          ],
        },
      ],
    });
    assert.deepEqual(sidebar[1].items[0], { label: 'Glossary', slug: 'glossary' });
  });

  it('renders ## manifest sections as sidebar sub-groups (root and sub-index)', () => {
    setup();
    write(
      'docs/guide/index.md',
      '# Guide\n\n## Start\n\n- [Intro](./intro.md)\n\n## More\n\n- [Deep](./deep/index.md)\n',
    );
    write(
      'docs/guide/deep/index.md',
      '# Deep\n\n## Leaves\n\n- [Leaf](./leaf.md)\n\n## Deep part\n\n### Details\n',
    );
    run();
    const sidebar = JSON.parse(readFileSync(join(root, 'site/.generated/sidebar.json'), 'utf8'));
    assert.deepEqual(sidebar[0].items, [
      { label: 'Start', items: [{ label: 'Intro', slug: 'g/intro' }] },
      {
        label: 'More',
        items: [
          {
            label: 'Deep',
            collapsed: true,
            items: [
              { label: 'Overview', slug: 'g/deep' },
              { label: 'Leaves', items: [{ label: 'Leaf', slug: 'g/deep/leaf' }] },
            ],
          },
        ],
      },
    ]);
  });

  it('fails on a link to a missing file', () => {
    setup('Broken: [gone](./gone.md)');
    assert.throws(run, /docs\/guide\/intro.md: link "\.\/gone\.md": target not found/);
  });

  it('fails on a cross-link slug no shard owns', () => {
    setup('Broken: [nope](#no-such-heading)');
    assert.throws(run, /#no-such-heading does not resolve/);
  });

  it('fails on a missing anchor in another shard', () => {
    setup('Broken: [leaf](./deep/leaf.md#missing)');
    assert.throws(run, /anchor #missing not found/);
  });
});
