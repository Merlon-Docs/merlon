# Compile cache

Tallybook caches each month's computed balances so reports open quickly.

## Cache keys

A cache entry is keyed by the account, the month, and a hash of every ledger entry in that month.
Any change to an entry in the month produces a new key.

## Invalidation

Editing or importing an entry invalidates the cache for its month and every later month of the same
account. Earlier months are untouched.

## Migration backlog

- [ ] TB-412 move cache from JSON files to SQLite (owner: Dana, target Q3)
- [ ] TB-419 drop the v1 timestamp keys after all users upgrade
- [ ] TB-433 benchmark cold start after the SQLite move
- Note from standup 3/14: blocked on the packaging change, revisit next sprint
