#!/usr/bin/env bash
set -e

ITERATION=${1:-1}
WORKSPACE=".agents/skills/merlon-docs-workspace/iteration-$ITERATION"

if [ ! -d "$WORKSPACE" ]; then
  echo "Error: Workspace directory '$WORKSPACE' not found."
  exit 1
fi

echo "Generating static viewer for $WORKSPACE..."
PYTHONPATH=.agents/skills/skill-creator python3 .agents/skills/skill-creator/eval-viewer/generate_review.py \
  "$WORKSPACE" \
  --skill-name merlon-docs \
  --benchmark "$WORKSPACE/benchmark.json" \
  --static "$WORKSPACE/viewer.html"

echo "Opening viewer in your browser..."
open "$WORKSPACE/viewer.html" || echo "Please open $WORKSPACE/viewer.html in your browser manually."

