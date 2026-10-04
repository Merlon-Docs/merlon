import { describe, it, expect } from 'vitest';
import { MdcpConfigSchema, type MdcpConfigInput } from '@bwilliamson/mdcp-core';
import { valeArgs, valeMinAlertLevel } from '../src/vale-args.js';

function config(extra: Partial<MdcpConfigInput> = {}) {
  return MdcpConfigSchema.parse({ compileOrder: ['g'], ...extra });
}

describe('valeMinAlertLevel', () => {
  it('passes no level in a non-strict run, so .vale.ini MinAlertLevel applies', () => {
    expect(valeMinAlertLevel(config(), false)).toBeUndefined();
    // A vale block defaults strictMinAlertLevel to error; non-strict runs still ignore it.
    expect(valeMinAlertLevel(config({ vale: {} }), false)).toBeUndefined();
  });

  it('defaults a strict run to error', () => {
    expect(valeMinAlertLevel(config(), true)).toBe('error');
    expect(valeMinAlertLevel(config({ vale: {} }), true)).toBe('error');
  });

  it('uses vale.strictMinAlertLevel in a strict run', () => {
    const cfg = config({ vale: { strictMinAlertLevel: 'warning' } });
    expect(valeMinAlertLevel(cfg, true)).toBe('warning');
    expect(valeMinAlertLevel(cfg, false)).toBeUndefined();
  });
});

describe('valeArgs', () => {
  it('builds the config flag, the level and the scan paths', () => {
    const cfg = config({ vale: { config: 'v.ini', strictMinAlertLevel: 'suggestion' } });
    expect(valeArgs(cfg, ['/d/g'], true)).toEqual([
      '--config',
      'v.ini',
      '--minAlertLevel=suggestion',
      '/d/g',
    ]);
    expect(valeArgs(cfg, ['/d/g'], false)).toEqual(['--config', 'v.ini', '/d/g']);
  });

  it('defaults the config to .vale.ini', () => {
    expect(valeArgs(config(), ['/d/g'], true)).toEqual([
      '--config',
      '.vale.ini',
      '--minAlertLevel=error',
      '/d/g',
    ]);
  });
});
