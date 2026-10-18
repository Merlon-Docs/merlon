#!/usr/bin/env node
/**
 * Write src/config/standard-version.ts from the **Version:** line of the Merlon Docs
 * specification, the one place the standard's version is set. `pnpm build` runs this before
 * tsup, and CI's `git diff --exit-code` after the build fails when the committed file is stale.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const specPath = 'docs/features/system/merlon-docs-1.0-spec.md';
const spec = readFileSync(join(packageRoot, '../..', specPath), 'utf8');

const match = spec.match(/^\*\*Version:\*\* `([^`]+)`$/m);
if (!match) {
  console.error(`${specPath} has no "**Version:** \`x.y.z\`" line.`);
  process.exit(1);
}

writeFileSync(
  join(packageRoot, 'src/config/standard-version.ts'),
  `// GENERATED FILE, do not edit. The version comes from the **Version:** line of
// ${specPath}; change it there and run pnpm build, which runs
// packages/merlon-docs-core/scripts/generate-standard-version.mjs.
export const STANDARD_VERSION = ${JSON.stringify(match[1])};
`,
);
