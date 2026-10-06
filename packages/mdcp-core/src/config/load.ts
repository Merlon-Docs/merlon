import { readFileSync, existsSync, statSync } from 'node:fs';
import { isAbsolute, relative, resolve, sep } from 'node:path';
import { MdcpConfigSchema, type MdcpConfig, type GuideConfig } from './schema.js';
import { resolveUnderOutputDir, defaultGuideOutputFile } from './paths.js';

export { defaultGuideOutputFile, resolveUnderOutputDir } from './paths.js';

export function loadConfig(configPath: string, configBase: string): MdcpConfig {
  const abs = resolve(configBase, configPath);
  if (!existsSync(abs)) {
    throw new Error(`Config not found: ${abs}`);
  }
  const raw = JSON.parse(readFileSync(abs, 'utf-8'));
  return MdcpConfigSchema.parse(raw);
}

export function resolveOutputPath(config: MdcpConfig, docsRoot: string): string | undefined {
  if (config.outputFile === undefined) return undefined;
  return resolveUnderOutputDir(docsRoot, config.outputDir, config.outputFile);
}

export function resolveRefsPath(docsRoot: string, outputDir: string, file: string): string {
  return resolveUnderOutputDir(docsRoot, outputDir, file);
}

/** Docs root — parent of guide shard directories (CLI `--docs-root`). */
export function resolveDocsRoot(_config: MdcpConfig, docsRoot: string): string {
  return docsRoot;
}

/**
 * Absolute guide shard directory: `guides[].path`, else `{docsRoot}/{name}`. A relative
 * `docsRoot` resolves against the process cwd, so the result also holds for a peer tool
 * that runs with the docs root as its cwd.
 */
export function resolveGuideDir(name: string, config: MdcpConfig, docsRoot: string): string {
  const guide = config.guides?.find((g) => g.name === name);
  return resolve(docsRoot, guide?.path ?? name);
}

export function effectiveGuideOutputFile(
  guideName: string,
  compile: GuideConfig['compile'],
  compileOrderLength: number,
): string {
  return compile?.outputFile ?? defaultGuideOutputFile(guideName, compileOrderLength);
}

/**
 * Absolute path to the output a publish output links to for this guide: its `compile.outputFile`,
 * else the monolith when the config has one, else its default compiled guide. Despite its name, this
 * isn't the link base the docs define, which is the file being assembled. Compile rebases each
 * document on its own path, so a monolith guide's own compiled guide is not rebased on this one.
 */
export function resolveGuideLinkBase(
  config: { outputDir?: string; outputFile?: string },
  docsRoot: string,
  guideName: string,
  compileOrderLength: number,
  compile?: { outputFile?: string },
): string {
  const outputDir = config.outputDir ?? '_build';
  if (compile?.outputFile) {
    return resolveUnderOutputDir(docsRoot, outputDir, compile.outputFile);
  }
  if (config.outputFile !== undefined) {
    return resolveUnderOutputDir(docsRoot, outputDir, config.outputFile);
  }
  return resolveUnderOutputDir(
    docsRoot,
    outputDir,
    defaultGuideOutputFile(guideName, compileOrderLength),
  );
}

export function getGuideConfig(config: MdcpConfig, name: string): GuideConfig | undefined {
  return config.guides?.find((g) => g.name === name);
}

/** Registered guide directories under docsRoot, as absolute paths: the mdcp-managed fileset. */
export function guideScanDirs(config: MdcpConfig, docsRoot: string): string[] {
  const root = resolve(docsRoot);
  const dirs = new Set<string>();
  for (const name of config.compileOrder) {
    dirs.add(resolveGuideDir(name, config, root));
  }
  return [...dirs];
}

