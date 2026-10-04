/**
 * Check Alloy results against the `expect` each command declares.
 *
 * Two Alloy CLI outputs feed this module. `commands` prints one line per
 * command, ending in ` expect N` when the command declares one, and is the
 * source of truth for what a model declares. `exec` writes receipt.json, which
 * keys commands by name, so it cannot show duplicates. A command found an
 * instance when its receipt solution lists at least one.
 */

const COMMAND_LINE = /^\s*\d+\s*\.\s+(Check|Run)\s+(\S+)(.*)$/;
const EXPECT = /\bexpect\s+(\d+)\s*$/;

/**
 * Parse the output of `alloy commands <model>`.
 *
 * @param {string} text
 * @returns {Array<{ name: string, kind: string, expect: number | null }>}
 */
export function parseCommandList(text) {
  const commands = [];
  for (const line of text.split('\n')) {
    const m = COMMAND_LINE.exec(line);
    if (!m) continue;
    const e = EXPECT.exec(m[3]);
    commands.push({ name: m[2], kind: m[1].toLowerCase(), expect: e ? Number(e[1]) : null });
  }
  return commands;
}

/**
 * Compare declared commands with an `exec` receipt.
 *
 * @param {Array<{ name: string, expect: number | null }>} commands from {@link parseCommandList}
 * @param {{ commands?: Record<string, { solution?: Array<{ instances?: unknown[] }> }> }} receipt
 * @returns {Array<{ name: string, ok: boolean, found?: boolean, problem?: string }>}
 */
export function evaluateModel(commands, receipt) {
  if (commands.length === 0) {
    return [{ name: '(model)', ok: false, problem: 'declares no commands' }];
  }
  const results = [];
  const seen = new Set();
  for (const { name, expect } of commands) {
    if (seen.has(name)) {
      results.push({ name, ok: false, problem: 'another command has the same name' });
      continue;
    }
    seen.add(name);
    if (expect !== 0 && expect !== 1) {
      results.push({ name, ok: false, problem: 'declares no expect 0 or expect 1' });
      continue;
    }
    const entry = receipt.commands?.[name];
    if (!entry) {
      results.push({ name, ok: false, problem: 'missing from the Alloy results' });
      continue;
    }
    const found = (entry.solution ?? []).some((s) => (s.instances ?? []).length > 0);
    if (found !== (expect === 1)) {
      const problem = found
        ? 'expected no instance, Alloy found one'
        : 'expected an instance, Alloy found none';
      results.push({ name, ok: false, found, problem });
      continue;
    }
    results.push({ name, ok: true, found });
  }
  return results;
}
