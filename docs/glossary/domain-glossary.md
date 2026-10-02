# domain glossary

Per-repository glossary shards under `docs/glossary/` for acronyms and product vocabulary. When legacy systems reuse the same term for different concepts, add a **disambiguation** entry and link from feature shards on first use. Start the glossary before large feature shards when migrating or onboarding new projects.

## Inclusion bar (project-specific)

Choosing what belongs in the glossary is an art — not every uncommon word deserves an entry, and not every acronym is obvious to the audience. Each repository **MUST** record its own **inclusion bar** in the glossary (typically the preamble of `docs/glossary/index.md`): which kinds of terms to add, which to omit, and whose understanding counts (client persona, contributors, or both).

The [getting-started workflow](../features/protocol/workflows/getting-started.md) establishes that bar with the end user during bootstrap. Day-to-day workflows apply it whenever they introduce non-universal language — see [Skill workflows](../features/protocol/skill-workflows.md#glossary-obligation-every-workflow).

## One term per shard

Each definition lives in its own `.md` file with a single `#` heading (the term). Link the term from feature shards on first use, for example `[GFM](./gfm.md)` or `../glossary/gfm.md` from another guide.

## Multiple index files

When a glossary grows beyond a comfortable manifest size, group entries in sub-index manifests:

| File                | Role                                                                                     |
| ------------------- | ---------------------------------------------------------------------------------------- |
| `index.md`          | Master index — preamble plus links to every term shard (required for cross-guide stitch) |
| `index-protocol.md` | Example sub-index — protocol-related terms only                                          |
| `index-format.md`   | Example sub-index — format and compile terms                                             |

**Stitched into other guides:** link `../glossary/index.md` from each guide that should publish the full glossary TOC (typically maintainer guides). Lean consumer READMEs may omit the TOC and link individual terms instead. Set `compile.scopeRoot` to `glossary` on those guides so transitive `.md` links from the glossary tree pull term shards into compile output without listing every term in the parent manifest.

**Standalone glossary output:** add `glossary` to `compileOrder` with `compile.outputFile` and optionally `compile.manifest: index-protocol.md` (or another sub-index) when you want a separate compiled glossary per group.
