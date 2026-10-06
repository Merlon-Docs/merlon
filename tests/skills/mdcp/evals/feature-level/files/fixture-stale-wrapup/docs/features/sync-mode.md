# Sync mode

Controls how background sync runs.

## Current public API (stale)

Callers pass `legacySync: boolean` on the sync client. When `true`, sync uses
the legacy batch path.

## Superseded workflow (keep for archaeology)

Operators still documented against the old `legacySync` flag. Leave this section
so newcomers can compare old vs new.

## Migration backlog

- [ ] Flip remaining tenants off `legacySync` (issue #888)
- [ ] Delete LegacyBatchSync after Q3
- Temporary plan: track on the sprint board; not finished

## Intended replacement (not yet reflected as sole current behavior)

`syncMode: 'batch' | 'stream'` should replace `legacySync` on the public API.
Durable docs should describe `syncMode` only once the wrap-up lands.
