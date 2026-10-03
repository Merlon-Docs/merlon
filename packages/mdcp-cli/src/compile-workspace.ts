import {
  compileGuideResultsWithContext,
  compileGuidesFromResults,
  writeCompiledGuidesFromResults,
  lintLinks,
  resolveDocsRoot,
  resolveBackupOptions,
  resolveOutputPath,
  type CompileGuideResult,
  type CompileOptions,
  type MdcpConfig,
  type LinkIssue,
  type LinkSeverity,
  type GuideLinkIndex,
  type ShardCache,
} from '@bwilliamson/mdcp-core';

export interface GlobalCompileOpts {
  backup?: boolean;
  backupDir?: string;
  backupExt?: string;
}

export interface CompileWorkspace {
  opts: CompileOptions;
  results: CompileGuideResult[];
  compiled: string;
  linkIndex: GuideLinkIndex;
  shardCache: ShardCache;
}

export function compileOptions(
  config: MdcpConfig,
  docsRoot: string,
  globalOpts: GlobalCompileOpts,
): CompileOptions {
  return {
    guidesRoot: resolveDocsRoot(config, docsRoot),
    compileOrder: config.compileOrder,
    banner: config.banner,
    guides: config.guides,
    docsRoot,
    config,
    backup: resolveBackupOptions(config, {
      backup: globalOpts.backup,
      backupDir: globalOpts.backupDir,
      backupExt: globalOpts.backupExt,
    }),
  };
}

export function compileWorkspace(
  config: MdcpConfig,
  docsRoot: string,
  globalOpts: GlobalCompileOpts,
): CompileWorkspace {
  const opts = compileOptions(config, docsRoot, globalOpts);
  const { results, linkIndex, shardCache } = compileGuideResultsWithContext(opts);
  const compiled = compileGuidesFromResults(results, opts);
  return { opts, results, compiled, linkIndex, shardCache };
}

export function writeCompiledFromWorkspace(
  config: MdcpConfig,
  docsRoot: string,
  workspace: CompileWorkspace,
): { path: string; lines: number; backupPath?: string }[] {
  const monolithPath = resolveOutputPath(config, docsRoot);
  return writeCompiledGuidesFromResults(workspace.results, workspace.opts, monolithPath);
}

export function runBuiltInLinkLintFromWorkspace(
  config: MdcpConfig,
  docsRoot: string,
  workspace: CompileWorkspace,
  scanRoot?: string,
): LinkIssue[] {
  if (config.lint?.links?.enabled === false) return [];
  return lintLinks({
    config,
    docsRoot,
    results: workspace.results,
    compileOptions: workspace.opts,
    linkIndex: workspace.linkIndex,
    shardCache: workspace.shardCache,
    scanRoot,
  });
}

export function resolveLinkSeverity(
  warnBrokenLinks: boolean | undefined,
  config: MdcpConfig,
): LinkSeverity {
  if (warnBrokenLinks) return 'warn';
  return config.lint?.links?.severity ?? 'error';
}
