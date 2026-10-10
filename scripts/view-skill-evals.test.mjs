import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { after, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const script = join(dirname(fileURLToPath(import.meta.url)), 'view-skill-evals.sh');
const dir = mkdtempSync(join(tmpdir(), 'view-skill-evals-'));
after(() => rmSync(dir, { recursive: true, force: true }));

describe('view-skill-evals.sh', () => {
  it('looks for the iteration in the workspace that the live-eval docs write to', () => {
    // An empty directory has no workspace, so the script stops at its check and
    // names the path it looked for.
    const run = spawnSync('bash', [script, '3'], { cwd: dir, encoding: 'utf8' });
    assert.equal(run.status, 1);
    assert.match(run.stdout, /'\.agents\/skills\/mdcp-workspace\/iteration-3' not found/);
  });
});
