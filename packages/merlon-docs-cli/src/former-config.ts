import { DEFAULT_CONFIG_VERSION } from '@merlon-docs/merlon-docs-core';

/**
 * Text of a former config with its top-level `protocolVersion` or `standardVersion` key renamed
 * to `configVersion` and its value updated to `DEFAULT_CONFIG_VERSION`. Other text and
 * formatting are kept, and text that isn't a JSON object, that already sets `configVersion`, or
 * that has neither former key comes back unchanged.
 */
export function migrateFormerConfigText(text: string): string {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return text;
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return text;
  const record = parsed as Record<string, unknown>;
  if (record.configVersion !== undefined) return text;
  const formerKey = ['protocolVersion', 'standardVersion'].find((k) => record[k] !== undefined);
  if (!formerKey) return text;
  const migrated = text.replace(
    new RegExp(`"${formerKey}"(\\s*:\\s*)"(?:\\\\.|[^"\\\\])*"`),
    `"configVersion"$1${JSON.stringify(DEFAULT_CONFIG_VERSION)}`,
  );
  try {
    const check = JSON.parse(migrated) as Record<string, unknown>;
    if (check.configVersion === DEFAULT_CONFIG_VERSION && !(formerKey in check)) return migrated;
  } catch {
    // The rename hit a nested key or a string; keep the original text.
  }
  return text;
}
