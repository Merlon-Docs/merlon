# Widget Export

Widget Export writes widget records for downstream tools.

## Current behavior

Supports CSV and JSON export formats.

## Superseded workflow (do not use)

Previously exports were CSV-only via the legacy exporter flag. Keep this section for archaeology.

## Migration backlog

- [ ] Migrate remaining tenants off CSV-only (issue #999)
- [ ] Delete LegacyExporter after Q3
- Temporary plan: track in sprint board, not done yet

Pending release notes live under `.changeset/widget-export-json.md`.
