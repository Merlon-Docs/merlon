/**
 * Text of a former config with its top-level `protocolVersion` key renamed to
 * `standardVersion`. Other text and formatting are kept, and text that isn't a JSON
 * object, or that already sets `standardVersion`, comes back unchanged.
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
  if (record.protocolVersion === undefined || record.standardVersion !== undefined) return text;
  const migrated = text.replace(/"protocolVersion"(\s*:)/, '"standardVersion"$1');
  try {
    const check = JSON.parse(migrated) as Record<string, unknown>;
    if (check.standardVersion === record.protocolVersion && !('protocolVersion' in check)) {
      return migrated;
    }
  } catch {
    // The rename hit a nested key or a string; keep the original text.
  }
  return text;
}
