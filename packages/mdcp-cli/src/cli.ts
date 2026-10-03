#!/usr/bin/env node
import cac from 'cac';
import { readFileSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  loadConfig,
  resolveOutputPath,
  resolveDocsRoot,
  resolveGuideDir,
  getGuideConfig,
  guideScanDirs,
  shardLintPaths,
  checkOrphansForGuides,
  computeCoverage,
  effectiveGuideOutputFile,
  resolveUnderOutputDir,
  type CoverageOptions,
  genRefsFromCompiled,
  checkRefsRegistry,
  resolveRefsPath,
  readRefsRegistry,
  findPeerBinary,
  runPeer,
  probeDocumentPaths,
  formatPathProbeIssue,
  pathProbeInputs,
  shardFromMonolith,
  formatLinkIssue,
  type LinkIssue,
  type LinkSeverity,
  type MdcpConfig,
  ILLUSTRATIVE_MARKER,
} from '@bwilliamson/mdcp-core';
import {
  compileWorkspace,
  writeCompiledFromWorkspace,
  runBuiltInLinkLintFromWorkspace,
  resolveLinkSeverity,
} from './compile-workspace.js';

interface GlobalOpts {
  config: string;
  docsRoot?: string;
  backup?: boolean;
  backupDir?: string;
  backupExt?: string;
  warnBrokenLinks?: boolean;
}

function getDocsRoot(opts: GlobalOpts): string {
  return opts.docsRoot ?? process.cwd();
}

function getConfig(opts: GlobalOpts) {
  return loadConfig(opts.config, process.cwd());
}

/**
 * Scan root for coverage: `scan.root` (resolved against the invocation dir) else the
 * invocation dir — not the docs root, since package READMEs live outside `docs/`.
 */
function getScanRoot(config: MdcpConfig): string {
  if (config.scan?.root) return resolve(process.cwd(), config.scan.root);
  return process.cwd();
}

function coverageInputs(config: MdcpConfig, opts: GlobalOpts): CoverageOptions {
  const docsRoot = getDocsRoot(opts);
  const outputFiles: string[] = [];
  const guideDirs: string[] = [];
  for (const name of config.compileOrder) {
    const cfg = getGuideConfig(config, name);
    guideDirs.push(resolveGuideDir(name, config, docsRoot));
    // scopeRoot trees (e.g. shared glossary) are compiled into guides — treat as captured.
    if (cfg?.compile?.scopeRoot) {
      guideDirs.push(resolve(docsRoot, cfg.compile.scopeRoot));
    }
    const outFile = effectiveGuideOutputFile(name, cfg?.compile, config.compileOrder.length);
    outputFiles.push(resolveUnderOutputDir(docsRoot, config.outputDir, outFile));
  }
  const topOutput = resolveOutputPath(config, docsRoot);
  if (topOutput) outputFiles.push(topOutput);
  return {
    root: getScanRoot(config),
    guideDirs,
    outputFiles,
    standaloneGuides: config.standaloneGuides,
    ignore: config.scan?.ignore ?? [],
    gitignore: config.scan?.gitignore ?? true,
  };
}

function valeScanPaths(config: MdcpConfig, docsRoot: string): string[] {
  return (
    config.vale?.scanGlobs?.map((g) => resolve(docsRoot, g)) ?? guideScanDirs(config, docsRoot)
  );
}

function guideEntries(config: MdcpConfig, docsRoot: string) {
  return config.compileOrder.map((name) => {
    const cfg = getGuideConfig(config, name);
    return {
      name,
      dir: resolveGuideDir(name, config, docsRoot),
      manifest: cfg?.compile?.manifest,
      sectionsHeading: cfg?.compile?.sectionsHeading,
      scopeRoot: cfg?.compile?.scopeRoot ? resolve(docsRoot, cfg.compile.scopeRoot) : undefined,
    };
  });
}

