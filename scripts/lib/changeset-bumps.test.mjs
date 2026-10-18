import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { parseChangesetBumps } from './changeset-bumps.mjs';

describe('changeset-bumps', () => {
  it('parses package bump types from changeset frontmatter', () => {
    const dir = mkdtempSync(join(tmpdir(), 'cs-bumps-'));
    writeFileSync(
      join(dir, 'one.md'),
      `---
'@merlon-docs/merlon-docs-cli': minor
"@merlon-docs/skill-merlon-docs": patch
---

Notes
`,
    );
    writeFileSync(join(dir, 'README.md'), '# ignore');
    const parsed = parseChangesetBumps(dir);
    assert.equal(parsed.length, 1);
    assert.deepEqual(parsed[0].bumps, {
      '@merlon-docs/merlon-docs-cli': 'minor',
      '@merlon-docs/skill-merlon-docs': 'patch',
    });
  });
});
