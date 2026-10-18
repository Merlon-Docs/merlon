# Agent guide

Instructions for coding agents working in this repository.

## Repository map

| Path              | What it holds                                 |
| ----------------- | --------------------------------------------- |
| `docs/`           | Sharded product docs; edit shards, not output |
| `services/email/` | The email sender                              |
| `services/hooks/` | The webhook worker                            |

## Local run

Start the email sender and the webhook worker before you test digests:

```bash
npm run email-sender
npm run webhook-worker
```

## Webhook worker

Restart the webhook workers after you change a digest template.
