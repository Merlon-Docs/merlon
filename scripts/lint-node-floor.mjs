#!/usr/bin/env node
/**
 * Fail when the workflows' "Set up the Node floor" steps set a node-version other than the
 * minimum of engines.node, or when the engines.node ranges in the package.json files disagree.
 */
import { checkNodeFloor, readNodeFloorInputs } from './lib/node-floor.mjs';

const errors = checkNodeFloor(readNodeFloorInputs(process.cwd()));
if (errors.length > 0) {
  for (const e of errors) console.error(`lint-node-floor: ${e}`);
  process.exit(1);
}
console.log('lint-node-floor: ok');