function valeMinAlertLevel(config: MdcpConfig, strictFlag?: boolean): string | undefined {
  if (strictFlag) return 'error';
  return config.vale?.strictMinAlertLevel;
}

function resolveLinkTarget(config: MdcpConfig, docsRoot: string): string | undefined {
  if (config.lint?.links?.target) return config.lint.links.target;
  return resolveOutputPath(config, docsRoot);
}

function cliBackupFlags(opts: GlobalOpts) {
  return {
    backup: opts.backup,
    backupDir: opts.backupDir,
    backupExt: opts.backupExt,
  };
}

/** Print link diagnostics; returns true when caller should fail (severity error + issues). */
function reportLinkIssues(issues: LinkIssue[], severity: LinkSeverity): boolean {
  for (const issue of issues) {
    console.error(formatLinkIssue(issue, severity));
  }
  return severity === 'error' && issues.length > 0;
}

function collectBuiltInLinkIssues(
  config: MdcpConfig,
  docsRoot: string,
  globalOpts: GlobalOpts,
  workspace: ReturnType<typeof compileWorkspace>,
  scanRoot?: string,
): { issues: LinkIssue[]; severity: LinkSeverity } {
  const issues = runBuiltInLinkLintFromWorkspace(config, docsRoot, workspace, scanRoot);
  const severity = resolveLinkSeverity(globalOpts.warnBrokenLinks, config);
  return { issues, severity };
}

function runBuiltInLinkLint(
  config: MdcpConfig,
  docsRoot: string,
  globalOpts: GlobalOpts,
  workspace: ReturnType<typeof compileWorkspace>,
): boolean {
  const { issues, severity } = collectBuiltInLinkIssues(config, docsRoot, globalOpts, workspace);
  return reportLinkIssues(issues, severity);
}

interface CheckFailure {
  step: string;
  detail: string;
  hints: string[];
}

const LINK_KIND_HINTS: Record<LinkIssue['kind'], string> = {
  'dead anchor':
    'dead anchor: update the #fragment to a slug from compiled output (`mdcp refs list`).',
  'missing file': 'missing file: create the target file or fix the relative path in the shard.',
  'missing publish path':
    'missing publish path: link a published guide outputFile, or list the target guide in compile.crossGuideLinks.ignoreGuides when shard paths are intentional. Do not link durable docs to pending .changeset/*.md files.',
};

function linkRemediationHints(issues: LinkIssue[]): string[] {
  const kinds = [...new Set(issues.map((i) => i.kind))];
  return kinds.map((k) => LINK_KIND_HINTS[k]);
}

function reportCheckFailures(failures: CheckFailure[]): void {
  console.error('');
  console.error('mdcp check failed:');
  for (const f of failures) {
    console.error(`  - ${f.step}: ${f.detail}`);
    for (const hint of f.hints) {
      console.error(`    → ${hint}`);
    }
  }
  console.error('');
  console.error('Resolve the diagnostics above, then re-run: mdcp check');
}

function compileToString(config: MdcpConfig, docsRoot: string, globalOpts: GlobalOpts): string {
  return compileWorkspace(config, docsRoot, cliBackupFlags(globalOpts)).compiled;
}

function logWritten(results: { path: string; lines: number; backupPath?: string }[]): void {
  for (const r of results) {
    if (r.backupPath) console.log(`backed up → ${r.backupPath}`);
    console.log(`→ ${r.path} (${r.lines} lines)`);
  }
}

function writeCompiled(config: MdcpConfig, docsRoot: string, globalOpts: GlobalOpts): string {
  const workspace = compileWorkspace(config, docsRoot, cliBackupFlags(globalOpts));
  const written = writeCompiledFromWorkspace(config, docsRoot, workspace);
  logWritten(written);
  return workspace.compiled;
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf-8')) as {
  version: string;
};

const cli = cac('mdcp');
cli.version(pkg.version);
cli.help();

