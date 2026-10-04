# Agent integration

Wire **`@bwilliamson/mdcp-cli`** into CI or coding agents with npm scripts.

```json
{
  "scripts": {
    "docs:compile": "mdcp compile --config docs/mdcp.config.json --docs-root docs",
    "docs:check": "mdcp check --config docs/mdcp.config.json --docs-root docs --require-lint"
  }
}
```

```bash
mdcp check --require-lint
mdcp refs-list
```

## Related packages

| Package                                                                                | Use                                                         |
| -------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| [`@bwilliamson/mdcp-core`](https://www.npmjs.com/package/@bwilliamson/mdcp-core)       | Programmatic compile, refs, and validation API              |
| [`@bwilliamson/mdcp-presets`](https://www.npmjs.com/package/@bwilliamson/mdcp-presets) | Starter markdownlint configs for shards and compiled output |

## Further reading

- [Project README](../../README.md) — Agent Skill landing
- [Commands reference](./commands-reference.md) — full `mdcp` command list
- [Core API](../client-core/index.md) — programmatic library
- [Feature catalog](../features/feature-catalog.md) — maintainer depth
- [Sample guides](../../examples/sample-guides/)

## License

MIT
