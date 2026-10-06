<style scoped>
.columns {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  align-items: center;
}
.columns img {
  width: 100%;
  height: auto;
  max-height: 500px;
  object-fit: contain;
}
</style>

<div class="columns">
<div>

## The 30,000-Foot View: MDCP in the Value Stream

Where does MDCP sit in the software development value stream? It forms a persistent, machine-readable **Context Layer**.

The actors interact with the MDCP context layer to author intent, provide context, and generate evidence.

</div>
<div>

```mermaid {scale: 0.7}
graph TD
    %% Actors
    PM["Product & Arch"]
    AI["AI Agents & Devs"]
    QA["QA & Compliance"]

    %% Artifacts
    MDCP_In("MDCP\n(Feature/Dev Docs)")
    Code["Source Code"]
    MDCP_Out("MDCP\n(Client Docs)")

    %% Flow
    PM -->|"Author Intent"| MDCP_In
    MDCP_In -->|"Context"| AI
    AI -->|"Write/Test"| Code
    AI -->|"Evidence"| MDCP_Out
    Code -->|"Verify"| QA
    MDCP_Out -->|"Audit"| QA
```

</div>
</div>

---

<style scoped>
.columns {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  align-items: center;
}
.columns img {
  width: 100%;
  height: auto;
  max-height: 500px;
  object-fit: contain;
}
</style>

<div class="columns">
<div>

## MDCP Across the SDLC

While the previous diagram highlights _who_ interacts with MDCP, this view shows _where_ it sits in the traditional SDLC.

Instead of documentation being a disconnected artifact, MDCP acts as a continuous, bidirectional context layer.

</div>
<div>

```mermaid {scale: 0.7}
graph TD
    subgraph SDLC
        Plan --> Code --> Test --> Release --> Operate
    end

    MDCP("MDCP Context Layer")

    %% Skills
    ArchSkill["Arch Skill"]
    FeatureSkill["Feature Skill"]
    TestSkill["Test Skill"]
    ReleaseSkill["Release Skill"]
    PostMortemSkill["Post-mortem Skill"]

    Plan -.-> ArchSkill
    ArchSkill -.-> MDCP

    Code -.-> FeatureSkill
    FeatureSkill -.-> MDCP
    MDCP -.->|"Context"| Code

    MDCP -.-> TestSkill
    TestSkill -.->|"Acceptance"| Test

    MDCP -.-> ReleaseSkill
    ReleaseSkill -.-> Release

    Operate -.-> PostMortemSkill
    PostMortemSkill -.-> MDCP
```

</div>
</div>

---

## SDLC Skills at a Glance

| Phase       | Agent Skill         | Action                                            |
| ----------- | ------------------- | ------------------------------------------------- |
| **Plan**    | `arch skill`        | Draft architecture docs                           |
| **Code**    | `feature skill`     | Ensure high-level and dev docs exist              |
| **Test**    | `test skill`        | Capture client-side and dev-side intent           |
| **Release** | `release skill`     | Ensure support docs are available and relevant    |
| **Operate** | `post-mortem skill` | Distill tickets and post-mortems back into shards |

---

## What MDCP Replaces

To understand where to pull MDCP in, we must be clear on its boundaries.

- Fragmented, quickly-outdated Wiki pages.
- Stale `README.md` files that no one trusts.
- Scattered Architecture Decision Records (ADRs).
- Undocumented "tribal knowledge."

---

## What MDCP Isn't

- **Not a Jira alternative:** It doesn't track task states or agile sprints.
- **Not active system monitoring:** It doesn't tell you if the server is down.
- **Not a rigid documentation silo:** It lives _in_ the repository alongside the code.

---
