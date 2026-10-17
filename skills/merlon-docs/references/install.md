# Install the Merlon Docs skill

## Install

```bash
npx skills add Merlon-Docs/merlon --skill merlon-docs
```

Use `-a` / `--agent` to target a specific host when you have more than one agent
installed (for example `-a cursor` or `-a claude-code`).

The [skills CLI](https://github.com/vercel-labs/skills) copies or symlinks the
skill into the **selected agent’s project (or global) skills directory**. Exact
paths depend on the agent — see [Supported Agents](https://github.com/vercel-labs/skills#supported-agents)
(for example `.agents/skills/` for Cursor/Amp project installs, `.claude/skills/`
for Claude Code, `.windsurf/skills/` for Windsurf).

**Zero-install:** copy the `merlon-docs` skill folder into the skills directory **your
agent discovers** (same Supported Agents list), not a single fixed path.

## After install

The `merlon-docs` skill is the whole pack: it picks the workflow for each task
(bootstrap, docs-only, design, feature, UX, doc review) and loads only that
workflow's file. You install only this one skill.

Start a bootstrap session in natural language:

```text
/merlon-docs help me get started
```

The agent asks for `FEATURE`, `PERSONA`, and `EXPERIENCE` before installing or
writing shards. After bootstrap succeeds, it can offer a guided first feature
(design → feature → UX → doc-only) using a recommended example or one you
choose.

The archetype skills under `skills/merlon-docs-arch-*` are internal and not released.
The consumer install is the `merlon-docs` skill alone.

## CLI still required

The skill relies on the `merlon` CLI. `cli-and-scripts.md` in this folder says
how to install it and what each command does.
