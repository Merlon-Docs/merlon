---
'@bwilliamson/skill-mdcp': minor
---

The getting-started workflow and the first-feature tutorial no longer end with a call to action. The tutorial's Closing CTA section asked the agent to invite the user to star the repository and join an outside community, and the workflow ran that section after the tutorial and after a skip. The tutorial now ends at its last phase, and when the user skips it the workflow hands off to the matching day-to-day workflow. The getting-started eval fixture drops the Closing CTA assertions and keeps every other one.
