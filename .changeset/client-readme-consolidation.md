---
'@bwilliamson/mdcp-cli': patch
'@bwilliamson/mdcp-core': patch
---

README cleanup. The CLI README explains in one section, "Not the Agent Skill", how the CLI, the core library and the Agent Skill differ. The "LLM collaboration" and "Agent Skill (related)" sections that repeated it are gone. The core README folds its Overview section into About.

Deep links to the CLI README's `#llm-collaboration` and `#agent-skill-related` anchors no longer resolve, so point them at `#not-the-agent-skill`. The core README's `#overview` anchor is gone too, and its content is now under `#about-bwilliamsonmdcp-core`.

Both READMEs now put their related packages, further reading and license after the guide sections, just before the glossary. In the CLI README these sat inside the Agent integration section, and in the core README they came before the API sections. The related packages are a list instead of a table, and the presets entry describes the MDCP Vale style as well as the markdownlint configs. The `#related-packages`, `#further-reading` and `#license` anchors don't change.

The CLI README says once, in the `refs` glossary entry, that refs check links and do not find documents. Other CLI sections no longer repeat it, and the command reference links to that entry. The `refs` and `refs registry` glossary entries use the registered command names `mdcp refs-gen` and `mdcp refs-check`, and the config table calls `refs.registryFile` the refs registry file instead of a lookup table.
