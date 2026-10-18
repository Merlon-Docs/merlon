# Digests

Digestly sends each subscriber a daily digest of the posts they follow. The
email sender delivers it to the subscriber's inbox, and the webhook
worker posts the same digest to any webhook URL the subscriber registered.

## Delivery

| Channel | Sent by            | When                     |
| ------- | ------------------ | ------------------------ |
| Email   | The email sender   | 07:00 in the user's zone |
| Webhook | The webhook worker | 07:00 UTC                |
