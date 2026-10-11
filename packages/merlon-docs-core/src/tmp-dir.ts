import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

/** Create a unique directory under the OS temp dir (race-safe via mkdtemp). */
export function createTmpDir(prefix = 'merlon-'): string {
  return mkdtempSync(join(tmpdir(), prefix));
}

/** Remove a temp directory tree; ignores missing paths. */
export function removeTmpDir(dir: string): void {
  rmSync(dir, { recursive: true, force: true });
}

/** Run `fn` inside a fresh temp dir and always clean up afterward. */
export function withTmpDir<T>(prefix: string, fn: (dir: string) => T): T {
  const dir = createTmpDir(prefix);
  try {
    return fn(dir);
  } finally {
    removeTmpDir(dir);
  }
}

/** Temporarily change process cwd; restores on exit. */
export function withCwd<T>(dir: string, fn: () => T): T {
  const prev = process.cwd();
  process.chdir(dir);
  try {
    return fn();
  } finally {
    process.chdir(prev);
  }
}
