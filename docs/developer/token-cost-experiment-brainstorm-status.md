# Token / cost experiment brainstorm status (pause)

**Status:** PAUSED — brainstorming in progress; not an approved design.  
**Parent issue:** [GitHub #233](https://github.com/betsalel-williamson/mdcp/issues/233)  
**Resume branch:** `cursor/token-cost-experiment-design-4802`  
**Paused:** 2026-07-31

Use this shard to resume design work. Do **not** treat claims below as Benefit Claims Tier B evidence until the experiment has run and receipts exist.

## Goal (stakeholder question)

Will developing a feature **with** MDCP (skills + sharded docs) cost **less** than baselines, on average, and **at what scale** — while delivering **comparable results**?

This is an **exploration exercise** for #233, not a product feature ship of MDCP core.

## Package split (agreed direction)

| Piece                                     | Concern                                      | Notes                                                                                                         |
| ----------------------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| **Standalone token/usage ledger package** | Accurate measurement so a person can measure | Separate from MDCP; usable alongside MDCP. Single concern: accounting, not statusline UX.                     |
| **Experiment harness + fixtures**         | Scientific comparison with/without MDCP      | Consumes the ledger. Companion spirit to writing-skills / live skill evals.                                   |
| Dave Seddon `claude-statusline-rs`        | Claude Code host display                     | Optional later **host adapter**; not the core ledger. Cursor needs abstraction beyond Claude statusline JSON. |

## Research notes (checked 2026-07-31)

### Efficient Agents (arXiv:2508.02694)

- Useful for **methods**: cost-of-pass, scaffold-as-treatment, efficiency vs effectiveness.
- **No independent verification study found** that re-ran and confirmed headline numbers (28.4% cost-of-pass improvement / 96.7% of OWL).
- First-party code: [OPPO-PersonalAI/OAgents `Efficient_Agents`](https://github.com/OPPO-PersonalAI/OAgents/tree/main/Efficient_Agents). Community GAIA reproduce attempts hit missing settings / runtime issues.
- **Do not** cite their $ figures as MDCP evidence; may adopt metric _shape_.

### Cost-of-Pass metric (Erol et al., arXiv:2504.13359)

- Stronger formalization pedigree (ICLR 2026 OpenReview presence); code + HF records exist.
- Defines expected $ per correct solution — aligns with “same results, then cost.”

### Other method sources

- [AI Agents That Matter](https://arxiv.org/abs/2407.01502) — joint accuracy+cost; reproducibility; holdout.
- [SWE-Effi](https://arxiv.org/abs/2509.09853) — resolve vs token/cost budget curves.
- HAL / MLflow agent protocols — multi-seed, scaffold docs, cost as first-class.

## Decisions locked so far

1. **Phased approach** — one step at a time; do not boil the ocean in one PR.
2. **Phase 1a product surface** — separate token/usage package for accurate, non-mixed accounting.
3. **Never mix ledgers** — one run cell = one `{provider, model, usage/tokenizer definition, price sheet}`. Cross-provider comparison only via clearly labeled $ or within-cell ratios.
4. **Point-in-time science** — models, $/token, and even token definitions change. A published cell is true for its frozen identity + wall-clock window. Later replications may shift absolutes; **trends** are what travelers re-check.
5. **Concurrent reproducibility bar** — separate accounts, same harness/fixtures, overlapping time → statistically compatible results under the same accounting definition.
6. **Black-box providers** — no claim of visibility into caching, packing, or routing optimizations.
7. **Agent blindness** — task materials must not disclose that the run is a benchmark / MDCP vs control / token study.
8. **Analyst blinding** — code arms (`A`/`B`/`C`) until outcome+cost tables are locked; then decode.
9. **Caching / order confounders** — multiple distinct problems; **counterbalance** which problem runs first; document cache-isolation tactics.
10. **Significant sample** before claims; not a single heroic run.
11. **Stage 0 = C (agreed):**
    - **0a** — synthetic micro-suite (tiny tasks) × problems × arms × order swap → validate harness/receipts.
    - **0b** — one small real historical PR replay → validate realism before scale-up.
12. **Experimental arms (draft):**
    - Skill + MDCP docs (treatment)
    - No skill + docs present
    - No skill + no docs (status quo baseline)
    - Optional later: monolith dump without skill

## Open questions (resume here)

Ask one at a time when resuming brainstorming:

1. **Outcome gate (unanswered)** — before scoring cost:
   - A) Automated only
   - B) Rubric only
   - C) Dual gate (automation + rubric) — prior lean
   - D) Human accept/reject ± automation
2. **Ledger source of truth for phase 1a (unanswered)** — tokenizer offline (A), host-reported + fallback (B), estimate (C), or API usage/trace (D). Prior lean: tokenizer primary with strict `definition` field; host adapters optional.
3. **Price capture (unanswered)** — manual pinned JSON / shipped semver’d sheet / fetch-at-run / tokens-only then join $. Prior lean: shipped sheet rows hashed into run artifacts.
4. **Preserved audit runner (unanswered)** — in-repo artifacts only / dedicated VM / skill-eval path / hybrid sealed campaign. Prior lean: hybrid (D).
5. **Approaches comparison** — not yet presented formally (2–3 architecture options for package + harness).
6. **Full design sections** — architecture, data flow, error handling, testing — not yet approved.
7. **writing-plans** — blocked until design approved and written spec reviewed.

## Resume checklist

When continuing:

1. Load this shard + [#233](https://github.com/betsalel-williamson/mdcp/issues/233).
2. Resume **brainstorming** (not implementation): answer open question 1 (outcome gate), then remaining opens.
3. Propose 2–3 approaches → present design sections → get approval.
4. Write approved design (note: `docs/superpowers/` is **gitignored** in this repo; durable design must live in MDCP shards such as this developer path or a protocol measurement shard).
5. Then invoke **writing-plans** for phased implementation (ledger package first).

## Out of scope for the pause commit

- No new npm package yet
- No harness implementation
- No Tier B README token claims
- No merge to `main` intended until design completes
