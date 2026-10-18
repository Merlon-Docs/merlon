import { describe, it, expect } from 'vitest';
import { DEFAULT_CONFIG_VERSION } from '@merlon-docs/merlon-docs-core';
import { migrateFormerConfigText } from '../src/former-config.js';

describe('migrateFormerConfigText', () => {
  it.each(['protocolVersion', 'standardVersion'])(
    'renames a top-level %s key to configVersion at this release and keeps the formatting',
    (key) => {
      const text = `{\n  "outputDir": "_build",\n  "${key}" : "0.4.0.0"\n}\n`;
      expect(migrateFormerConfigText(text)).toBe(
        `{\n  "outputDir": "_build",\n  "configVersion" : "${DEFAULT_CONFIG_VERSION}"\n}\n`,
      );
    },
  );

  it('leaves a config without a former version key unchanged', () => {
    const text = '{ "outputDir": "_build" }';
    expect(migrateFormerConfigText(text)).toBe(text);
  });

  it('leaves a config that already sets configVersion unchanged', () => {
    const text = '{ "configVersion": "0.9.0", "protocolVersion": "0.4.0.0" }';
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
