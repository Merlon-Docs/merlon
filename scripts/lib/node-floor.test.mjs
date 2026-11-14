import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { checkNodeFloor, minVersionOfRange, readNodeFloorInputs } from './node-floor.mjs';

const FLOOR = '10.2.3';

/** A workflow with a regular Node setup, the floor setup and the floor run step. */
function workflow(floorVersion, { setupName = 'Set up the Node floor' } = {}) {
  return `name: Demo
on: push
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/setup-node@0000000000000000000000000000000000000000 # v1
        with:
          node-version: 99
      - run: git diff --exit-code

      # The floor.
      - name: ${setupName}
        uses: actions/setup-node@0000000000000000000000000000000000000000 # v1
        with:
          node-version: ${floorVersion}

      - name: Run the built CLI on the Node floor
        run: |
          node --version
`;
}

/**
 * Builds a repository with a root package.json, one package per entry of `packages`
 * and the given workflows, and returns its path.
 * @param {{ root: string, packages: Record<string, string | undefined>, workflows: Record<string, string> }} spec
 */
function makeRepo({ root, packages, workflows }) {
  const dir = mkdtempSync(join(tmpdir(), 'node-floor-'));
  writeFileSync(
    join(dir, 'package.json'),
    JSON.stringify({ name: 'root', engines: { node: root } }),
  );
  for (const [name, range] of Object.entries(packages)) {
    mkdirSync(join(dir, 'packages', name), { recursive: true });
    const pkg = range === undefined ? { name } : { name, engines: { node: range } };
    writeFileSync(join(dir, 'packages', name, 'package.json'), JSON.stringify(pkg));
  }
  mkdirSync(join(dir, '.github', 'workflows'), { recursive: true });
  for (const [name, text] of Object.entries(workflows)) {
    writeFileSync(join(dir, '.github', 'workflows', name), text);
  }
  return dir;
}

function check(spec) {
  return checkNodeFloor(readNodeFloorInputs(makeRepo(spec)));
}

describe('node-floor', () => {
  it('reads the minimum from a >= range and nothing else', () => {
    assert.equal(minVersionOfRange(`>=${FLOOR}`), FLOOR);
    assert.equal(minVersionOfRange(` >= ${FLOOR} `), FLOOR);
    assert.equal(minVersionOfRange(`^${FLOOR}`), null);
    assert.equal(minVersionOfRange(`>=${FLOOR} <99`), null);
  });

  it('passes when every engines range and floor step agree', () => {
    const errors = check({
      root: `>=${FLOOR}`,
      packages: { a: `>=${FLOOR}`, b: `>=${FLOOR}`, site: undefined },
      workflows: { 'ci.yml': workflow(FLOOR), 'land.yaml': workflow(`"${FLOOR}"`) },
    });
    assert.deepEqual(errors, []);
  });

  it('fails when a floor step sets another version than the engines minimum', () => {
    const errors = check({
      root: `>=${FLOOR}`,
      packages: { a: `>=${FLOOR}` },
      workflows: { 'ci.yml': workflow(FLOOR), 'land.yml': workflow('10.2.4') },
    });
    assert.equal(errors.length, 1);
    assert.match(errors[0], /^\.github\/workflows\/land\.yml:13: .*node-version 10\.2\.4/);
    assert.match(errors[0], new RegExp(`allows ${FLOOR.replaceAll('.', '\\.')} and up`));
  });

  it('fails when the engines ranges disagree', () => {
    const errors = check({
      root: `>=${FLOOR}`,
      packages: { a: `>=${FLOOR}`, b: '>=10.3.0' },
      workflows: { 'ci.yml': workflow(FLOOR) },
    });
    assert.equal(errors.length, 1);
    assert.match(errors[0], /engines\.node ranges disagree/);
    assert.match(errors[0], /packages\/b\/package\.json ">=10\.3\.0"/);
  });

  it('fails when an engines range has no readable minimum', () => {
    const errors = check({
      root: `^${FLOOR}`,
      packages: {},
      workflows: { 'ci.yml': workflow(FLOOR) },
    });
    assert.deepEqual(errors.length, 1);
    assert.match(errors[0], /^package\.json: can't read a minimum/);
  });

  it('fails when the floor setup step is renamed or missing', () => {
    const renamed = check({
      root: `>=${FLOOR}`,
      packages: {},
      workflows: { 'ci.yml': workflow('10.0.0', { setupName: 'Use the oldest Node' }) },
    });
    assert.equal(renamed.length, 2);
    assert.match(renamed[0], /ci\.yml: a step names the Node floor/);
    assert.match(renamed[1], /no workflow has a step named/);

    const none = check({ root: `>=${FLOOR}`, packages: {}, workflows: {} });
    assert.deepEqual(none, ['no workflow has a step named "Set up the Node floor"']);
  });
});
