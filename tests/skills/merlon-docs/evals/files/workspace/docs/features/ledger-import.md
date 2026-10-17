# Ledger import

`tallybook import` reads a CSV bank statement and creates one ledger entry per row. Rows whose date,
amount, and description match an existing entry are skipped, so importing the same statement twice
is safe.

## Column mapping

The first import of a bank's statement asks which columns hold the date, amount, and description,
and saves the answer per bank. Later imports reuse the saved mapping.
