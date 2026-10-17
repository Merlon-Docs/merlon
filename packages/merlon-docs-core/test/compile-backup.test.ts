import { describe, it, expect } from 'vitest';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { writeCompiledGuides } from '../src/compile/assemble.js';
import {
  writeOutputFile,
  resolveBackupPath,
  type WriteOutputBackupOptions,
} from '../src/compile/write-output.js';
import { withTmpDir } from './helpers/tmp-dir.js';

const backupCtx = (docsRoot: string, outputDir = '_build') => ({
  docsRoot,
  outputDir,
});

describe('resolveBackupPath', () => {
  it('mirrors output path under backup dir', () => {
    withTmpDir('merlon-backup-path-', (docsRoot) => {
      const outPath = join(docsRoot, '_build', 'guides.md');
      const backupPath = resolveBackupPath(outPath, {
        ...backupCtx(docsRoot),
        backup: { enabled: true, dir: '.caches/backups' },
      });
      expect(backupPath).toBe(
        join(docsRoot, '_build', '.caches', 'backups', '_build', 'guides.md'),
      );
    });
  });

  it('includes backup ext when set', () => {
    withTmpDir('merlon-backup-ext-path-', (docsRoot) => {
      const outPath = join(docsRoot, '_build', 'guides.md');
      const backupPath = resolveBackupPath(outPath, {
        ...backupCtx(docsRoot),
        backup: { enabled: true, dir: '.caches/backups', ext: '.bak' },
      });
      expect(backupPath).toBe(
        join(docsRoot, '_build', '.caches', 'backups', '_build', 'guides.md.bak'),
      );
    });
  });
});

describe('writeOutputFile', () => {
  it('writes new file without creating backup dir', () => {
    withTmpDir('merlon-backup-new-', (docsRoot) => {
      const outPath = join(docsRoot, '_build', 'guide.md');
      const result = writeOutputFile(outPath, '# Guide\n', backupCtx(docsRoot));
      expect(result.backupPath).toBeUndefined();
      expect(readFileSync(outPath, 'utf-8')).toBe('# Guide\n');
      expect(existsSync(join(docsRoot, '_build', '.caches', 'backups'))).toBe(false);
    });
  });

  it('overwrites existing file when backup disabled', () => {
    withTmpDir('merlon-backup-overwrite-', (docsRoot) => {
      const outPath = join(docsRoot, '_build', 'guide.md');
      mkdirSync(join(docsRoot, '_build'), { recursive: true });
      writeFileSync(outPath, 'old content\n');

      writeOutputFile(outPath, 'new content\n', backupCtx(docsRoot));
      expect(readFileSync(outPath, 'utf-8')).toBe('new content\n');
      expect(existsSync(join(docsRoot, '_build', '.caches', 'backups'))).toBe(false);
    });
  });

  it('moves existing file to cache backup path when enabled', () => {
    withTmpDir('merlon-backup-move-', (docsRoot) => {
      const outPath = join(docsRoot, '_build', 'guide.md');
      mkdirSync(join(docsRoot, '_build'), { recursive: true });
      writeFileSync(outPath, 'old content\n');

      const backup: WriteOutputBackupOptions = { enabled: true };
      const result = writeOutputFile(outPath, 'new content\n', {
        ...backupCtx(docsRoot),
        backup,
      });

      const expectedBackup = join(docsRoot, '_build', '.caches', 'backups', '_build', 'guide.md');
      expect(result.backupPath).toBe(expectedBackup);
      expect(readFileSync(expectedBackup, 'utf-8')).toBe('old content\n');
      expect(readFileSync(outPath, 'utf-8')).toBe('new content\n');
      expect(existsSync(join(docsRoot, '_build', 'guide.md.bak'))).toBe(false);
    });
  });

  it('respects custom dir and ext', () => {
    withTmpDir('merlon-backup-custom-', (docsRoot) => {
      const outPath = join(docsRoot, '_build', 'out.md');
      mkdirSync(join(docsRoot, '_build'), { recursive: true });
      writeFileSync(outPath, 'prior\n');

      const result = writeOutputFile(outPath, 'next\n', {
        ...backupCtx(docsRoot),
        backup: { enabled: true, dir: 'archive', ext: '.bak' },
      });

      const expectedBackup = join(docsRoot, '_build', 'archive', '_build', 'out.md.bak');
      expect(result.backupPath).toBe(expectedBackup);
      expect(readFileSync(expectedBackup, 'utf-8')).toBe('prior\n');
    });
  });
});

describe('writeCompiledGuides backup', () => {
  it('backs up publish target in cache not beside file', () => {
    withTmpDir('merlon-backup-publish-', (work) => {
      const guideDir = join(work, 'guide');
      const publishDir = join(work, 'publish');
      mkdirSync(guideDir, { recursive: true });
      mkdirSync(publishDir, { recursive: true });

      writeFileSync(join(guideDir, 'index.md'), '# Guide\n\n- [Intro](intro.md)\n');
      writeFileSync(join(guideDir, 'intro.md'), '# Guide\n\nBody.\n');

      const publishOut = join(publishDir, 'README.md');
      writeFileSync(publishOut, 'hand-authored README\n');

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
              outputFile: 'publish/README.md',
              includeBanner: false,
              preambleSection: 'about-this-guide.md',
              manifest: 'index.md',
              stripAnchors: true,
            },
          },
        ],
        backup: { enabled: true },
      };

      writeCompiledGuides(opts);
      const backupPath = join(work, '.caches', 'backups', 'publish', 'README.md');
      expect(existsSync(backupPath)).toBe(true);
      expect(readFileSync(backupPath, 'utf-8')).toBe('hand-authored README\n');
      expect(readFileSync(publishOut, 'utf-8')).toContain('Guide');
      expect(existsSync(join(publishDir, 'README.md.bak'))).toBe(false);
    });
  });
});
