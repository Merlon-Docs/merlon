# Importing statements

1. Download a CSV statement from your bank.
2. Run `tallybook import statement.csv`.
3. The first time, answer which columns hold the date, amount, and description.

Importing the same statement again is safe; duplicates are skipped. Reports for the month you
imported refresh automatically, as described in [cache invalidation](../features/compile-cache.md#cache-invalidation-rules).
