# ADR 0003: Do not adopt OKF

- **Status:** Accepted
- **Date:** 2026-07-15

## Context

We evaluated the OKF (One Knowledge Format) for our documentation format to ensure consistency, clarity, and machine-readability across our ecosystem. OKF attempts to unify markdown documentation under specific structural guidelines, establishing rules and expected behaviors for document organization.

However, as we scaled our documentation, we noted that OKF enforces rigid structures and a high level of detail that adds unnecessary complexity. Our developers and authoring workflows benefit from flexibility and simplicity. An opinionated, highly detailed format risks creating friction, discouraging contributions, and increasing the maintenance burden for our tools and systems.

## Decision

We will **not** adopt or mandate OKF as the official format for our documentation. Instead, we establish simple GFM (GitHub Flavored Markdown) as our baseline.

By doing so, we maintain our internal documentation straightforwardly without the heavy overhead of strict structural formats like OKF.

## Consequences

- Our documentation will use simple GFM as its baseline.
- Our systems and validation tools will rely on standard GFM rather than enforcing OKF-specific constructs.
- We remain unopinionated regarding our downstream users and ecosystems. While we do not use OKF internally, we are perfectly happy to consume, generate, or work with OKF, GFM, or any other markdown style if a consumer or integrated system prefers it.
- This change maintains a low barrier to entry for documentation contributors.
