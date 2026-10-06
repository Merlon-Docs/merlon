import type { LinkFailureReason } from './validate.js';

export type LinkSeverity = 'error' | 'warn';

export interface LinkIssue {
  kind: LinkFailureReason;
  file: string;
  line: number;
  label: string;
  originalTarget: string;
  brokenTarget: string;
  /**
   * The guide the issue belongs to: the guide of a compiled guide or a shard, or for an issue in
   * the monolith, the guide whose copy there holds the line.
   */
  guideName?: string;
  /** True for an issue in the monolith, where `guideName` names a copy and not a compiled guide. */
  inMonolith?: boolean;
  shardFile?: string;
  shardLine?: number;
}

export function formatLinkIssue(issue: LinkIssue, severity: LinkSeverity = 'error'): string {
  const prefix = severity === 'warn' ? 'link-warn' : 'link';
  let msg = `${prefix}: ${issue.file}:${issue.line}: ${issue.kind} "${issue.brokenTarget}"`;
  if (issue.guideName) {
    msg += issue.inMonolith
      ? ` (guide "${issue.guideName}" in the monolith)`
      : ` (compiled guide "${issue.guideName}")`;
  }
  if (issue.shardFile) {
    msg += `\n  → shard: ${issue.shardFile}:${issue.shardLine ?? '?'} → ${issue.originalTarget}`;
  }
  return msg;
}
