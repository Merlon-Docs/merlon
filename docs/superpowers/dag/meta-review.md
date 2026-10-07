# Issue DAG meta-review

Machine-readable orchestration for all **25 open GitHub issues** as of 2026-08-02.

## Artifacts

| Artifact | Purpose |
| --- | --- |
| [`issues-dag.json`](./issues-dag.json) | Source of truth: nodes, waves, `depends_on`, gates, plan paths |
| [`issues-dag.schema.json`](./issues-dag.schema.json) | JSON Schema for DAG shape |
| [`../plans/`](../plans/) | One implementation plan per issue (25 files) |
| [`../../../scripts/verify-issue-dag.mjs`](../../../scripts/verify-issue-dag.mjs) | Scriptable verifier |
| [`../../../scripts/generate-issue-plans.mjs`](../../../scripts/generate-issue-plans.mjs) | Regenerate plan stubs from DAG |

## Scriptable verification

```bash
# Full structural check (acyclic, plan files exist, wave ordering)
pnpm run dag:verify

# List topological order (respects depends_on)
node scripts/verify-issue-dag.mjs --order

# List issues per wave
node scripts/verify-issue-dag.mjs --waves

# Simulate parallel execution batches (deps only)
node scripts/verify-issue-dag.mjs --simulate

# Orchestrator order (wave-aware — preferred for dispatch)
node scripts/verify-issue-dag.mjs --simulate-waves

# Cross-check DAG against open GitHub issues (requires gh)
node scripts/verify-issue-dag.mjs --check-gh

# Issues ready to start (no deps blocking; none marked done)
node scripts/verify-issue-dag.mjs --ready
```

CI can gate on `pnpm run dag:verify` and `node --test scripts/verify-issue-dag.test.mjs`.

## DAG invariants (reviewed)

1. **Acyclic** — `depends_on` edges form a DAG; Kahn sort succeeds.
2. **Wave monotonicity** — For `implement` / `inflight` nodes, every dependency's wave index is ≤ the dependent's wave index (no `#48` in wave-4 depending on wave-2 child incorrectly inverted).
3. **Plan coverage** — Every node has an on-disk `plan_file`; generator can refresh stubs from DAG.
4. **Mode discipline** — `gate-monitor` nodes carry a `gate` object; `inflight` nodes reference an open PR; `rollup` epics list `closes_when` or `never_close`.
5. **GitHub sync** — `--check-gh` ensures DAG nodes match `gh issue list --state open` (25 ↔ 25).

## Execution order (simulated batches)

Run `node scripts/verify-issue-dag.mjs --simulate` for the current batch list. Expected shape:

| Batch | Nodes | Notes |
| --- | --- | --- |
| 1 | #153, #201 | wave-0 inflight — merge PRs #154, #229 first |
| 2 | #46, #232, #233 | wave-1 parallel |
| 3–5 | #45, #48 → #47 → #49 | wave-2 protocol spine |
| 6–7 | #76, #78 → #81 | wave-3 extensions |
| 8 | #52, #59, #157, #160 | wave-4 product surfaces |
| 9 | defer nodes | gate-monitor only |
| 10 | #44, #74, #173 | epic rollup tracking |

Run `node scripts/verify-issue-dag.mjs --simulate-waves` for the authoritative batch list.

**Safe parallel (separate worktrees):** `#232` + `#233`; `#76` + `#78`; `#157` + `#160`

## Node modes

| Mode | Count | Implementation |
| --- | --- | --- |
| `implement` | 14 | Full plans; sequential PRs per atomic commit group |
| `inflight` | 2 | #153 (PR #154), #201 (PR #229) — merge existing PRs first |
| `gate-monitor` | 6 | Plan-only until `gate: open` on issue |
| `rollup` | 3 | #44, #74, #173 — close when children done (#173 never closes) |

## Orchestrator playbook (no implementation in plan PR)

1. `pnpm run dag:verify --check-gh` (after gh auth)
2. `node scripts/verify-issue-dag.mjs --ready` → dispatch only ready nodes
3. Per node: worktree `.worktrees/issue-N`, branch `cursor/plan-issue-N-*` already done; impl uses `cursor/issue-N-*-5150`
4. Record state in `.superpowers/orchestration/ledger.md` (gitignored)
5. **Do not** run implementation tasks from this PR — plans are specifications only

## Review findings

| Check | Result |
| --- | --- |
| Cycle-free | Pass |
| 25 plans on disk | Pass |
| Wave inversion | Pass |
| Protocol spine ordering | Pass (#46 < #48 < #47 < #49) |
| Defer nodes gated | Pass (6 gate-monitor) |
| Inflight PRs referenced | Pass (#154, #229) |
| Epic #173 never_close | Pass |

## Drift prevention

When issues open/close or dependencies change:

1. Edit `issues-dag.json`
2. Run `node scripts/generate-issue-plans.mjs` (updates plan stubs)
3. Hand-edit plans if acceptance criteria changed materially
4. `pnpm run dag:verify && node --test scripts/verify-issue-dag.test.mjs`
