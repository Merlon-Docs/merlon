import { describe, it, expect } from 'vitest';
import { migrateFormerConfigText } from '../src/former-config.js';

describe('migrateFormerConfigText', () => {
  it('renames a top-level protocolVersion key to standardVersion at 1.0.0-draft.0 and keeps the formatting', () => {
    const text = '{\n  "outputDir": "_build",\n  "protocolVersion" : "0.4.0.0"\n}\n';
    expect(migrateFormerConfigText(text)).toBe(
      '{\n  "outputDir": "_build",\n  "standardVersion" : "1.0.0-draft.0"\n}\n',
    );
  });

  it('leaves a config without protocolVersion unchanged', () => {
    const text = '{ "outputDir": "_build" }';
    expect(migrateFormerConfigText(text)).toBe(text);
  });

  it('leaves a config that already sets standardVersion unchanged', () => {
    const text = '{ "standardVersion": "1.0.0-draft.0", "protocolVersion": "1.0.0-draft.0" }';
    expect(migrateFormerConfigText(text)).toBe(text);
  });

  it('leaves text unchanged when the first match is not the top-level key', () => {
    const text = '{ "note": { "protocolVersion": "x" }, "protocolVersion": "0.4.0.0" }';
    expect(migrateFormerConfigText(text)).toBe(text);
  });

  it('leaves invalid JSON and non-object JSON unchanged', () => {
    expect(migrateFormerConfigText('{ "not": "valid" ')).toBe('{ "not": "valid" ');
    expect(migrateFormerConfigText('[1, 2]')).toBe('[1, 2]');
  });
});
