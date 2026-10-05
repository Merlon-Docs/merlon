# Get started

Install MDCP when you want a **documentation system** your agents will actually follow — sharded Markdown, compile/check in CI, and less effort keeping docs honest as ideas arrive. Use the [`skills` CLI](https://www.skills.sh/docs/cli) (same path as [skills.sh](https://skills.sh)).

## Evaluate before you adopt

If you are deciding whether a team should adopt MDCP, read two pages before anyone installs it. [Vision and roadmap](../features/protocol/00-vision-and-roadmap.md) explains the problem MDCP solves and the principles behind it. [Benefit claims and evidence](../features/protocol/benefit-claims-and-evidence.md) separates what the tool does from outcomes that depend on how a team works, and says which claims have evidence behind them. Then run the Quick Start below in one repository to see the workflow on your own docs.

## Quick Start

Install the mdcp Agent Skill into your repository:

```bash
npx skills add betsalel-williamson/mdcp --skill mdcp
```

_This copies the skill into your agent's skills directory. The [`skills` CLI](https://www.skills.sh/docs/cli) picks the directory from `--agent` or by detecting the agent, and its docs list the path for each agent. Commit the copy to git so every teammate and agent shares the same documentation discipline._

Then start a bootstrap session:

```text
/mdcp help me get started
```

The bootstrap session starts by asking for the feature, the reader persona and your experience level. Then it helps wire config, guide layout, and validation. After bootstrap, it offers an optional **first feature** walk through design → feature → UX → doc-only (recommended example or your own), which you take or skip. Once the pipeline exists, the skill tells agents to read the shard for a task, compile the docs and validate references before they change the system.
