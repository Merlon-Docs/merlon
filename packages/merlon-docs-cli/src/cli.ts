#!/usr/bin/env node
import cac from 'cac';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { dirname, isAbsolute, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  loadConfig,
  resolveOutputPath,
  resolveDocsRoot,
  resolveGuideDir,
  getGuideConfig,
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
  reviewDocs,
  formatReviewReport,
  refsOutputTexts,
  type HeadingEntry,
  type LinkIssue,
  type LinkSeverity,
  type MerlonConfig,
  type RefsOutputText,
  ILLUSTRATIVE_MARKER,
} from '@merlon-docs/merlon-docs-core';
import {
  compileWorkspace,
  writeCompiledFromWorkspace,
  runBuiltInLinkLintFromWorkspace,
  resolveLinkSeverity,
} from './compile-workspace.js';
import { valeArgs, valeCheckHints, valeScanPaths } from './vale-args.js';
import { migrateFormerConfigText } from './former-config.js';

interface GlobalOpts {
  config?: string;
  docsRoot?: string;
  backup?: boolean;
  backupDir?: string;
  backupExt?: string;
  warnBrokenLinks?: boolean;
  diagnosticsDir?: string;
  errorsFile?: string;
  warningsFile?: string;
}

function getDocsRoot(opts: GlobalOpts): string {
  return opts.docsRoot ?? process.cwd();
}

const DEFAULT_CONFIG = 'merlon.config.json';
/** The config file name before the rename to Merlon Docs, migrated until 2.0.0. */
const FORMER_DEFAULT_CONFIG = 'mdcp.config.json';

/**
 * The config path for a run: `--config` when given, else `merlon.config.json`. When only
 * the former `mdcp.config.json` exists, write its contents to `merlon.config.json` with
 * its version key renamed to `configVersion`, delete the former file and print an
 * upgrade notice to stderr. If the new file can't be written, read the former one.
 */
function configPath(opts: GlobalOpts): string {
  if (opts.config !== undefined) return opts.config;
  const cwd = process.cwd();
  const current = resolve(cwd, DEFAULT_CONFIG);
  const former = resolve(cwd, FORMER_DEFAULT_CONFIG);
  if (existsSync(current) || !existsSync(former)) return DEFAULT_CONFIG;
  const text = readFileSync(former, 'utf-8');
  const migrated = migrateFormerConfigText(text);
  try {
    writeFileSync(current, migrated, { flag: 'wx' });
  } catch (err) {
    console.error(
      `Reading ${FORMER_DEFAULT_CONFIG}: could not write ${DEFAULT_CONFIG} (${(err as Error).message}). Rename the file yourself.`,
    );
    return FORMER_DEFAULT_CONFIG;
  }
  unlinkSync(former);
  const keyNote = migrated === text ? '' : ', and its version key is now configVersion';
  console.error(
    `Upgraded ${FORMER_DEFAULT_CONFIG} to ${DEFAULT_CONFIG}${keyNote}. Commit the new file in place of the old one.`,
  );
  return DEFAULT_CONFIG;
}

function getConfig(opts: GlobalOpts) {
  return loadConfig(configPath(opts), process.cwd());
}

/**
 * The invocation dir, spelled like `--docs-root` when both name the same directory.
 * `process.cwd()` is always the real path, so on macOS a docs root under `/var` (a symlink
 * to `/private/var`) would otherwise not match the scan root that coverage compares it to.
 */
function getInvocationDir(opts: GlobalOpts): string {
  const cwd = process.cwd();
  if (opts.docsRoot === undefined) return cwd;
  const docsRoot = resolve(opts.docsRoot);
  try {
    return realpathSync(docsRoot) === cwd ? docsRoot : cwd;
  } catch {
    return cwd;
  }
}

/**
 * Scan root for coverage: `scan.root` (resolved against the invocation dir) else the
 * invocation dir — not the docs root, since package READMEs live outside `docs/`.
 */
