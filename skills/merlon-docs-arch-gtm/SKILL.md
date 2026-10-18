---
name: merlon-docs-arch-gtm
description: >-
  Documentation system archetype for marketing, sales, and go-to-market docs —
  awareness, messaging, and audience language. Use when authoring or organizing
  marketing, sales, GTM, positioning, or messaging documentation; keep each
  shard under progressive disclosure.
license: MIT
compatibility: >-
  Requires Node.js 18+ for @merlon-docs/merlon-docs-cli (docs compile,
  validate, and cross-link registry commands). Skill scripts are thin
  wrappers; they do not replace the CLI. Install the Merlon Docs parent skill first.
metadata:
  author: Merlon-Docs
  internal: true
  version: '1.0.0'
  openclaw:
    category: 'documentation'
---

# Merlon Docs Archetype: Go-to-Market

For teams that maintain **marketing, sales, and GTM documentation** as a sharded Merlon Docs system — applying **shard single responsibility** and **idea mitosis** to awareness, messaging, and positioning content without collapsing it into product or engineering shards.

This archetype is **not** part of the default **Code Repository Archetype** (`features/` / `client/` / `developer/` / `glossary/`). GTM docs live in a separate tree tuned to audience and campaign lifecycle, not repo contributor vs product consumer placement.

## Status

**WIP — not ready to publish.** `metadata.internal: true`; omitted from `skills.sh.json`. Maintainers install locally with `INSTALL_INTERNAL_SKILLS=1`.

## Layout

Suggested placeholders — adapt names to your org; do not treat this as a full GTM methodology:

```text
docs/
  marketing/                      # or docs/gtm/
    awareness/                    # top-of-funnel, channels, campaigns
    messaging/                    # value props, positioning, voice
    audience/                     # personas, ICP, segment language
  extensions/
    style-guide.md                # tone, terminology, approved claims
```

## Shard discipline

| Concern                           | Shard home (example)                             |
| --------------------------------- | ------------------------------------------------ |
| One audience segment or persona   | `audience/` shard                                |
| One positioning claim or pillar   | `messaging/` shard                               |
| One campaign or channel narrative | `awareness/` shard                               |
| Shared GTM terms                  | local glossary or cross-link to product glossary |

When a shard mixes awareness copy with positioning rationale, split via **idea mitosis** — same Merlon Docs rules as the parent skill, different folder taxonomy.

## Agent workflow

1. Read the parent `merlon-docs` skill (SRP and mitosis references).
2. Confirm GTM scope — do not fold sales messaging into `features/` or `client/` product shards.
3. Edit one primary-concern shard; run `merlon check` when wired into your docs config.
4. Defer full funnel playbooks, CRM runbooks, and channel ops to future shards — this stub defines structure only.
