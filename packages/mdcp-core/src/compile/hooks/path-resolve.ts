import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { CompileHookContext } from '../hooks.js';

export function defaultSearchRoots(): string[] {
  return [process.cwd(), resolve(process.cwd(), '..')];
}

export function hookSearchRoots(
  ctx: Pick<CompileHookContext, 'guideName' | 'config' | 'scopeRoot'>,
  configKey: 'inlineInserts',
): string[] {
  const roots = defaultSearchRoots();
  if (ctx.scopeRoot) roots.push(ctx.scopeRoot);
  const guideCfg = ctx.config.guides?.find((g) => g.name === ctx.guideName);
  const hooksConfig = guideCfg?.compile?.hooksConfig;
  const extraRoots = hooksConfig?.[configKey]?.searchRoots ?? [];
  for (const root of extraRoots) {
    roots.push(resolve(process.cwd(), root));
  }
  return roots;
}

export function resolveRelativeFile(
  relPath: string,
  guideDir: string,
  searchRoots: string[] = [],
): string | null {
  const normalized = relPath.replace(/^\.\//, '');
  const filePart = normalized.split('#')[0];
  const candidates = [
    resolve(guideDir, filePart),
    ...searchRoots.map((root) => resolve(root, filePart)),
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

export function readTextFileAt(
  relPath: string,
  guideDir: string,
  searchRoots: string[] = [],
): string | null {
  const resolved = resolveRelativeFile(relPath, guideDir, searchRoots);
  if (!resolved) return null;
  return readFileSync(resolved, 'utf-8').trim();
}

/**
 * Extensions of files whose contents are code: a language, a template, a
 * schema or an infrastructure definition. A symbol can name a line in one of
 * these, which is what `codeEvidence` cites.
 *
 * No list of this kind is complete — a repository can be written in a language
 * that is not here — so it is a default rather than a fixed set.
 * `lint.codeExtensions` adds to it.
 */
export const DEFAULT_CODE_EXTENSIONS: readonly string[] = [
  // JavaScript and TypeScript
  'ts',
  'tsx',
  'js',
  'jsx',
  'mjs',
  'cjs',
  'mts',
  'cts',
  // JVM, .NET and other compiled languages
  'java',
  'kt',
  'kts',
  'scala',
  'groovy',
  'cs',
  'fs',
  'vb',
  'go',
  'rs',
  'swift',
  'm',
  'mm',
  'c',
  'h',
  'cc',
  'cpp',
  'cxx',
  'hpp',
  'hh',
  'hxx',
  'zig',
  'dart',
  'ex',
  'exs',
  'erl',
  'hrl',
  'hs',
  'ml',
  'mli',
  'clj',
  'cljs',
  'cljc',
  'nim',
  'cr',
  'jl',
  'lua',
  'pl',
  'pm',
  'r',
  'scm',
  'rkt',
  'v',
  'sv',
  'vhd',
  'vhdl',
  // Scripting and dynamic languages
  'py',
  'pyi',
  'rb',
  'rake',
  'php',
  'sh',
  'bash',
  'zsh',
  'fish',
  'ps1',
  'bat',
  'cmd',
  // Markup, templates and component formats
  'vue',
  'svelte',
  'astro',
  'html',
  'htm',
  'css',
  'scss',
  'sass',
  'less',
  'styl',
  'jinja',
  'j2',
  'hbs',
  'ejs',
  'erb',
  'liquid',
  'mustache',
  'twig',
  'razor',
  'cshtml',
  // Schema and interface definition languages
  'sql',
  'graphql',
  'gql',
  'proto',
  'thrift',
  'cue',
  'jsonnet',
  'libsonnet',
  // Build, infrastructure and policy
  'gradle',
  'bzl',
  'bazel',
  'cmake',
  'mk',
  'make',
  'nix',
  'tf',
  'tfvars',
  'hcl',
  'dockerfile',
  'containerfile',
  'rules',
  'rego',
  'star',
  // Other executable formats
  'sol',
  'gd',
  'tres',
  'tscn',
];

/**
 * Extensions of files that hold data rather than code: configuration, tabular
 * records, serialized documents.
 *
 * A link to one of these still names a file that has to exist, so data
 * extensions are validated exactly like code ones. What they do not get is a
 * cited line: a symbol found in inert content is an occurrence, not a
 * declaration, so `codeEvidence` links a data file without a `#L` fragment. A
 * repository that does want lines cited in, say, its workflow YAML moves the
 * extension by listing it in `lint.codeExtensions`.
 */
export const DEFAULT_DATA_EXTENSIONS: readonly string[] = [
  'json',
  'jsonc',
  'json5',
  'yaml',
  'yml',
  'toml',
  'ini',
  'cfg',
  'conf',
  'properties',
  'env',
  'xml',
  'xsd',
  'csv',
  'tsv',
  'avsc',
  'ipynb',
];

/** The two extension lists a repository can extend, as `config.lint` holds them. */
export interface ExtensionConfig {
  codeExtensions?: readonly string[];
  dataExtensions?: readonly string[];
}

function extensionOf(path: string): string | null {
  const bare = path.split('#')[0].split('?')[0];
  const base = bare.slice(bare.lastIndexOf('/') + 1);
  const dot = base.lastIndexOf('.');
  if (dot <= 0 || dot === base.length - 1) return null;
  return base.slice(dot + 1).toLowerCase();
}

function extendSet(set: Set<string>, extra: readonly string[] = []): Set<string> {
  for (const entry of extra) {
    // A leading dot is accepted, since that is how people write extensions.
    const normalized = entry.trim().replace(/^\./, '').toLowerCase();
    if (normalized) set.add(normalized);
  }
  return set;
}

/** Code extensions: the defaults plus `lint.codeExtensions`. */
export function codeExtensionSet(lint?: ExtensionConfig): Set<string> {
  return extendSet(new Set(DEFAULT_CODE_EXTENSIONS), lint?.codeExtensions);
}

/** Data extensions: the defaults plus `lint.dataExtensions`. */
export function dataExtensionSet(lint?: ExtensionConfig): Set<string> {
  return extendSet(new Set(DEFAULT_DATA_EXTENSIONS), lint?.dataExtensions);
}

/**
 * Every extension that can name a file, code and data together. This is the
 * set link validation and the prose path probe ask about: both are answering
 * whether a file exists, a question that does not care what is inside it.
 */
export function fileExtensionSet(lint?: ExtensionConfig): Set<string> {
  const set = codeExtensionSet(lint);
  for (const ext of dataExtensionSet(lint)) set.add(ext);
  return set;
}

/**
 * True when `path` ends in an extension from `extensions`.
 *
 * Build the set once with `fileExtensionSet` or `codeExtensionSet` when
 * checking many paths; omitting it uses every default. Membership is a set
 * lookup rather than a generated regex, so a configured value cannot change
 * how matching behaves.
 */
export function hasFileExtension(path: string, extensions?: Set<string>): boolean {
  const ext = extensionOf(path);
  if (!ext) return false;
  return (extensions ?? fileExtensionSet()).has(ext);
}

/** True when `path` ends in a code extension, the ones a line can be cited in. */
export function hasCodeExtension(path: string, extensions?: Set<string>): boolean {
  const ext = extensionOf(path);
  if (!ext) return false;
  return (extensions ?? codeExtensionSet()).has(ext);
}
