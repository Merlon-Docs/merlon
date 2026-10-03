---
'@bwilliamson/skill-mdcp': patch
---

Workflows no longer stop at intake when nobody can answer. The skill takes `WORK_ITEM` and the other intake values from the request and the repository. When a value is still missing, it states the default it picked and carries on. It still waits when the user asked for a plan first, and before a destructive step, a change of scope, or input only the user can give.