cli
  .option('-c, --config <path>', 'config file (relative to invocation directory)', {
    default: 'mdcp.config.json',
  })
  .option('--docs-root <path>', 'docs root (guide shard directories)')
  .option('--backup', 'Move existing output files to cache before overwrite')
  .option('--backup-dir <path>', 'Backup directory relative to outputDir')
  .option('--backup-ext <ext>', 'Suffix for backup filenames')
  .option('--warn-broken-links', 'Report broken links but exit 0');

cli.command('compile', 'Compile shards to monolith').action((opts: GlobalOpts) => {
  const config = getConfig(opts);
  const docsRoot = getDocsRoot(opts);
  const workspace = compileWorkspace(config, docsRoot, cliBackupFlags(opts));
  const written = writeCompiledFromWorkspace(config, docsRoot, workspace);
  logWritten(written);
  const refsPath = resolveRefsPath(docsRoot, config.outputDir, config.refs.registryFile);
  genRefsFromCompiled(workspace.compiled, refsPath);
  if (runBuiltInLinkLint(config, docsRoot, opts, workspace)) process.exit(1);
});

cli.command('refs-gen', 'Generate refs.json from compiled output').action((opts: GlobalOpts) => {
  const config = getConfig(opts);
  const compiled = writeCompiled(config, getDocsRoot(opts), opts);
  const refsPath = resolveRefsPath(getDocsRoot(opts), config.outputDir, config.refs.registryFile);
  genRefsFromCompiled(compiled, refsPath);
  console.log(`Wrote ${refsPath}`);
});

cli.command('refs-check', 'Verify refs.json matches compiled output').action((opts: GlobalOpts) => {
  const config = getConfig(opts);
  const compiled = compileToString(config, getDocsRoot(opts), opts);
  const refsPath = resolveRefsPath(getDocsRoot(opts), config.outputDir, config.refs.registryFile);
  const result = checkRefsRegistry(compiled, refsPath);
  console.log(result.message);
  if (!result.ok) process.exit(1);
});

cli
  .command('refs-list', 'List heading slugs as JSON')
  .option('--format <fmt>', 'json or table', { default: 'json' })
  .action((opts: GlobalOpts & { format: string }) => {
    const config = getConfig(opts);
    const refsPath = resolveRefsPath(getDocsRoot(opts), config.outputDir, config.refs.registryFile);
    const registry = readRefsRegistry(refsPath);
    if (opts.format === 'table') {
      for (const h of registry.headings) {
        console.log(`${h.slug}\t${h.title}`);
      }
    } else {
      console.log(JSON.stringify(registry.headings, null, 2));
    }
  });

cli.command('export [...args]', 'Removed — use the Agent Skill and shard reads').action(() => {
  console.error(
    'mdcp export was removed. Install the Agent Skill (npx skills add betsalel-williamson/mdcp --skill mdcp), read one shard via host search, or use compiled output under outputDir. Legacy --llm / --llms-index / --fetch are no longer supported.',
  );
  process.exit(1);
});

cli
  .command('lint', 'Run markdownlint-cli2 (peer)')
  .option('--require-lint', 'Fail if markdownlint not installed')
  .action((opts: GlobalOpts & { requireLint?: boolean }) => {
    const config = getConfig(opts);
    const tool = findPeerBinary('markdownlint-cli2', getDocsRoot(opts));
    const shardsCfg = config.lint?.markdownlint?.shardsConfig;
    const compiledCfg = config.lint?.markdownlint?.compiledConfig;

    if (shardsCfg) {
      const shardPaths = shardLintPaths(config, getDocsRoot(opts));
      const r = runPeer(tool, {
        require: opts.requireLint,
        cwd: getDocsRoot(opts),
        args: ['--config', shardsCfg, ...shardPaths],
      });
      if (r.exitCode !== 0) process.exit(r.exitCode);
    }

    writeCompiled(config, getDocsRoot(opts), opts);

    if (compiledCfg) {
      const r = runPeer(tool, {
        require: opts.requireLint,
        cwd: getDocsRoot(opts),
        args: ['--config', compiledCfg],
      });
      if (r.exitCode !== 0) process.exit(r.exitCode);
    }
  });

