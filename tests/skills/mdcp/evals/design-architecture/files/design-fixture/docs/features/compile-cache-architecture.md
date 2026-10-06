# Compile cache architecture

Intent-level notes for a compile-cache boundary in this fixture repo.

## Current approach

Compile may reuse prior shard digests when inputs are unchanged. The boundary is: cache keys cover authored shard content and config that affects assembly; invalidation is content-addressed.

## Migration backlog / old cache v1 (superseded — remove when updating)

- TODO ticket dump: migrate callers off cache-v1 path flags before Q3
- Old approach: keep a global `.compile-cache-v1/` directory forever and document both layouts for archaeology
