import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { evaluateModel, parseCommandList } from './alloy-receipt.mjs';

const LIST = `0 . Check Holds for 4 but 1..7 steps, 6 Commit expect 0
1 . Check Breaks for 4 but 1..7 steps, 6 Commit expect 1
12. Run Reachable for 4 but 1..7 steps expect 1
13. Run Loose for 4 but 1..7 steps
`;

const sat = { solution: [{ instances: [{}] }] };
const unsat = {};

describe('alloy-receipt', () => {
  it('parses names, kinds and expects from the command list', () => {
    assert.deepEqual(parseCommandList(LIST), [
      { name: 'Holds', kind: 'check', expect: 0 },
      { name: 'Breaks', kind: 'check', expect: 1 },
      { name: 'Reachable', kind: 'run', expect: 1 },
      { name: 'Loose', kind: 'run', expect: null },
    ]);
  });

  it('passes when every result matches its expect', () => {
    const results = evaluateModel(
      [
        { name: 'Holds', expect: 0 },
        { name: 'Breaks', expect: 1 },
      ],
      { commands: { Holds: unsat, Breaks: sat } },
    );
    assert.ok(results.every((r) => r.ok));
  });

  it('fails a counterexample to an expect 0 check', () => {
    const [r] = evaluateModel([{ name: 'Holds', expect: 0 }], { commands: { Holds: sat } });
    assert.equal(r.ok, false);
    assert.match(r.problem, /expected no instance/);
  });

  it('fails an unreachable expect 1 run', () => {
    const [r] = evaluateModel([{ name: 'Reachable', expect: 1 }], {
      commands: { Reachable: unsat },
    });
    assert.equal(r.ok, false);
    assert.match(r.problem, /expected an instance/);
  });

  it('counts an empty instance list as no instance', () => {
    const [r] = evaluateModel([{ name: 'Reachable', expect: 1 }], {
      commands: { Reachable: { solution: [{ instances: [] }] } },
    });
    assert.equal(r.ok, false);
  });

  it('fails a command without expect', () => {
    const [r] = evaluateModel([{ name: 'Loose', expect: null }], { commands: { Loose: sat } });
    assert.equal(r.ok, false);
    assert.match(r.problem, /declares no expect/);
  });

  it('fails two commands with the same name', () => {
    const results = evaluateModel(
      [
        { name: 'Twice', expect: 0 },
        { name: 'Twice', expect: 1 },
      ],
      { commands: { Twice: unsat } },
    );
    assert.equal(results[1].ok, false);
    assert.match(results[1].problem, /same name/);
  });

  it('fails a declared command missing from the receipt', () => {
    const [r] = evaluateModel([{ name: 'Gone', expect: 0 }], { commands: {} });
    assert.equal(r.ok, false);
    assert.match(r.problem, /missing/);
  });

  it('fails a model with no commands', () => {
    const [r] = evaluateModel([], { commands: {} });
    assert.equal(r.ok, false);
  });
});
