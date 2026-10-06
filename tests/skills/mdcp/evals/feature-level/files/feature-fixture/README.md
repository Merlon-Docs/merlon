# Fake consumer repo for feature-level evals

Isolated fixture for skill-creator runs. Treat this directory as the working-tree
root when evaluating `mdcp-feature-level`. Do not edit the real monorepo `docs/`
or `packages/`.

`compileOrder` is `features → client → developer` (see `docs/mdcp.config.json`).
Ship features docs-first: maintainer-facing capability in `docs/features/`, and
end-user value/usage in `docs/client/`.
