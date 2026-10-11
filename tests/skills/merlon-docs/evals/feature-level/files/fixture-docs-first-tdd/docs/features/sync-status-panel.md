# Sync status panel

Shows whether the last background sync succeeded.

## Capabilities

- Display sync state: `idle`, `running`, or `failed`.
- Show a short human status string.

## Acceptance gaps

A `lastSyncedAt` ISO timestamp after a successful sync is not documented or
shipped yet. Hide the timestamp when sync has never completed.
