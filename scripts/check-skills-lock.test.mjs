import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { after, describe, it } from 'node:test';
import { findAbsoluteLocalSources } from './check-skills-lock.mjs';

async function writeLock(skills) {
  const dir = await mkdtemp(path.join(tmpdir(), 'skills-lock-'));
  after(async () => {
    await rm(dir, { recursive: true, force: true });
  });
  const lockPath = path.join(dir, 'skills-lock.json');
  await writeFile(lockPath, JSON.stringify({ version: 1, skills }));
  return lockPath;
}

describe('findAbsoluteLocalSources', () => {
  it('accepts relative local sources and ignores remote sources', async () => {
    const lockPath = await writeLock({
      a: { source: '.', sourceType: 'local' },
      b: { source: 'skills/b', sourceType: 'local' },
      c: { source: 'owner/repo', sourceType: 'github' },
    });
    assert.deepEqual(await findAbsoluteLocalSources(lockPath), []);
  });

  it('reports each local skill whose source is a POSIX or Windows absolute path', async () => {
    const lockPath = await writeLock({
      a: { source: '/srv/checkout', sourceType: 'local' },
      b: { source: 'C:\\checkout', sourceType: 'local' },
      c: { source: '.', sourceType: 'local' },
    });
    const problems = await findAbsoluteLocalSources(lockPath);
    assert.equal(problems.length, 2);
    assert.match(problems[0], /^a: source "\/srv\/checkout" is absolute/);
    assert.match(problems[1], /^b: source "C:\\checkout" is absolute/);
  });
});
