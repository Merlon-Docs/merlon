# Install the MDCP skill

## Install

```bash
npx skills add betsalel-williamson/mdcp --skill mdcp
```

Use `-a` / `--agent` to target a specific host when you have more than one agent
installed (for example `-a cursor` or `-a claude-code`).

The [skills CLI](https://github.com/vercel-labs/skills) copies or symlinks the
skill into the **selected agent’s project (or global) skills directory**. Exact
paths depend on the agent — see [Supported Agents](https://github.com/vercel-labs/skills#supported-agents)
(for example `.agents/skills/` for Cursor/Amp project installs, `.claude/skills/`
for Claude Code, `.windsurf/skills/` for Windsurf).

**Zero-install:** copy the `mdcp` skill folder into the skills directory **your
agent discovers** (same Supported Agents list), not a single fixed path.

## After install

The `mdcp` skill is the whole pack: it picks the workflow for each task
(bootstrap, docs-only, design, feature, UX, doc review) and loads only that
workflow's file. There is nothing else to install.

Start a bootstrap session in natural language:

```text
/mdcp help me get started
```

The agent asks for `FEATURE`, `PERSONA`, and `EXPERIENCE` before installing or
writing shards. After bootstrap succeeds, it can offer a guided first feature
(design → feature → UX → doc-only) using a recommended example or one you
choose.

Optional archetype skills under `skills/mdcp-arch-*` are WIP and are not part of
the consumer install path yet.

## CLI still required (build, validate, cross-link registry)

The skills rely on the `mdcp` CLI. You need Node.js 18+ and must install
`@bwilliamson/mdcp-cli` globally or locally in your project:

```bash
npm install -g @bwilliamson/mdcp-cli
# or locally
npm install -D @bwilliamson/mdcp-cli
```

This provides the `mdcp` commands for:

- **compile** — build compiled docs from Markdown shards
- **check** — validate the documentation tree (links, structure, optional lint)
- **refs** — inspect/regenerate the cross-link fragment registry
- **fix** — format shards (Prettier / markdownlint auto-fix)
- **prose** — Vale prose lint
- **review** — report doc sprawl (oversized indexes, long shards, duplicated paragraphs, matching titles)

```bash
mdcp compile --config <config> --docs-root <docs-root>
mdcp check --config <config> --docs-root <docs-root>
mdcp refs list --config <config> --docs-root <docs-root>
mdcp review --config <config> --docs-root <docs-root>
```

Details: `cli-and-scripts.md` in this folder (linked from `SKILL.md`).
