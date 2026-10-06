---
name: mdcp-arch-oss-library
description: >-
  Documentation system archetype for OSS libraries (npm, PyPI, crates.io): keep
  package docs maintainable as APIs and ideas evolve — source holds API truth;
  Markdown shards hold intent, stability promises, and migration notes. Use when
  building a docs-as-code system for libraries, packages, API references, or
  when users mention OSS, publishable packages, or Javadoc-style documentation.
license: MIT
compatibility: >-
  Requires Node.js 18+ for @bwilliamson/mdcp-cli (docs compile,
  validate, and cross-link registry commands). Skill scripts are thin
  wrappers; they do not replace the CLI. Install the mdcp parent skill first.
metadata:
  author: betsalel-williamson
  internal: true
  version: '0.7.2'
  openclaw:
    category: 'documentation'
---

# MDCP Archetype: OSS Library

For publishable packages (npm, PyPI, crates.io) where **API truth lives in source** and a sharded documentation system holds intent, stability guarantees, and migration notes without duplicating the API surface.

## Layout

```text
docs/
  extensions/
    api-pointer-conventions.md  # how shards link into src/
  glossary/
  features/                       # design, acceptance criteria, public API promises
  client/                         # install, quick start, examples
  developer/                      # release, CONTRIBUTING, changesets
```

## Pointer shards instead of Javadoc duplication

Prefer **stable shard titles** + links to source paths over pasting signatures:

```markdown
## SessionStore

Public API: `packages/core/src/session/store.ts` — read implementation on demand.

Acceptance: sessions expire after 24h; see [feature shard](../../../features/session-store.md).
```

Agents use host search and the `docs/glossary/refs.md` registry / `mdcp check` for compiled anchors, then open the linked source file for types and methods.

## When to shard vs when to point

| Content                                     | Location                              |
| ------------------------------------------- | ------------------------------------- |
| Why the API exists, constraints, versioning | `features/` shard                     |
| How to install and call from app code       | `client/` shard                       |
| Signatures, generics, internal helpers      | **Source files** (pointer from shard) |
| Shared terms (`Session`, `Tenant`)          | `glossary/`                           |

## Extension hooks

- Add an `api-pointer-conventions.md` shard under `docs/extensions/` for language-specific path rules.
- Optional formatting pack under `skills/mdcp-format-*` for JavaDoc-style cross-links in compiled README output (future).