/**
 * Shard markdownlint paths for markdownlint-cli2 running with the docs root as its cwd, as
 * `mdcp lint` and `mdcp check` run it. From any other cwd the relative paths match nothing.
 *
 * Without `shardsGlobs`, each guideScanDirs dir gets a glob for the `.md` and `.markdown`
 * files under it. A bare dir would expand to every file in it, images included. A guide
 * under the docs root gets a glob relative to it, which keeps the checkout path, and any
 * glob characters in it such as the parentheses in `repo (copy)`, out of the pattern. A
 * guide outside the docs root gets an absolute glob, with the glob characters in the whole
 * path escaped, for two reasons. globby applies a `**` negation such as the shard preset's
 * `!**` + `/index.md` to a `../` pattern only when every pattern starts with the same `../`.
 * And under a symlinked docs root, markdownlint-cli2 runs in the link target, so `../`
 * would resolve beside the target.
 *
 * `lint.markdownlint.shardsGlobs` entries pass as written, so a negated entry (`!` or `#`)
 * still excludes files, except in two cases. A `.` entry passes as `**`, so it covers every
 * file under the docs root, as any other directory entry does. Given `.` as its only path,
 * markdownlint-cli2 would lint the Markdown files at the top of its cwd and nothing below
 * them. An entry that starts with `../` gets the absolute dir those segments name, escaped,
 * in their place, for the reasons above. When the whole entry names a directory, it also
 * gets `/**`, because globby expands a directory only when it can stat the pattern, and an
 * escaped path may not stat.
 */
export function shardLintPaths(config: MdcpConfig, docsRoot: string): string[] {
  const root = resolve(docsRoot);
  const globs = config.lint?.markdownlint?.shardsGlobs;
  if (globs?.length) return globs.map((g) => shardsGlobPath(g, root));
  return guideScanDirs(config, root).map((dir) => markdownGlob(dir, root));
}

/**
 * markdownlint-cli2 glob for the Markdown files under the absolute guide dir `dir`: relative
 * to `root` when `dir` is under it, else absolute. A relative pattern that starts with `!`,
 * `#` or `:` would be a negation or a literal path to markdownlint-cli2, so it gets a
 * leading `./`.
 */
function markdownGlob(dir: string, root: string): string {
  const rel = relative(root, dir);
  if (rel === '') return '**/*.{md,markdown}';
  const outside = rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel);
  const pattern = escapeGlobPath(outside ? dir : rel).replace(/\/$/, '');
  return `${/^[!#:]/.test(pattern) ? './' : ''}${pattern}/**/*.{md,markdown}`;
}

/**
 * `path` without the slashes at its end. A loop, since `/\/+$/` rescans a slash run from each
 * slash.
 */
function trimTrailingSlashes(path: string): string {
  let end = path.length;
  while (end > 0 && path[end - 1] === '/') end--;
  return path.slice(0, end);
}

/**
 * A `shardsGlobs` entry for markdownlint-cli2: `.` as `**`, an entry that starts with `../`
 * with those segments replaced by the escaped absolute dir they name, any other as written.
 * globby reads an absolute negation as relative to its cwd unless its static prefix equals
 * that of a positive pattern, so a negated `../` entry goes through `**` instead, which
 * matches the absolute paths that the absolute positive patterns find.
 */
function shardsGlobPath(entry: string, root: string): string {
  if (entry === '.') return '**';
  const negation = /^[!#]/.test(entry) ? entry[0] : '';
  const body = entry.slice(negation.length);
  const up = /^(?:\.\.(?:\/|$))+/.exec(body)?.[0];
  if (!up) return entry;
  const base = escapeGlobPath(resolve(root, up)).replace(/\/$/, '');
  const rest = trimTrailingSlashes(body.slice(up.length));
  const dir = isDirectory(resolve(root, body)) ? '/**' : '';
  const pattern = `${rest ? `${base}/${rest}` : base}${dir}`;
  if (!negation) return pattern;
  return `${negation}**${pattern.startsWith('/') ? '' : '/'}${pattern}`;
}

/**
 * `path` in `/` form with its glob characters escaped for markdownlint-cli2.
 * markdownlint-cli2 turns a backslash into `/` unless `$()*+?[]^` follows it, so `()[]*?`
 * get a backslash and `{}|` go in brackets. Its brace expansion reads `'`, `"` and a
 * backtick as the start of a quoted literal, which stops `{md,markdown}` from expanding,
 * so those go in brackets too. A backslash in a POSIX directory name still reaches
 * markdownlint-cli2 as `/`.
 */
function escapeGlobPath(path: string): string {
  return path
    .split(sep)
    .join('/')
    .replace(/\\/g, '\\\\')
    .replace(/[()[\]*?]/g, '\\$&')
    .replace(/[{}|'"`]/g, '[$&]');
}

function isDirectory(path: string): boolean {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}
