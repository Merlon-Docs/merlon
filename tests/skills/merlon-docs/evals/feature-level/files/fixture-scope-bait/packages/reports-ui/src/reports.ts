/** Reports UI stub — export-to-CSV not implemented yet. */

export type Report = { id: string; title: string };

export function listReports(): Report[] {
  return [{ id: 'r1', title: 'Weekly ops' }];
}

export function renderReportsPage(selected: Report | null): string {
  if (!selected) return 'No report selected';
  return `Report: ${selected.title}`;
}
