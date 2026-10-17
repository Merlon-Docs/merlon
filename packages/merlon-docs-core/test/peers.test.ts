import { describe, it, expect } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { findPeerBinary } from '../src/peers/resolve.js';
import { useTmpDir, withTmpDir } from './helpers/tmp-dir.js';

describe('findPeerBinary', () => {
  const root = useTmpDir('merlon-peers-');

  it('finds hoisted binaries in an ancestor node_modules', () => {
    const nested = join(root.path, 'examples', 'sample-guides');
    mkdirSync(join(root.path, 'node_modules', '.bin'), { recursive: true });
    mkdirSync(nested, { recursive: true });
    const binPath = join(root.path, 'node_modules', '.bin', 'markdownlint-cli2');
    writeFileSync(binPath, '#!/usr/bin/env node\n', 'utf-8');

    const tool = findPeerBinary('markdownlint-cli2', nested);
    expect(tool.found).toBe(true);
    expect(tool.bin).toBe(binPath);
    expect(tool.source).toBe('local');
  });

  it('returns not found when binary is absent', () => {
    withTmpDir('merlon-peers-missing-', (work) => {
      const tool = findPeerBinary('nonexistent-merlon-tool', work);
      expect(tool.found).toBe(false);
      expect(tool.source).toBe('none');
    });
  });
});
