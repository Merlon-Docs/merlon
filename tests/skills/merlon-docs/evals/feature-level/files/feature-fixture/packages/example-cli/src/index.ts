export function exportReport(report: unknown): string {
  return JSON.stringify(report);
}

export function main(argv: string[]): void {
  const report = { ok: true };
  if (argv.includes('export')) {
    process.stdout.write(exportReport(report) + '\n');
  }
}