function getScanRoot(config: MerlonConfig, opts: GlobalOpts): string {
  const dir = getInvocationDir(opts);
  if (config.scan?.root) return resolve(dir, config.scan.root);
  return dir;
}

function coverageInputs(config: MerlonConfig, opts: GlobalOpts): CoverageOptions {
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
    root: getScanRoot(config, opts),
    guideDirs,
    outputFiles,
    standaloneGuides: config.standaloneGuides,
    ignore: config.scan?.ignore ?? [],
    gitignore: config.scan?.gitignore ?? true,
  };
}

function guideEntries(config: MerlonConfig, docsRoot: string) {
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

function resolveLinkTarget(config: MerlonConfig, docsRoot: string): string | undefined {
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
function reportLinkIssues(
  issues: LinkIssue[],
  severity: LinkSeverity,
  sinkLines?: string[],
): boolean {
  for (const issue of issues) {
    const formatted = formatLinkIssue(issue, severity);
    console.error(formatted);
    sinkLines?.push(formatted);
  }
  return severity === 'error' && issues.length > 0;
}

function collectBuiltInLinkIssues(
  config: MerlonConfig,
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
  config: MerlonConfig,
  docsRoot: string,
  globalOpts: GlobalOpts,
  workspace: ReturnType<typeof compileWorkspace>,
): boolean {
  const { issues, severity } = collectBuiltInLinkIssues(config, docsRoot, globalOpts, workspace);
  const lines: string[] = [];
  const failed = reportLinkIssues(issues, severity, lines);
  writeDiagnosticSinks(
    config,
    docsRoot,
    globalOpts,
    severity === 'error' ? lines : [],
    severity === 'warn' ? lines : [],
  );
  return failed;
}

interface CheckStepDiagnostic {
  step: string;
  detail: string;
  hints: string[];
}

const LINK_KIND_HINTS: Record<LinkIssue['kind'], string> = {
  'dead anchor':
    "dead anchor: change the #fragment to a slug of the file the link points at, which for a bare #fragment is the file that holds it. A bare #fragment may also point at a section's id there, such as a FIND-* id or a declared {#id}. For a compiled output, `merlon refs-list --format table` lists its slugs by file, relative to the docs root. A standalone guide's headings aren't in the registry.",
  'missing file': 'missing file: create the target file or fix the relative path in the shard.',
  'missing publish path':
    'missing publish path: link a published guide outputFile, or list the target guide in compile.crossGuideLinks.ignoreGuides when shard paths are intentional. Do not link durable docs to pending .changeset/*.md files.',
};

const PATH_RESOLUTION_HINTS = [
  'Update the path to what the repository now contains, or delete the claim when the thing it names is gone.',
  `Add ${ILLUSTRATIVE_MARKER} on its own line when a file's paths teach syntax instead of describing this repository.`,
  'Add lint.paths.generated for paths that only exist after a build or install.',
  'Add lint.paths.vocabulary for a name this repository documents without having.',
];

const COVERAGE_HINTS = ['Fold files into a guide, register standaloneGuides, or add scan.ignore.'];

function linkRemediationHints(issues: LinkIssue[]): string[] {
  const kinds = [...new Set(issues.map((i) => i.kind))];
  return kinds.map((k) => LINK_KIND_HINTS[k]);
}

function resolveDiagnosticSinkPaths(
  config: MerlonConfig,
  docsRoot: string,
  opts: GlobalOpts,
): { errorsFile?: string; warningsFile?: string } {
  const diagCfg = config.diagnostics;
  const dirOpt =
    opts.diagnosticsDir ??
    diagCfg?.dir ??
    (diagCfg?.splitFiles ? '.caches/diagnostics' : undefined);
  let baseDir: string | undefined;
  if (dirOpt !== undefined) {
    baseDir = isAbsolute(dirOpt)
      ? dirOpt
      : opts.diagnosticsDir !== undefined
        ? resolve(process.cwd(), dirOpt)
        : resolveUnderOutputDir(docsRoot, config.outputDir, dirOpt);
  }
  const errOpt = opts.errorsFile ?? diagCfg?.errorsFile;
  const warnOpt = opts.warningsFile ?? diagCfg?.warningsFile;
  const errorsFile =
    errOpt !== undefined
      ? resolve(process.cwd(), errOpt)
      : baseDir !== undefined
        ? join(baseDir, 'errors.txt')
        : undefined;
  const warningsFile =
    warnOpt !== undefined
      ? resolve(process.cwd(), warnOpt)
      : baseDir !== undefined
        ? join(baseDir, 'warnings.txt')
        : undefined;
  return { errorsFile, warningsFile };
}

function writeDiagnosticSinks(
  config: MerlonConfig,
  docsRoot: string,
  opts: GlobalOpts,
  errorLines: string[],
  warningLines: string[],
): { errorsFile?: string; warningsFile?: string } {
  const { errorsFile, warningsFile } = resolveDiagnosticSinkPaths(config, docsRoot, opts);
  if (errorsFile) {
    mkdirSync(dirname(errorsFile), { recursive: true });
    writeFileSync(errorsFile, errorLines.length > 0 ? errorLines.join('\n') + '\n' : '', 'utf-8');
  }
  if (warningsFile) {
    mkdirSync(dirname(warningsFile), { recursive: true });
    writeFileSync(
      warningsFile,
      warningLines.length > 0 ? warningLines.join('\n') + '\n' : '',
      'utf-8',
    );
  }
  return { errorsFile, warningsFile };
}

function reportCheckSummary(
  failures: CheckStepDiagnostic[],
  warnings: CheckStepDiagnostic[],
  sinks: { errorsFile?: string; warningsFile?: string },
): void {
  if (warnings.length > 0) {
    console.error('');
    console.error(`merlon check warnings (${warnings.length} step(s)):`);
    for (const w of warnings) {
      console.error(`  - ${w.step}: ${w.detail}`);
      for (const hint of w.hints) {
        console.error(`    → ${hint}`);
      }
    }
    if (sinks.warningsFile) {
      console.error(`  warnings_file: ${sinks.warningsFile}`);
    }
  }
  if (failures.length > 0) {
    console.error('');
    console.error('merlon check failed:');
    for (const f of failures) {
      console.error(`  - ${f.step}: ${f.detail}`);
      for (const hint of f.hints) {
        console.error(`    → ${hint}`);
      }
    }
    if (sinks.errorsFile) {
      console.error(`  errors_file: ${sinks.errorsFile}`);
    }
    console.error('');
    console.error('Resolve the diagnostics above, then re-run: merlon check');
  }
}

function logWritten(results: { path: string; lines: number; backupPath?: string }[]): void {
  for (const r of results) {
    if (r.backupPath) console.log(`backed up → ${r.backupPath}`);
    console.log(`→ ${r.path} (${r.lines} lines)`);
  }
}

function writeCompiled(
  config: MerlonConfig,
  docsRoot: string,
  globalOpts: GlobalOpts,
): ReturnType<typeof compileWorkspace> {
  const workspace = compileWorkspace(config, docsRoot, cliBackupFlags(globalOpts));
  const written = writeCompiledFromWorkspace(config, docsRoot, workspace);
  logWritten(written);
  return workspace;
}

/**
 * Every file a compile writes, as the refs registry records it. Only the commands that write or
 * check the registry build this list, since it stitches the monolith text again.
 */
function refsOutputsOf(workspace: ReturnType<typeof compileWorkspace>): RefsOutputText[] {
  return refsOutputTexts(workspace.results, workspace.opts);
}

/**
 * Write the refs registry for a compile: the top-level headings of `workspace.compiled`, and the
 * headings of each file the compile writes.
 */
function genRefs(
  workspace: ReturnType<typeof compileWorkspace>,
  refsPath: string,
  outputs = refsOutputsOf(workspace),
): void {
  genRefsFromCompiled(workspace.compiled, refsPath, outputs);
}

function checkRefs(
  workspace: ReturnType<typeof compileWorkspace>,
  refsPath: string,
  outputs = refsOutputsOf(workspace),
): { ok: boolean; message: string } {
  return checkRefsRegistry(workspace.compiled, refsPath, outputs);
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf-8')) as {
  version: string;
};

const cli = cac('merlon');
cli.version(pkg.version);
cli.help();

cli
  .option(
    '-c, --config <path>',
    'config file (relative to invocation directory; default merlon.config.json)',
  )
  .option('--docs-root <path>', 'docs root (guide shard directories)')
  .option('--backup', 'Move existing output files to cache before overwrite')
  .option('--backup-dir <path>', 'Backup directory relative to outputDir')
  .option('--backup-ext <ext>', 'Suffix for backup filenames')
  .option('--warn-broken-links', 'Report broken links but exit 0')
  .option('--diagnostics-dir <dir>', 'Write split errors.txt and warnings.txt into <dir>')
  .option('--errors-file <path>', 'Write error diagnostics to <path>')
  .option('--warnings-file <path>', 'Write warning diagnostics to <path>');

cli.command('compile', 'Stitch shards into compiled guides').action((opts: GlobalOpts) => {
  const config = getConfig(opts);
  const docsRoot = getDocsRoot(opts);
  const workspace = compileWorkspace(config, docsRoot, cliBackupFlags(opts));
  const written = writeCompiledFromWorkspace(config, docsRoot, workspace);
  logWritten(written);
  const refsPath = resolveRefsPath(docsRoot, config.outputDir, config.refs.registryFile);
  genRefs(workspace, refsPath);
  if (runBuiltInLinkLint(config, docsRoot, opts, workspace)) process.exit(1);
});

cli.command('refs-gen', 'Generate refs.json from compiled output').action((opts: GlobalOpts) => {
  const config = getConfig(opts);
  const workspace = writeCompiled(config, getDocsRoot(opts), opts);
  const refsPath = resolveRefsPath(getDocsRoot(opts), config.outputDir, config.refs.registryFile);
  genRefs(workspace, refsPath);
  console.log(`Wrote ${refsPath}`);
});

cli.command('refs-check', 'Verify refs.json matches compiled output').action((opts: GlobalOpts) => {
  const config = getConfig(opts);
  const workspace = compileWorkspace(config, getDocsRoot(opts), cliBackupFlags(opts));
  const refsPath = resolveRefsPath(getDocsRoot(opts), config.outputDir, config.refs.registryFile);
  const result = checkRefs(workspace, refsPath);
  console.log(result.message);
  if (!result.ok) process.exit(1);
});

cli
  .command('refs-list', 'List the heading slugs of each compiled output as JSON')
  .option('--format <fmt>', 'json or table', { default: 'json' })
  .action((opts: GlobalOpts & { format: string }) => {
    const config = getConfig(opts);
    const refsPath = resolveRefsPath(getDocsRoot(opts), config.outputDir, config.refs.registryFile);
    const registry = readRefsRegistry(refsPath);
    // A registry from an earlier release has only the top-level headings, which name no file.
    if (!registry.outputs) {
      console.error(
        `${refsPath} lists no compiled outputs; run \`merlon refs-gen\` to list each heading with its file.`,
      );
    }
    const headings: (HeadingEntry & { file?: string })[] = registry.outputs
      ? registry.outputs.flatMap((o) => o.headings.map((h) => ({ file: o.file, ...h })))
      : registry.headings;
    if (opts.format === 'table') {
      for (const h of headings) {
        const row = [h.slug, h.title];
        console.log((h.file === undefined ? row : [h.file, ...row]).join('\t'));
      }
    } else {
      console.log(JSON.stringify(headings, null, 2));
    }
  });

cli.command('export [...args]', 'Removed — use the Agent Skill and shard reads').action(() => {
  console.error(
    'merlon export was removed. Install the Agent Skill (npx skills add Merlon-Docs/merlon --skill merlon-docs), read one shard via host search, or use compiled output under outputDir. Legacy --llm / --llms-index / --fetch are no longer supported.',
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
  .option('--strict', 'Show alerts at vale.strictMinAlertLevel and above (default error)')
  .option('--require-vale', 'Fail if Vale not installed')
  .action((opts: GlobalOpts & { strict?: boolean; requireVale?: boolean }) => {
    const config = getConfig(opts);
    const tool = findPeerBinary('vale', getDocsRoot(opts));
    const scanPaths = valeScanPaths(config, getDocsRoot(opts), getScanRoot(config, opts));
    const args = valeArgs(config, scanPaths, opts.strict === true);
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
    console.error('merlon links: set lint.links.target or outputFile in config');
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

cli.command('shard', 'Split a source document into shards (md-tree)').action((opts: GlobalOpts) => {
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

  console.log('Done. Edit shards and run: merlon compile');
});

cli
  .command('check', 'Full validation gate')
  .option('--require-lint', 'Require markdownlint-cli2')
  .option('--require-vale', 'Require Vale')
  .option('--skip-vale', 'Skip Vale')
  .action(
    (opts: GlobalOpts & { requireLint?: boolean; requireVale?: boolean; skipVale?: boolean }) => {
      const config = getConfig(opts);
      const docsRoot = getDocsRoot(opts);
      const failures: CheckStepDiagnostic[] = [];
      const warnings: CheckStepDiagnostic[] = [];
      const errorLines: string[] = [];
      const warningLines: string[] = [];

      const orphans = checkOrphansForGuides(guideEntries(config, docsRoot));
      for (const o of orphans) {
        const line = `orphan: ${o.message}`;
        console.error(line);
        errorLines.push(line);
      }
      if (orphans.length > 0) {
        writeDiagnosticSinks(config, docsRoot, opts, errorLines, warningLines);
        console.error('');
        console.error(
          `merlon check failed: ${orphans.length} orphan shard(s). Add them to a guide index or remove unused files.`,
        );
        process.exit(1);
      }

      const workspace = compileWorkspace(config, docsRoot, cliBackupFlags(opts));
      const written = writeCompiledFromWorkspace(config, docsRoot, workspace);
      logWritten(written);

      const refsPath = resolveRefsPath(docsRoot, config.outputDir, config.refs.registryFile);
      const refsOutputs = refsOutputsOf(workspace);
      genRefs(workspace, refsPath, refsOutputs);
      const refsResult = checkRefs(workspace, refsPath, refsOutputs);
      console.log(refsResult.message);
      if (!refsResult.ok) {
        errorLines.push(refsResult.message);
        writeDiagnosticSinks(config, docsRoot, opts, errorLines, warningLines);
        console.error('');
        console.error(
          'merlon check failed: refs registry mismatch. Re-run `merlon compile` or `merlon refs gen`, then `merlon check`.',
        );
        process.exit(1);
      }

      const { issues: linkIssues, severity: linkSeverity } = collectBuiltInLinkIssues(
        config,
        docsRoot,
        opts,
        workspace,
        getScanRoot(config, opts),
      );
      const linkSink = linkSeverity === 'error' ? errorLines : warningLines;
      if (reportLinkIssues(linkIssues, linkSeverity, linkSink)) {
        failures.push({
          step: 'built-in links',
          detail: `${linkIssues.length} issue(s) (see \`link:\` lines above)`,
          hints: linkRemediationHints(linkIssues),
        });
      } else if (linkIssues.length > 0) {
        warnings.push({
          step: 'built-in links',
          detail: `${linkIssues.length} warning(s) (see \`link-warn:\` lines above)`,
          hints: linkRemediationHints(linkIssues),
        });
      }

      const mdlint = findPeerBinary('markdownlint-cli2', docsRoot);
      const shardsCfg = config.lint?.markdownlint?.shardsConfig;
      const compiledCfg = config.lint?.markdownlint?.compiledConfig;
      if (shardsCfg) {
        const shardPaths = shardLintPaths(config, docsRoot);
        const r = runPeer(mdlint, {
          require: opts.requireLint,
          cwd: docsRoot,
          args: ['--config', shardsCfg, ...shardPaths],
          stdio: 'pipe',
        });
        const peerOut = [r.stdout, r.stderr].filter(Boolean).join('');
        if (peerOut) process.stderr.write(peerOut);
        if (r.exitCode !== 0) {
          if (peerOut) errorLines.push(peerOut.trimEnd());
          failures.push({
            step: 'markdownlint (shards)',
            detail: 'peer exited non-zero (see markdownlint output above)',
            hints: [
              'Fix flagged shard markdown, or run `merlon fix` when Prettier/markdownlint fix is configured.',
            ],
          });
        }
      }
      if (compiledCfg) {
        const r = runPeer(mdlint, {
          require: opts.requireLint,
          cwd: docsRoot,
          args: ['--config', compiledCfg],
          stdio: 'pipe',
        });
        const peerOut = [r.stdout, r.stderr].filter(Boolean).join('');
        if (peerOut) process.stderr.write(peerOut);
        if (r.exitCode !== 0) {
          if (peerOut) errorLines.push(peerOut.trimEnd());
          failures.push({
            step: 'markdownlint (compiled)',
            detail: 'peer exited non-zero (see markdownlint output above)',
            hints: ['Fix shard sources that compile into the flagged output, then recompile.'],
          });
        }
      }

      const linkTool = findPeerBinary('markdown-link-check', docsRoot);
      const linkTarget = resolveLinkTarget(config, docsRoot);
      const linkCfg = config.lint?.links?.config;
      if (linkTool.found && linkCfg && linkTarget) {
        const r = runPeer(linkTool, {
          cwd: docsRoot,
          args: [linkTarget, '--config', linkCfg],
          stdio: 'pipe',
        });
        const peerOut = [r.stdout, r.stderr].filter(Boolean).join('');
        if (r.exitCode !== 0) {
          if (peerOut) {
            process.stderr.write(peerOut);
            errorLines.push(peerOut.trimEnd());
          }
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
        const vale = findPeerBinary('vale', docsRoot);
        const scanPaths = valeScanPaths(config, docsRoot, getScanRoot(config, opts));
        const r = runPeer(vale, {
          require: opts.requireVale,
          cwd: docsRoot,
          args: valeArgs(config, scanPaths, true),
          stdio: 'pipe',
        });
        const peerOut = [r.stdout, r.stderr].filter(Boolean).join('');
        if (peerOut) process.stderr.write(peerOut);
        if (r.exitCode !== 0) {
          if (peerOut) errorLines.push(peerOut.trimEnd());
          failures.push({
            step: 'vale',
            detail: 'peer exited non-zero (see Vale output above)',
            hints: valeCheckHints(r),
          });
        } else if (
          r.ran &&
          /\b\d+\s+(?:warnings?|suggestions?)\b/i.test(peerOut) &&
          !/\b0\s+warnings?,\s*0\s+suggestions?\b/i.test(peerOut) &&
          !/\b0\s+errors?,\s*0\s+warnings?\s+and\s+0\s+suggestions?\b/i.test(peerOut)
        ) {
          warningLines.push(peerOut.trimEnd());
          warnings.push({
            step: 'vale',
            detail: 'warnings or suggestions reported (see Vale output above)',
            hints: valeCheckHints(r),
          });
        }
      }

      const pathSeverity = config.lint?.paths?.severity ?? 'off';
      if (pathSeverity !== 'off') {
        const pathIssues = probeDocumentPaths(
          pathProbeInputs(config, docsRoot, getScanRoot(config, opts)),
        );
        const pathSink = pathSeverity === 'error' ? errorLines : warningLines;
        for (const issue of pathIssues) {
          const formatted = formatPathProbeIssue(issue, pathSeverity);
          console.error(formatted);
          pathSink.push(formatted);
        }
        if (pathIssues.length > 0 && pathSeverity === 'error') {
          failures.push({
            step: 'path resolution',
            detail: `${pathIssues.length} unresolved path(s) in prose (see \`path:\` lines above)`,
            hints: PATH_RESOLUTION_HINTS,
          });
        } else if (pathIssues.length > 0 && pathSeverity === 'warn') {
          warnings.push({
            step: 'path resolution',
            detail: `${pathIssues.length} unresolved path(s) in prose (see \`path-warn:\` lines above)`,
            hints: PATH_RESOLUTION_HINTS,
          });
        }
      }

      const coverage = computeCoverage(coverageInputs(config, opts));
      const strictCoverage = config.scan?.strict === true;
      const coverageSink = strictCoverage ? errorLines : warningLines;
      for (const p of coverage.uncaptured) {
        const line = `uncaptured: ${p}`;
        console.error(line);
        coverageSink.push(line);
      }
      for (const p of coverage.missingStandalone) {
        const line = `missing-standalone: ${p}`;
        console.error(line);
        coverageSink.push(line);
      }
      const coverageGaps = coverage.uncaptured.length + coverage.missingStandalone.length;
      if (coverageGaps > 0) {
        const covSummary =
          `coverage: ${coverage.uncaptured.length} uncaptured, ${coverage.missingStandalone.length} missing standalone` +
          (strictCoverage ? '' : ' (non-fatal; set scan.strict to fail check)');
        console.error(covSummary);
        coverageSink.push(covSummary);
        if (strictCoverage) {
          console.error('');
          console.error(
            'merlon check failed: coverage gaps. Fold files into a guide, register standaloneGuides, or add scan.ignore.',
          );
          failures.push({
            step: 'coverage',
            detail: `${coverage.uncaptured.length} uncaptured, ${coverage.missingStandalone.length} missing standalone (see \`uncaptured:\` / \`missing-standalone:\` lines above)`,
            hints: COVERAGE_HINTS,
          });
        } else {
          warnings.push({
            step: 'coverage',
            detail: `${coverage.uncaptured.length} uncaptured, ${coverage.missingStandalone.length} missing standalone (non-fatal; set scan.strict to fail check)`,
            hints: COVERAGE_HINTS,
          });
        }
      }

      const sinks = writeDiagnosticSinks(config, docsRoot, opts, errorLines, warningLines);
      reportCheckSummary(failures, warnings, sinks);

      if (failures.length > 0) {
        process.exit(1);
      }
      if (warnings.length > 0) {
        console.log(`merlon check passed with warning(s) (${warnings.length} step(s))`);
      } else {
        console.log('merlon check passed');
      }
    },
  );

cli
  .command('review', 'Report documentation sprawl signals (report-only)')
  .option('--json', 'Print findings as a JSON array')
  .option('--strict', 'Exit 1 when there is any finding')
  .option('--guide <name>', 'Review one guide from compileOrder (cross-guide duplicates included)')
  .action((opts: GlobalOpts & { json?: boolean; strict?: boolean; guide?: string }) => {
    const config = getConfig(opts);
    const docsRoot = getDocsRoot(opts);
    const result = reviewDocs({
      guide: opts.guide,
      guides: guideEntries(config, docsRoot),
      docsRoot,
      scanRoot: getScanRoot(config, opts),
      ignore: config.scan?.ignore ?? [],
      thresholds: config.review,
    });
    if (opts.json) {
      const jsonOut = JSON.stringify(result.findings, null, 2);
      console.log(jsonOut);
      writeDiagnosticSinks(
        config,
        docsRoot,
        opts,
        opts.strict && result.findings.length > 0 ? [jsonOut] : [],
        result.findings.map((f) => `${f.signal}: ${f.files.join(', ')}: ${f.detail} -> ${f.fix}`),
      );
    } else {
      const report = formatReviewReport(result);
      console.log(report);
      const findingLines = result.findings.map(
        (f) => `${f.signal}: ${f.files.join(', ')}: ${f.detail} -> ${f.fix}`,
      );
      writeDiagnosticSinks(
        config,
        docsRoot,
        opts,
        opts.strict && findingLines.length > 0 ? findingLines : [],
        findingLines,
      );
    }
    if (opts.strict && result.findings.length > 0) process.exitCode = 1;
  });

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
