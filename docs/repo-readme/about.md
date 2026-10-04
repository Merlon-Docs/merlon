# Why use MDCP?

- **Built for documentation-system thinkers:** Puts durable intent (specs, design notes, glossaries) in the repo where it compounds — not only in chat history or slide decks.
- **Lower maintenance as ideas keep coming:** One topic per shard means new features extend the docs tree instead of bloating a single file you no longer trust.
- **Docs-as-code for agents:** Agents update shards before implementing, so “what we meant” stays reviewable in git (the V1 transport) alongside the change.
- **Smaller, safer context loads:** People and LLMs read the section that matches the task — not the whole guide every turn.
- **Validation gate:** `mdcp check` keeps cross-links and refs trustworthy in CI when the docs system grows.
- **Portable skill:** Works in Cursor, GitHub Copilot, Claude Code, and other hosts that support [Agent Skills](https://agentskills.io).
