import { getSyncStatus, renderSyncStatusPanel } from './sync-status';

/** Placeholder proving this repo already uses tests. Extend for lastSyncedAt. */
describe('sync status panel', () => {
  it('renders idle state', () => {
    const status = getSyncStatus();
    expect(renderSyncStatusPanel(status)).toContain('idle');
  });
});
