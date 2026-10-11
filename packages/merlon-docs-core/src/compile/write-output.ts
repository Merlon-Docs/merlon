import { existsSync, mkdirSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import type { MerlonConfig, MerlonConfigInput } from '../config/schema.js';

export const DEFAULT_BACKUP_DIR = '.caches/backups';

export interface WriteOutputBackupOptions {
  enabled: boolean;
  dir?: string;
  ext?: string;
}

export interface WriteOutputContext {
  docsRoot: string;
  outputDir: string;
  backup?: WriteOutputBackupOptions;
}

export interface CliBackupOverrides {
  backup?: boolean;
  backupDir?: string;
  backupExt?: string;
}

export function resolveBackupOptions(
  config?: MerlonConfig | MerlonConfigInput,
  cli?: CliBackupOverrides,
): WriteOutputBackupOptions {
  const cfg = config && 'backup' in config && config.backup ? config.backup : undefined;
  const parsed =
    cfg && typeof cfg === 'object' && 'enabled' in cfg
      ? cfg
      : { enabled: false, dir: DEFAULT_BACKUP_DIR, ext: '' };

  const enabled = cli?.backup ?? parsed.enabled ?? false;
  if (!enabled) return { enabled: false };

  return {
    enabled: true,
    dir: cli?.backupDir ?? parsed.dir ?? DEFAULT_BACKUP_DIR,
    ext: cli?.backupExt ?? parsed.ext ?? '',
  };
}

export function resolveBackupPath(outPath: string, ctx: WriteOutputContext): string {
  if (!ctx.backup?.enabled) {
    throw new Error('resolveBackupPath requires backup.enabled');
  }
  const backupDir = ctx.backup.dir ?? DEFAULT_BACKUP_DIR;
  const ext = ctx.backup.ext ?? '';
  const relKey = relative(ctx.docsRoot, outPath);
  const backupRoot = resolve(ctx.docsRoot, ctx.outputDir, backupDir);
  return join(backupRoot, relKey + ext);
}

export function writeOutputFile(
  outPath: string,
  text: string,
  ctx: WriteOutputContext,
): { backupPath?: string } {
  mkdirSync(dirname(outPath), { recursive: true });

  let backupPath: string | undefined;
  if (ctx.backup?.enabled && existsSync(outPath)) {
    backupPath = resolveBackupPath(outPath, ctx);
    mkdirSync(dirname(backupPath), { recursive: true });
    renameSync(outPath, backupPath);
  }

  writeFileSync(outPath, text, 'utf-8');
  return { backupPath };
}
