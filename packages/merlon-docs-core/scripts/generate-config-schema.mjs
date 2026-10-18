#!/usr/bin/env node
/**
 * Write merlon.config.schema.json, the editor schema for merlon.config.json, from
 * MerlonConfigFileSchema in src/config/schema.ts. `pnpm build` runs this after tsup, and CI's
 * `git diff --exit-code` after the build fails when the committed file is stale.
 */
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { MerlonConfigFileSchema } from '../dist/index.js';

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(packageRoot, 'merlon.config.schema.json');

// `input` describes what a user writes, so a key with a default is optional.
const { $schema, ...schema } = z.toJSONSchema(MerlonConfigFileSchema, {
  io: 'input',
  target: 'draft-07',
});

const document = {
  $schema,
  $comment:
    'GENERATED FILE, do not edit. Change packages/merlon-docs-core/src/config/schema.ts and run pnpm build, which runs packages/merlon-docs-core/scripts/generate-config-schema.mjs.',
  ...schema,
};

writeFileSync(out, `${JSON.stringify(document, null, 2)}\n`);
