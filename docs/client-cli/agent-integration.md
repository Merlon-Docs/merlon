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
