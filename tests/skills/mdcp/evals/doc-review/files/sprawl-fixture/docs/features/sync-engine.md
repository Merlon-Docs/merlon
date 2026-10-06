# Sync engine

The sync engine copies issued invoices to the connected accounting system. It reads the audit log
for invoice state changes, batches them per organisation, and posts each batch to the accounting
connector. A failed batch is retried three times and then parked for an administrator.

## How to reconnect your accounting system

If invoices stop appearing in your accounting system:

1. Open **Settings → Integrations**.
2. Select **Reconnect** next to your accounting system and sign in again.
3. Choose **Resend parked invoices** to send anything that failed while you were disconnected.

You will see a green check next to the integration when it is working again.
