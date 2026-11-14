---
'@merlon-docs/skill-merlon-docs': minor
---

Doc review now runs a five-step evidence check on every claim it makes about a doc, such as an error, a duplicate, or a mismatch with the code. For each claim, the agent records the claim as printed, the file or URL it opened (not the citation), a quote of what that source says, a verdict (matches, disagrees, missing, impossible, superseded, or can't tell) with its confidence, and what it would have concluded one step earlier. Only a claim that matches with high or moderate confidence leads to an edit. The record goes in the reply and in the commit message of the group that acts on it. The new `references/review/evidence-check.md` defines the check, the doc-review workflow runs it at the start of Step 3, the review lenses send each finding to it, and the two-level review principle in `SKILL.md` applies it to any review.
