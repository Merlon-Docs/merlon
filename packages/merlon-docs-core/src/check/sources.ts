import { existsSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import type { LocateContext, RefResolver, SourceFormat, TargetLocator } from '../source/format.js';
import type { DocLink, ManifestEntry, SourceDoc } from '../source/model.js';
import { getFormat } from '../source/registry.js';

/**
 * Format-neutral checks over read documents (ADR 0008): reachability from the roots, file and
 * document links that resolve, fragments that name an anchor, and labels that are defined.
 */
export type SourceIssueType = 'orphan' | 'broken-link' | 'broken-anchor' | 'undefined-ref';

export interface SourceIssue {
  type: SourceIssueType;
  /** Docs-root-relative POSIX path of the document the issue is in. */
  file: string;
  /** 1-based line, absent for whole-file issues such as `orphan`. */
  line?: number;
  /** The target as written, for link issues. */
  target?: string;
  message: string;
}

export interface SourceCheckOptions {
  /** Every document to check, already read (symlinked duplicates removed by the caller). */
  docs: SourceDoc[];
  /** Absolute docs root: reported paths are relative to it, and root-absolute targets start here. */
  docsRoot: string;
  /** Absolute paths of the entry documents. Without roots, no `orphan` issues are reported. */
  roots: string[];
  /** Absolute paths that count as reachable whatever links to them (a manifest hook's output). */
  extraReachable?: string[];
  /** Format lookup; defaults to the registry. */
  formatOf?: (id: string) => SourceFormat;
}

function toPosix(p: string): string {
  return p.split(sep).join('/');
}

/** Default locator: a path relative to the document, or to the docs root when it starts with `/`. */
export const PLAIN_LOCATOR: TargetLocator = {
  candidates(target: string, _kind, context: LocateContext): string[] {
    if (target.startsWith('/')) return [join(context.docsRoot, target.slice(1))];
    if (isAbsolute(target)) return [target];
    return [resolve(dirname(context.from), target)];
  },
};

/** Glob pattern (`*`, `**`, `?`) to an anchored regular expression over POSIX paths. */
export function globToRegExp(pattern: string): RegExp {
  let out = '';
  for (let i = 0; i < pattern.length; i++) {
    const ch = pattern[i];
    if (ch === '*') {
      if (pattern[i + 1] === '*') {
        out += '.*';
        i++;
        if (pattern[i + 1] === '/') i++;
      } else {
        out += '[^/]*';
      }
    } else if (ch === '?') {
      out += '[^/]';
    } else {
      out += ch.replace(/[.+^${}()|[\]\\]/g, '\\$&');
    }
  }
  return new RegExp(`^${out}$`);
}

/** Labels every format defines without a resolver: explicit labels, names and generated targets. */
function defaultRefs(docs: SourceDoc[]): RefResolver {
  const ids = new Set<string>();
  for (const doc of docs) {
    for (const a of doc.anchors) if (a.origin !== 'heading') ids.add(a.id);
  }
  return { resolves: (link) => ids.has(link.target) };
}

export function checkSourceDocs(options: SourceCheckOptions): SourceIssue[] {
  const docsRoot = resolve(options.docsRoot);
  const formatOf = options.formatOf ?? getFormat;
  const byPath = new Map(options.docs.map((d) => [resolve(d.path), d]));
  const rel = (abs: string) => toPosix(relative(docsRoot, abs));
  const issues: SourceIssue[] = [];

  const formats = new Map<string, SourceFormat>();
  const format = (id: string) => {
    let f = formats.get(id);
    if (!f) {
      f = formatOf(id);
      formats.set(id, f);
    }
    return f;
  };
  const locatorOf = (doc: SourceDoc) => format(doc.format).locator ?? PLAIN_LOCATOR;

  /** The document a target names, else an existing non-document file, else null. */
  function locate(
    doc: SourceDoc,
    target: string,
    kind: 'toc' | 'include' | 'file' | 'doc',
  ): { path: string; doc?: SourceDoc } | null {
    const candidates = locatorOf(doc).candidates(target, kind, { from: doc.path, docsRoot });
    for (const c of candidates) {
      const hit = byPath.get(resolve(c));
      if (hit) return { path: resolve(c), doc: hit };
    }
    for (const c of candidates) if (existsSync(c)) return { path: resolve(c) };
    return null;
  }

  /** Documents a glob manifest entry matches, by the format's document names. */
  function expandGlob(doc: SourceDoc, entry: ManifestEntry): SourceDoc[] {
    const locator = locatorOf(doc);
    const base = entry.target.startsWith('/') ? docsRoot : dirname(doc.path);
    const pattern = entry.target.startsWith('/') ? entry.target.slice(1) : entry.target;
    const re = globToRegExp(pattern);
    const out: SourceDoc[] = [];
    for (const [abs, other] of byPath) {
      if (other === doc) continue;
      const name = locator.globName ? locator.globName(abs) : abs;
      const relName = toPosix(relative(base, name));
      if (!relName.startsWith('..') && re.test(relName)) out.push(other);
    }
    return out;
  }

  // Edges, plus broken manifest entries and links.
  const edges = new Map<SourceDoc, Set<SourceDoc>>();
  const addEdge = (from: SourceDoc, to: SourceDoc | undefined) => {
    if (!to) return;
    let set = edges.get(from);
    if (!set) {
      set = new Set();
      edges.set(from, set);
    }
    set.add(to);
  };

  for (const doc of options.docs) {
    for (const entry of doc.manifest) {
      if (entry.glob) {
        for (const hit of expandGlob(doc, entry)) addEdge(doc, hit);
        continue;
      }
      const hit = entry.resolved
        ? byPath.has(entry.resolved)
          ? { path: entry.resolved, doc: byPath.get(entry.resolved) }
          : existsSync(entry.resolved)
            ? { path: entry.resolved }
            : null
        : locate(doc, entry.target, entry.kind);
      if (!hit) {
        issues.push({
          type: 'broken-link',
          file: rel(doc.path),
          line: entry.line,
          target: entry.target,
          message: `${entry.kind === 'include' ? 'include' : 'table-of-contents entry'} names a missing file`,
        });
        continue;
      }
      addEdge(doc, hit.doc);
    }
  }

  const refsByFormat = new Map<string, RefResolver>();
  const refsFor = (doc: SourceDoc) => {
    let r = refsByFormat.get(doc.format);
    if (!r) {
      const factory = format(doc.format).refs;
      const docs = options.docs.filter((d) => d.format === doc.format);
      r = factory ? factory.prepare(docs, docsRoot) : defaultRefs(options.docs);
      refsByFormat.set(doc.format, r);
    }
    return r;
  };

  const linkIssue = (doc: SourceDoc, link: DocLink, type: SourceIssueType, message: string) => {
    const written = link.kind === 'anchor' ? '' : link.target;
    const target = link.fragment === undefined ? written : `${written}#${link.fragment}`;
    issues.push({ type, file: rel(doc.path), line: link.line, target, message });
  };

  for (const doc of options.docs) {
    // A link that is also a manifest entry (a GFM shard link) was resolved above.
    const listed = new Set(doc.manifest.map((e) => `${e.line}\0${e.target}`));
    for (const link of doc.links) {
      if (link.kind === 'external' || link.kind === 'manpage') continue;
      if (link.kind === 'file' && !link.fragment && listed.has(`${link.line}\0${link.target}`)) {
        continue;
      }
      if (link.kind === 'anchor') {
        if (link.fragment && !doc.anchors.some((a) => a.id === link.fragment)) {
          linkIssue(doc, link, 'broken-anchor', `no anchor "#${link.fragment}" in this document`);
        }
        continue;
      }
      if (link.kind === 'label') {
        if (!refsFor(doc).resolves(link, doc)) {
          linkIssue(doc, link, 'undefined-ref', `label "${link.target}" is not defined`);
        }
        continue;
      }
      const hit = locate(doc, link.target, link.kind);
      if (!hit) {
        linkIssue(doc, link, 'broken-link', `${link.kind} link names a missing file`);
        continue;
      }
      if (link.kind === 'doc') addEdge(doc, hit.doc);
      if (link.fragment && hit.doc && !hit.doc.anchors.some((a) => a.id === link.fragment)) {
        linkIssue(doc, link, 'broken-anchor', `no anchor "#${link.fragment}" in ${rel(hit.path)}`);
      }
    }
  }

  // Orphans: documents no root reaches.
  if (options.roots.length > 0) {
    const reached = new Set<SourceDoc>();
    const queue: SourceDoc[] = [];
    const visit = (doc: SourceDoc | undefined) => {
      if (doc && !reached.has(doc)) {
        reached.add(doc);
        queue.push(doc);
      }
    };
    for (const r of options.roots) visit(byPath.get(resolve(r)));
    for (const p of options.extraReachable ?? []) visit(byPath.get(resolve(p)));
    while (queue.length > 0) {
      for (const next of edges.get(queue.shift()!) ?? []) visit(next);
    }
    for (const doc of options.docs) {
      if (reached.has(doc) || doc.orphanOk) continue;
      issues.push({
        type: 'orphan',
        file: rel(doc.path),
        message: 'no table of contents, include or document link reaches this file',
      });
    }
  }

  return issues.sort(
    (a, b) =>
      (a.file < b.file ? -1 : a.file > b.file ? 1 : 0) ||
      (a.line ?? 0) - (b.line ?? 0) ||
      (a.type < b.type ? -1 : a.type > b.type ? 1 : 0),
  );
}

/** One line per issue: `type: file:line: message (target)`. */
export function formatSourceIssue(issue: SourceIssue): string {
  const where = issue.line === undefined ? issue.file : `${issue.file}:${issue.line}`;
  const target = issue.target === undefined ? '' : ` "${issue.target}"`;
  return `${issue.type}: ${where}: ${issue.message}${target}`;
}
