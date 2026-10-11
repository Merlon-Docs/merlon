#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

/**
 * @typedef {{ name: string, summaryPath: string }} CoveragePackage
 */

/**
 * @param {CoveragePackage[]} packages
 * @returns {Promise<string>}
 */
export async function formatCoverageJobSummary(packages) {
  const rows = [];
  let successCount = 0;
  for (const pkg of packages) {
    try {
      const raw = await readFile(pkg.summaryPath, 'utf8');
      const data = JSON.parse(raw);
      const t = data.total;
      rows.push(
        `| ${pkg.name} | ${fmtPct(t.statements.pct)} | ${fmtPct(t.branches.pct)} | ${fmtPct(t.functions.pct)} | ${fmtPct(t.lines.pct)} |`,
      );
      successCount++;
    } catch {
      rows.push(`| ${pkg.name} | n/a | n/a | n/a | n/a |`);
    }
  }

  if (successCount === 0 && packages.length > 0) {
    throw new Error('All packages failed to provide coverage summaries');
  }

  return [
    '## Package code coverage',
    '',
    '| Package | Statements | Branches | Functions | Lines |',
    '| --- | --- | --- | --- | --- |',
    ...rows,
    '',
  ].join('\n');
}

function fmtPct(n) {
  return `${n}%`;
}

const isDirectRun =
  process.argv[1] != null && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  const defaults = [
    {
      name: 'merlon-docs-core',
      summaryPath: 'packages/merlon-docs-core/coverage/coverage-summary.json',
    },
    {
      name: 'merlon-docs-cli',
      summaryPath: 'packages/merlon-docs-cli/coverage/coverage-summary.json',
    },
  ];
  formatCoverageJobSummary(defaults)
    .then((md) => {
      process.stdout.write(md);
    })
    .catch((err) => {
      process.stderr.write(String(err.stack || err) + '\n');
      process.exit(1);
    });
}
