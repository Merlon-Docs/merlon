#!/usr/bin/env node
/**
 * Rewrite Vitest's hardcoded "## Vitest Test Report" job-summary dump to a
 * package-labeled heading, then append it to $GITHUB_STEP_SUMMARY.
 *
 * Vitest 4.1 always emits the same H2 for every run (no project name), which
 * is unreadable when merlon-docs-core and merlon-docs-cli both append to the same summary.
 *
 * Usage:
 *   GITHUB_STEP_SUMMARY=/path/to/real-summary \
 *     node scripts/append-labeled-vitest-summary.mjs <label> <dump-path>
 */
import { appendFile, readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

/**
 * @param {string} label
 * @param {string} dumpMarkdown
 * @returns {string}
 */
export function relabelVitestJobSummary(label, dumpMarkdown) {
  const body = dumpMarkdown.replace(/\r\n/g, '\n');
  if (body.trim() === '') {
    return `## ${label} — Vitest\n\n_(no Vitest job summary produced)_\n`;
  }
  if (/^## Vitest Test Report\n/m.test(body)) {
    return body.replace(/^## Vitest Test Report\n/m, `## ${label} — Vitest\n`);
  }
  return `## ${label} — Vitest\n\n${body.endsWith('\n') ? body : `${body}\n`}`;
}

const isDirectRun =
  process.argv[1] != null && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  const label = process.argv[2];
  const dumpPath = process.argv[3];
  const dest = process.env.GITHUB_STEP_SUMMARY;

  if (!label || !dumpPath) {
    process.stderr.write('usage: append-labeled-vitest-summary.mjs <label> <dump-path>\n');
    process.exit(2);
  }
  if (!dest) {
    process.stderr.write('GITHUB_STEP_SUMMARY is not set; nothing to append\n');
    process.exit(0);
  }

  readFile(dumpPath, 'utf8')
    .then(async (raw) => {
      const labeled = relabelVitestJobSummary(label, raw);
      await appendFile(dest, labeled.endsWith('\n') ? labeled : `${labeled}\n`);
    })
    .catch((err) => {
      process.stderr.write(String(err.stack || err) + '\n');
      process.exit(1);
    });
}
