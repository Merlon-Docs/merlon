import { afterEach, beforeEach } from 'vitest';
import { createTmpDir, removeTmpDir, withCwd, withTmpDir } from '../../src/tmp-dir.js';

export { createTmpDir, removeTmpDir, withCwd, withTmpDir };

export interface TmpDirFixture {
  path: string;
}

/** Per-test temp dir with automatic cleanup via vitest hooks. */
export function useTmpDir(prefix = 'merlon-'): TmpDirFixture {
  const fixture: TmpDirFixture = { path: '' };
  beforeEach(() => {
    fixture.path = createTmpDir(prefix);
  });
  afterEach(() => {
    if (fixture.path) removeTmpDir(fixture.path);
  });
  return fixture;
}
