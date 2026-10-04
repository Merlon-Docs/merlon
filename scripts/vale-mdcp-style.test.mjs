// Runs Vale with the shipped MDCP style over small Markdown fixtures, so a
// rule's matches are tested, not just its presence. Skips when `vale` is not
// on PATH; CI installs Vale before `node --test scripts/*.test.mjs`.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
// The Vale Packages layout that consumers sync: its .vale.ini and styles/MDCP.
const packageConfig = join(root, 'packages/mdcp-presets/vale/package/.vale.ini');
const hasVale = spawnSync('vale', ['--version']).status === 0;

/** Lint one Markdown string with the packaged MDCP config; return Vale's exit status and alerts. */
function lint(markdown, args = []) {
  const dir = mkdtempSync(join(tmpdir(), 'mdcp-vale-style-'));
  try {
    const doc = join(dir, 'doc.md');
    writeFileSync(doc, markdown);
    // --no-global keeps a developer's global Vale config out of the run.
    const r = spawnSync(
      'vale',
      ['--no-global', '--config', packageConfig, '--output=JSON', ...args, doc],
      { encoding: 'utf8' },
    );
    // Vale exits 0 with no errors, 1 with error-level alerts, 2 on a runtime failure.
    assert.ok(r.status === 0 || r.status === 1, `vale exited ${r.status}: ${r.stderr}`);
    return { status: r.status, alerts: Object.values(JSON.parse(r.stdout || '{}')).flat() };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const linesFor = (check, { alerts }) => alerts.filter((a) => a.Check === check).map((a) => a.Line);

describe('MDCP Vale style', { skip: !hasVale && 'vale not on PATH' }, () => {
  it('MDCP.DatedClaim flags "as of" and "until" before an ISO date', () => {
    const md = [
      '# Doc', // 1
      '', // 2
      'As of 2026-07-27 the cache is warm.', // 3
      '', // 4
      'The flag stays on until 2026-01-01.', // 5
      '', // 6
      'Pinned to the runner current as  of', // 7
      '2026-07-27 on a wrapped line.', // 8
      '', // 9
      '| Item | State |', // 10
      '| --- | --- |', // 11
      '| runner | until 2026-03-01 |', // 12
      '', // 13
      '## As of 2026-02-02', // 14
      '', // 15
      '- UNTIL 2026-12-31 the beta is open.', // 16
      '', // 17
      'The cache is warm as of 2026-07-27T12:00:00Z.', // 18
      '',
    ].join('\n');
    assert.deepEqual(linesFor('MDCP.DatedClaim', lint(md)), [3, 5, 7, 12, 14, 16, 18]);
  });

  it('MDCP.DatedClaim still flags brackets that come before a later inline link', () => {
    // TokenIgnores skips an inline link, and only the link: a checkbox, an
    // admonition, a footnote or a stray bracket must not hide the text up to
    // the next link.
    const md = [
      '# Doc', // 1
      '', // 2
      '- [ ] Dual-write both stores until 2026-09-01.', // 3
      '', // 4
      '> [!NOTE]', // 5
      '> The beta is open until 2026-10-01.', // 6
      '', // 7
      'A footnote[^1] marks this, as of 2026-07-27.', // 8
      '', // 9
      'The range [0, 10) is half-open until 2026-11-01.', // 10
      '', // 11
      'See [the runbook](./runbook.md).', // 12
      '',
    ].join('\n');
    assert.deepEqual(linesFor('MDCP.DatedClaim', lint(md)), [3, 6, 8, 10]);
  });

  it('TokenIgnores skips an inline link whose label holds a bracket pair or an escaped bracket', () => {
    // CommonMark allows balanced brackets in a link label, and a backslash-escaped
    // bracket of either kind. Every MDCP rule must skip these labels, and a
    // checkbox or a stray bracket must still not hide its line.
    const md = [
      '# Doc', // 1
      '', // 2
      'See [Chapter 2 [draft]](./x.md) for the draft.', // 3
      '', // 4
      'See [Section 3 of `cfg[key]`](./x.md) for the key.', // 5
      '', // 6
      'Read [`items[0]` until 2026-07-27](./x.md) for the old shape.', // 7
      '', // 8
      'See [[Chapter 4]](./x.md) for the double bracket.', // 9
      '', // 10
      '- [ ] Dual-write both stores until 2026-09-01.', // 11
      '', // 12
      'See [the runbook](./runbook.md).', // 13
      '', // 14
      'See [Chapter 2 \\[draft](./x.md) for the draft.', // 15
      '', // 16
      'A stray [ bracket hides this until 2026-11-01, see [a \\] b](./x.md).', // 17
      '',
    ].join('\n');
    assert.deepEqual(
      lint(md).alerts.map((a) => [a.Check, a.Line]),
      [
        ['MDCP.DatedClaim', 11],
        ['MDCP.DatedClaim', 17],
      ],
    );
  });

  it('MDCP.DatedClaim flags a reference-style link label and can miss a claim split by emphasis', () => {
    // Pins the limits the presets README documents. TokenIgnores skips inline
    // links only, and Vale can miss a match that emphasis markers split.
    const md = [
      '# Doc', // 1
      '', // 2
      'See [as of 2026-07-27][snap] for the snapshot.', // 3
      '', // 4
      'As of **2026-07-27** the cache is warm.', // 5
      '', // 6
      '[snap]: ./x.md', // 7
      '',
    ].join('\n');
    assert.deepEqual(linesFor('MDCP.DatedClaim', lint(md)), [3]);
  });

  it('MDCP.DatedClaim skips undated cues, other dated forms, code, link labels and the opt-out', () => {
    const md = [
      '# Doc',
      '',
      'Reviewed (2026-07-27) by the security owner.',
      '',
      'Wait until the build finishes. As of now it is warm.',
      '',
      'Released 2026-07-27. Valid until 2026-13-45 is not a date.',
      '',
      'Run `until 2026-01-01` in a shell.',
      '',
      'See [as of 2026-07-27](./x.md) for the snapshot.',
      '',
      'See [as of',
      '2026-07-27](./x.md) for the wrapped label, and ![until 2026-07-27](./i.png).',
      '',
      '```text',
      'as of 2026-07-27',
      '```',
      '',
      '<!-- vale MDCP.DatedClaim = NO -->',
      'As of 2026-07-27 this is a deliberate dated record.',
      '<!-- vale MDCP.DatedClaim = YES -->',
      '',
    ].join('\n');
    assert.deepEqual(linesFor('MDCP.DatedClaim', lint(md)), []);
  });

  it('MDCP.DatedClaim is error level, so an error-only run fails on it', () => {
    const { status, alerts } = lint('# Doc\n\nAs of 2026-07-27 the cache is warm.\n', [
      '--minAlertLevel=error',
    ]);
    assert.equal(status, 1);
    assert.deepEqual(
      alerts.map((a) => [a.Check, a.Severity]),
      [['MDCP.DatedClaim', 'error']],
    );
  });

  it('MDCP.DatedClaim gives one destination for each kind of dated text', () => {
    // The mdcp skill sends a current rule's history to an ADR and a temporary
    // note to the tracker. A second destination for the same text, such as a
    // CHANGELOG entry, would contradict it. The rule stays on for ADRs, so the
    // message also tells an ADR author how to keep the date.
    const [alert] = lint('# Doc\n\nAs of 2026-07-27 the cache is warm.\n').alerts;
    assert.match(alert.Message, /current rule's history to an ADR/);
    assert.match(alert.Message, /temporary note to the tracker/);
    assert.match(alert.Message, /In an ADR, write the date on its own/);
    assert.doesNotMatch(alert.Message, /CHANGELOG/i);
  });

  it('every shipped Vale config and README snippet uses the package TokenIgnores', () => {
    const tokenIgnores = (file) =>
      [...readFileSync(join(root, file), 'utf8').matchAll(/^TokenIgnores = (.*)$/gm)].map(
        (m) => m[1],
      );
    const [expected] = tokenIgnores('packages/mdcp-presets/vale/package/.vale.ini');
    for (const file of [
      'packages/mdcp-presets/vale/mdcp.vale.ini',
      'packages/mdcp-presets/README.md',
      'docs/.vale.ini',
      'examples/sample-guides/.vale.ini',
    ]) {
      const found = tokenIgnores(file);
      assert.ok(found.length > 0, `${file} has no TokenIgnores`);
      assert.deepEqual(found, Array(found.length).fill(expected), file);
    }
  });
});
