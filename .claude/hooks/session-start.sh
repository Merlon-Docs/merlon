#!/bin/bash
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR"

# --- pnpm dependencies ---
pnpm install

# --- Vale (peer binary, not an npm dep) ---
if ! command -v vale &>/dev/null; then
  VALE_VERSION=3.15.1
  curl -fsSL "https://github.com/vale-cli/vale/releases/download/v${VALE_VERSION}/vale_${VALE_VERSION}_Linux_64-bit.tar.gz" \
    | sudo tar xz -C /usr/local/bin vale
fi

# --- Vale style packages ---
pnpm run vale:sync

# --- Build (dist/ is gitignored, required before CLI/docs scripts) ---
pnpm build

# --- Agent Skill: install this checkout's mdcp skill, so agents use the latest ---
pnpm run skill:dev
