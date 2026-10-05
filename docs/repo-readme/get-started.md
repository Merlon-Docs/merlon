# Get started

MDCP has two ways in, and the right one depends on who edits your docs:

- **Path A, the Agent Skill:** an agent edits the docs in your repository, and the skill tells it when to update shards and when to compile and check them.
- **Path B, the CLI in scripts and CI:** people edit the shards, and the `mdcp` command compiles and checks them in npm scripts and the pipeline.

A repository can take both paths. Path A's bootstrap session installs the CLI too, because agents run `mdcp` commands, as [The Toolchain](./the-toolchain.md) explains.

## Evaluate before you adopt

If you are deciding whether a team should adopt MDCP, read two pages before anyone installs it. [Vision and roadmap](../features/protocol/00-vision-and-roadmap.md) explains the problem MDCP solves and the principles behind it. [Benefit claims and evidence](../features/protocol/benefit-claims-and-evidence.md) separates what the tool does from outcomes that depend on how a team works, and says which claims have evidence behind them. Then try Path A or Path B in one repository to see the workflow on your own docs.

## Path A: install the Agent Skill

Install the mdcp Agent Skill into your repository with the [`skills` CLI](https://www.skills.sh/docs/cli), which [skills.sh](https://skills.sh) also uses:

```bash
npx skills add betsalel-williamson/mdcp --skill mdcp
```

_This copies the skill into your agent's skills directory. The [`skills` CLI](https://www.skills.sh/docs/cli) picks the directory from `--agent` or by detecting the agent, and its docs list the path for each agent. Commit the copy to git so every teammate and agent shares the same documentation discipline._

Then start a bootstrap session:

```text
/mdcp help me get started
```

The bootstrap session starts by asking for the feature, the reader persona and your experience level. Then it helps wire config, guide layout, and validation. After bootstrap, it offers an optional **first feature** walk through design → feature → UX → doc-only (recommended example or your own), which you take or skip. Once the pipeline exists, the skill tells agents to read the shard for a task, compile the docs and validate references before they change the system.

## Path B: run the CLI in scripts and CI

Install [`@bwilliamson/mdcp-cli`](../../packages/mdcp-cli/README.md) as a dev dependency and follow its [Quick start](../../packages/mdcp-cli/README.md#quick-start), which starts from a config for two guides and ends with the `docs:compile` and `docs:check` scripts that CI runs.
