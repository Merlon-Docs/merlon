/** Sync status panel stub — lastSyncedAt not implemented yet. */

export type SyncState = 'idle' | 'running' | 'failed';

export type SyncStatus = {
  state: SyncState;
  message: string;
};

export function getSyncStatus(): SyncStatus {
  return { state: 'idle', message: 'Never synced' };
}

export function renderSyncStatusPanel(status: SyncStatus): string {
  return `Sync: ${status.state} — ${status.message}`;
}