cli
  .command('prose', 'Run Vale prose lint (peer)')
  .option('--strict', 'Errors only')
  .option('--require-vale', 'Fail if Vale not installed')
  .action((opts: GlobalOpts & { strict?: boolean; requireVale?: boolean }) => {
    const config = getConfig(opts);
    const tool = findPeerBinary('vale', getDocsRoot(opts));
    const scanPaths = valeScanPaths(config, getDocsRoot(opts));
    const valeConfig = config.vale?.config ?? '.vale.ini';
    const minLevel = valeMinAlertLevel(config, opts.strict);
    const args = minLevel
      ? ['--config', valeConfig, `--minAlertLevel=${minLevel}`, ...scanPaths]
      : ['--config', valeConfig, ...scanPaths];
    const r = runPeer(tool, { require: opts.requireVale, cwd: getDocsRoot(opts), args });
    if (r.exitCode !== 0) process.exit(r.exitCode);
  });

cli.command('links', 'Run markdown-link-check (peer)').action((opts: GlobalOpts) => {
  const config = getConfig(opts);
  writeCompiled(config, getDocsRoot(opts), opts);
  const tool = findPeerBinary('markdown-link-check', getDocsRoot(opts));
  const target = resolveLinkTarget(config, getDocsRoot(opts));
  const linkCfg = config.lint?.links?.config;
  if (!target) {
    console.error('mdcp links: set lint.links.target or outputFile in config');
    process.exit(1);
  }
  const args = linkCfg ? [target, '--config', linkCfg] : [target];
  const r = runPeer(tool, { cwd: getDocsRoot(opts), args });
  if (r.exitCode !== 0) process.exit(r.exitCode);
});

cli.command('fix', 'Auto-fix with Prettier + markdownlint (peer)').action((opts: GlobalOpts) => {
  const prettier = findPeerBinary('prettier', getDocsRoot(opts));
  runPeer(prettier, { cwd: getDocsRoot(opts), args: ['--write', '.'] });
  const mdlint = findPeerBinary('markdownlint-cli2', getDocsRoot(opts));
  runPeer(mdlint, { cwd: getDocsRoot(opts), args: ['--fix'] });
});

cli.command('shard', 'Split monolith into shards (md-tree)').action((opts: GlobalOpts) => {
  const config = getConfig(opts);
  if (!config.source) {
    console.error('Config requires "source" for shard command');
    process.exit(1);
  }
  const guidesRoot = resolveDocsRoot(config, getDocsRoot(opts));
  const sourceFile = resolve(getDocsRoot(opts), config.source);

  const mappings = (config.guides ?? []).map((g) => {
    if (g.source?.type === 'directory') {
      return { name: g.name, directoryPath: g.source.path, splitLevel: g.splitLevel };
    }
    if (g.source?.type === 'merge') {
      return {
        name: g.name,
        mergeH1Indices: g.source.parts.map((p) => p.fromH1Extract),
        demoteFirstH1InMerge: g.source.parts.map((p) => p.demoteFirstH1 ?? false),
        splitLevel: g.splitLevel,
      };
    }
    if (g.source?.type === 'h1Extract') {
      return { name: g.name, h1Index: g.source.index, splitLevel: g.splitLevel };
    }
    throw new Error(`Guide ${g.name} needs h1Extract, merge, or directory source for shard`);
  });

  const firstSource = config.guides?.[0]?.source;
  const preambleHeading =
    firstSource && firstSource.type !== 'directory' ? firstSource.preamble?.promoteToH2 : undefined;

  shardFromMonolith({
    sourceFile,
    guidesRoot,
    mappings,
    compileOrder: config.compileOrder,
    preambleHeading,
  });

  console.log('Done. Edit shards and run: mdcp compile');
});

