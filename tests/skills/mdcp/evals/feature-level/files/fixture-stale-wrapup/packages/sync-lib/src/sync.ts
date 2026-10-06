/** Sync client stub — public API still exposes legacySync. */

export type SyncOptions = {
  legacySync?: boolean;
  syncMode?: 'batch' | 'stream';
};

export function startSync(options: SyncOptions = {}): string {
  if (options.syncMode) return `mode:${options.syncMode}`;
  if (options.legacySync) return 'legacy:batch';
  return 'legacy:default';
}
