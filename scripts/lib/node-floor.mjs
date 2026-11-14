/**
 * The Node floor: CI's Check job and the land gate end by running the built CLI on the
 * oldest Node that `engines.node` allows. The version sits in two kinds of places, the
 * `engines.node` ranges and the workflows' "Set up the Node floor" steps, and these
 * helpers report where they disagree.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export const FLOOR_STEP_NAME = 'Set up the Node floor';

/**
 * The minimum version of an `engines.node` range written as `>=MAJOR.MINOR.PATCH`,
 * or null for any other form.
 * @param {string} range
 * @returns {string | null}
 */
export function minVersionOfRange(range) {
  const m = /^>=\s*(\d+\.\d+\.\d+)$/.exec(range.trim());
  return m ? m[1] : null;
}

/** @param {string} line */
function indentOf(line) {
  return line.length - line.trimStart().length;
}

/** @param {string} raw */
function scalar(raw) {
  return raw
    .replace(/\s+#.*$/, '')
    .trim()
    .replace(/^(['"])(.*)\1$/, '$2');
}

/**
 * The steps of every `steps:` list in a workflow, read line by line.
 * @param {string} text
 * @returns {{ line: number, name: string | null, uses: string | null, nodeVersion: string | null }[]}
 */
export function workflowSteps(text) {
  const lines = text.split(/\r?\n/);
  /** @type {{ line: number, name: string | null, uses: string | null, nodeVersion: string | null }[]} */
  const steps = [];
  for (let i = 0; i < lines.length; i++) {
    const stepsKey = /^(\s*)steps:\s*(#.*)?$/.exec(lines[i]);
    if (!stepsKey) continue;
    const blockIndent = stepsKey[1].length;
    let itemIndent = -1;
    /** @type {(typeof steps)[number] | null} */
    let step = null;
    let j = i + 1;
    for (; j < lines.length; j++) {
      const line = lines[j];
      if (line.trim() === '' || line.trimStart().startsWith('#')) continue;
      const indent = indentOf(line);
      if (indent <= blockIndent) break;
      const item = /^(\s*)-\s+(.*)$/.exec(line);
      if (item && (itemIndent === -1 || item[1].length === itemIndent)) {
        itemIndent = item[1].length;
        step = { line: j + 1, name: null, uses: null, nodeVersion: null };
        steps.push(step);
      }
      if (!step) continue;
      const body = item && item[1].length === itemIndent ? item[2] : line.trim();
      const key = /^([\w-]+):\s*(.*)$/.exec(body);
      if (!key) continue;
      const atStepLevel = (item && item[1].length === itemIndent) || indent === itemIndent + 2;
      if (atStepLevel && key[1] === 'name') step.name = scalar(key[2]);
      if (atStepLevel && key[1] === 'uses') step.uses = scalar(key[2]);
      if (key[1] === 'node-version') step.nodeVersion = scalar(key[2]);
    }
    i = j - 1;
  }
  return steps;
}

/**
 * @param {{
 *   engines: { file: string, range: string }[],
 *   workflows: { file: string, text: string }[],
 * }} input
 * @returns {string[]} one message per problem; empty when the floor agrees everywhere
 */
export function checkNodeFloor({ engines, workflows }) {
  /** @type {string[]} */
  const errors = [];

  if (engines.length === 0) {
    errors.push('no package.json declares engines.node');
    return errors;
  }
  const ranges = new Set(engines.map((e) => e.range.trim()));
  if (ranges.size > 1) {
    errors.push(
      `engines.node ranges disagree: ${engines.map((e) => `${e.file} "${e.range}"`).join(', ')}`,
    );
  }
  const minimums = new Set();
  for (const e of engines) {
    const min = minVersionOfRange(e.range);
    if (min === null) {
      errors.push(
        `${e.file}: can't read a minimum from engines.node "${e.range}"; write it as >=MAJOR.MINOR.PATCH`,
      );
    } else {
      minimums.add(min);
    }
  }
  const floor = minimums.size === 1 ? [...minimums][0] : null;

  let floorSteps = 0;
  for (const wf of workflows) {
    const steps = workflowSteps(wf.text);
    const setup = steps.filter((s) => s.name === FLOOR_STEP_NAME);
    floorSteps += setup.length;
    if (setup.length === 0 && steps.some((s) => s.name && /node floor/i.test(s.name))) {
      errors.push(
        `${wf.file}: a step names the Node floor, but no step is named "${FLOOR_STEP_NAME}"`,
      );
    }
    for (const s of setup) {
      if (!s.uses || !s.uses.startsWith('actions/setup-node@')) {
        errors.push(`${wf.file}:${s.line}: "${FLOOR_STEP_NAME}" doesn't use actions/setup-node`);
      } else if (!s.nodeVersion) {
        errors.push(`${wf.file}:${s.line}: "${FLOOR_STEP_NAME}" has no node-version`);
      } else if (floor !== null && s.nodeVersion !== floor) {
        errors.push(
          `${wf.file}:${s.line}: "${FLOOR_STEP_NAME}" sets node-version ${s.nodeVersion}, but engines.node allows ${floor} and up`,
        );
      }
    }
  }
  if (floorSteps === 0) {
    errors.push(`no workflow has a step named "${FLOOR_STEP_NAME}"`);
  }
  return errors;
}

/**
 * Reads engines.node from the root package.json and packages/*\/package.json, and every
 * workflow under .github/workflows.
 * @param {string} root
 */
export function readNodeFloorInputs(root) {
  /** @type {{ file: string, range: string }[]} */
  const engines = [];
  const packageFiles = ['package.json'];
  const packagesDir = join(root, 'packages');
  if (existsSync(packagesDir)) {
    for (const e of readdirSync(packagesDir, { withFileTypes: true })) {
      if (e.isDirectory() && existsSync(join(packagesDir, e.name, 'package.json'))) {
        packageFiles.push(`packages/${e.name}/package.json`);
      }
    }
  }
  for (const file of packageFiles.sort()) {
    const pkg = JSON.parse(readFileSync(join(root, file), 'utf8'));
    const range = pkg.engines?.node;
    if (typeof range === 'string') engines.push({ file, range });
  }

  /** @type {{ file: string, text: string }[]} */
  const workflows = [];
  const workflowsDir = join(root, '.github', 'workflows');
  if (existsSync(workflowsDir)) {
    for (const name of readdirSync(workflowsDir).sort()) {
      if (!/\.ya?ml$/.test(name)) continue;
      workflows.push({
        file: `.github/workflows/${name}`,
        text: readFileSync(join(workflowsDir, name), 'utf8'),
      });
    }
  }
  return { engines, workflows };
}