cli
  .command('check', 'Full validation gate')
  .option('--require-lint', 'Require markdownlint-cli2')
  .option('--require-vale', 'Require Vale')
  .option('--skip-vale', 'Skip Vale')
  .action(
    (opts: GlobalOpts & { requireLint?: boolean; requireVale?: boolean; skipVale?: boolean }) => {
      const config = getConfig(opts);
      const failures: CheckFailure[] = [];

      const orphans = checkOrphansForGuides(guideEntries(config, getDocsRoot(opts)));
      for (const o of orphans) {
        console.error(`orphan: ${o.message}`);
      }
      if (orphans.length > 0) {
        console.error('');
        console.error(
          `mdcp check failed: ${orphans.length} orphan shard(s). Add them to a guide index or remove unused files.`,
        );
        process.exit(1);
      }

      const docsRoot = getDocsRoot(opts);
      const workspace = compileWorkspace(config, docsRoot, cliBackupFlags(opts));
      const written = writeCompiledFromWorkspace(config, docsRoot, workspace);
      logWritten(written);

      const refsPath = resolveRefsPath(docsRoot, config.outputDir, config.refs.registryFile);
      genRefsFromCompiled(workspace.compiled, refsPath);
      const refsResult = checkRefsRegistry(workspace.compiled, refsPath);
      console.log(refsResult.message);
      if (!refsResult.ok) {
        console.error('');
        console.error(
          'mdcp check failed: refs registry mismatch. Re-run `mdcp compile` or `mdcp refs gen`, then `mdcp check`.',
        );
        process.exit(1);
      }

      const { issues: linkIssues, severity: linkSeverity } = collectBuiltInLinkIssues(
        config,
        docsRoot,
        opts,
        workspace,
        getScanRoot(config),
      );
      if (reportLinkIssues(linkIssues, linkSeverity)) {
        failures.push({
          step: 'built-in links',
          detail: `${linkIssues.length} issue(s) (see \`link:\` lines above)`,
          hints: linkRemediationHints(linkIssues),
        });
      }

      const mdlint = findPeerBinary('markdownlint-cli2', getDocsRoot(opts));
      const shardsCfg = config.lint?.markdownlint?.shardsConfig;
      const compiledCfg = config.lint?.markdownlint?.compiledConfig;
      if (shardsCfg) {
        const shardPaths = shardLintPaths(config, getDocsRoot(opts));
        const r = runPeer(mdlint, {
          require: opts.requireLint,
          cwd: getDocsRoot(opts),
          args: ['--config', shardsCfg, ...shardPaths],
        });
        if (r.exitCode !== 0) {
          failures.push({
            step: 'markdownlint (shards)',
            detail: 'peer exited non-zero (see markdownlint output above)',
            hints: [
              'Fix flagged shard markdown, or run `mdcp fix` when Prettier/markdownlint fix is configured.',
            ],
          });
        }
      }
      if (compiledCfg) {
        const r = runPeer(mdlint, {
          require: opts.requireLint,
          cwd: getDocsRoot(opts),
          args: ['--config', compiledCfg],
        });
        if (r.exitCode !== 0) {
          failures.push({
            step: 'markdownlint (compiled)',
            detail: 'peer exited non-zero (see markdownlint output above)',
            hints: ['Fix shard sources that compile into the flagged output, then recompile.'],
          });
        }
      }

      const linkTool = findPeerBinary('markdown-link-check', getDocsRoot(opts));
      const linkTarget = resolveLinkTarget(config, getDocsRoot(opts));
      const linkCfg = config.lint?.links?.config;
      if (linkTool.found && linkCfg && linkTarget) {
        const r = runPeer(linkTool, {
          cwd: getDocsRoot(opts),
          args: [linkTarget, '--config', linkCfg],
        });
        if (r.exitCode !== 0) {
          failures.push({
            step: 'markdown-link-check',
            detail: 'peer exited non-zero (see peer output above)',
            hints: [
              'Repair external/HTTP URLs reported by markdown-link-check, or adjust lint.links.config.',
            ],
          });
        }
      }

      if (!opts.skipVale) {
        const vale = findPeerBinary('vale', getDocsRoot(opts));
        const scanPaths = valeScanPaths(config, getDocsRoot(opts));
        const valeConfig = config.vale?.config ?? '.vale.ini';
        const minLevel = valeMinAlertLevel(config, true) ?? 'error';
        const r = runPeer(vale, {
          require: opts.requireVale,
          cwd: getDocsRoot(opts),
          args: ['--config', valeConfig, `--minAlertLevel=${minLevel}`, ...scanPaths],
        });
        if (r.exitCode !== 0) {
          failures.push({
            step: 'vale',
            detail: 'peer exited non-zero (see Vale output above)',
            hints: [
              'Fix prose style alerts, or use `--skip-vale` only when prose is intentionally out of scope.',
            ],
          });
        }
      }

      const pathSeverity = config.lint?.paths?.severity ?? 'off';
      if (pathSeverity !== 'off') {
        const pathIssues = probeDocumentPaths(
          pathProbeInputs(config, getDocsRoot(opts), getScanRoot(config)),
        );
        for (const issue of pathIssues) {
          console.error(formatPathProbeIssue(issue, pathSeverity));
        }
        if (pathIssues.length > 0 && pathSeverity === 'error') {
          failures.push({
            step: 'path resolution',
            detail: `${pathIssues.length} unresolved path(s) in prose (see \`path:\` lines above)`,
            hints: [
              'Update the path to what the repository now contains, or delete the claim when the thing it names is gone.',
              `Add ${ILLUSTRATIVE_MARKER} on its own line when a file's paths teach syntax instead of describing this repository.`,
              'Add lint.paths.generated for paths that only exist after a build or install.',
              'Add lint.paths.vocabulary for a name this repository documents without having.',
            ],
          });
        }
      }

      const coverage = computeCoverage(coverageInputs(config, opts));
      for (const p of coverage.uncaptured) console.error(`uncaptured: ${p}`);
      for (const p of coverage.missingStandalone) console.error(`missing-standalone: ${p}`);
      const coverageGaps = coverage.uncaptured.length + coverage.missingStandalone.length;
      if (coverageGaps > 0) {
        const strict = config.scan?.strict === true;
        console.error(
          `coverage: ${coverage.uncaptured.length} uncaptured, ${coverage.missingStandalone.length} missing standalone` +
            (strict ? '' : ' (non-fatal; set scan.strict to fail check)'),
        );
        if (strict) {
          console.error('');
          console.error(
            'mdcp check failed: coverage gaps. Fold files into a guide, register standaloneGuides, or add scan.ignore.',
          );
          process.exit(1);
        }
      }

      if (failures.length > 0) {
        reportCheckFailures(failures);
        process.exit(1);
      }
      console.log('mdcp check passed');
    },
  );

try {
  // Backwards compatibility for `refs <subcommand>` -> `refs-<subcommand>`
  // This is needed because cac does not support spaces in command names like `refs gen`
  // so we register them as `refs-gen` etc, and map `refs gen` to `refs-gen`.
  if (process.argv[2] === 'refs' && process.argv[3] && !process.argv[3].startsWith('-')) {
    process.argv.splice(2, 2, `refs-${process.argv[3]}`);
  }

  cli.parse();

  if (cli.options.help || cli.options.version) {
    process.exit(0);
  }

  if (cli.args.length > 0 && !cli.matchedCommand) {
    console.error(`Invalid command: ${cli.args.join(' ')}`);
    process.exit(1);
  }
  if (!cli.matchedCommand) {
    cli.outputHelp();
    process.exit(1);
  }
} catch (e: unknown) {
  if (e instanceof Error) {
    console.error(e.message);
  } else {
    console.error(String(e));
  }
  process.exit(1);
}
