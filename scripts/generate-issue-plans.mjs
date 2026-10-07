#!/usr/bin/env node
/**
 * Generate implementation plan markdown files from issues-dag.json.
 * Idempotent — run after DAG edits to refresh plan stubs.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..');
const DAG = JSON.parse(
  readFileSync(join(REPO_ROOT, 'docs/superpowers/dag/issues-dag.json'), 'utf8'),
);

const FOOTER = `
---

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (\`- [ ]\`) syntax for tracking.

**WORK_ITEM:** GitHub issue linked in title. **WORK_ITEM_LOOKUP:** \`docs/developer/agent-work-item-tracking.md\`

**Do not implement from this PR until the plan is reviewed and the orchestrator dispatches a worktree for this issue.**
`;

function groupsFor(node) {
  const n = node.issue;
  if (node.mode === 'gate-monitor') {
    return `## Atomic commit groups

| Id | Concern | Files | Commit subject |
| --- | --- | --- | --- |
| gate-doc | Gate criteria and unblock checklist only | \`${node.plan_file}\` | \`docs(plan): gate monitor for #${n}\` |

**No implementation PRs until a maintainer comments \`gate: open\` on the issue.**`;
  }
  if (node.mode === 'rollup') {
    return `## Atomic commit groups

| Id | Concern | Files | Commit subject |
| --- | --- | --- | --- |
| rollup-plan | Epic rollup plan (this file) | \`${node.plan_file}\` | \`docs(plan): rollup plan for #${n}\` |

Close epic when children satisfy acceptance: ${(node.closes_when ?? []).map((i) => `#${i}`).join(', ') || 'see issue body'}.`;
  }
  if (node.mode === 'inflight') {
    return `## Atomic commit groups

Implementation tracked in PR #${node.inflight_pr}. This plan documents scope for post-merge verification.

| Id | Concern | Files | Commit subject |
| --- | --- | --- | --- |
| plan-only | Plan alignment with in-flight PR | \`${node.plan_file}\` | \`docs(plan): align plan with #${n} PR #${node.inflight_pr}\` |`;
  }

  // implement mode — issue-specific batches
  const batches = BATCHES[n] ?? DEFAULT_BATCHES(node);
  const rows = batches
    .map((b) => `| ${b.id} | ${b.concern} | ${b.files} | \`${b.subject}\` |`)
    .join('\n');
  return `## Atomic commit groups

| Id | Concern | Files | Commit subject |
| --- | --- | --- | --- |
${rows}`;
}

const DEFAULT_BATCHES = (node) => [
  {
    id: 'design',
    concern: 'Design shard or spec section',
    files: '`docs/features/` shards per helper',
    subject: `docs: design for #${node.issue}`,
  },
  {
    id: 'impl',
    concern: 'Implementation and tests',
    files: 'per issue acceptance criteria',
    subject: `feat: deliver #${node.issue}`,
  },
];

const BATCHES = {
  232: [
    {
      id: 'adr-shard',
      concern: 'Normative ADR on ontology vs prose inheritance',
      files: '`docs/features/protocol/` or `docs/features/adr/`',
      subject: 'docs(protocol): ontology condensation position for #232',
    },
    {
      id: 'cross-links',
      concern: 'Glossary + cross-links to mitosis and extensions',
      files: '`docs/glossary/`',
      subject: 'docs: glossary links for ontology density #232',
    },
  ],
  233: [
    {
      id: 'method',
      concern: 'Measurement method shard + bench script',
      files: '`docs/features/protocol/`',
      subject: 'docs: token measurement method for #233',
    },
    {
      id: 'results',
      concern: 'Regenerable results + benefit-claims tier wording',
      files: '`scripts/bench-context-size.mjs`',
      subject: 'chore: refresh context-size bench results #233',
    },
  ],
  48: [
    {
      id: 'spec-sections',
      concern: 'Complete normative spec sections',
      files: '`docs/features/protocol/mdcp-1.0-spec.md`',
      subject: 'docs(protocol): expand MDCP 1.0 spec #48',
    },
    {
      id: 'spec-map',
      concern: 'Feature catalog → spec clause map',
      files: '`docs/features/feature-catalog.md`',
      subject: 'docs: map feature catalog to spec #48',
    },
  ],
  47: [
    {
      id: 'schemas',
      concern: 'JSON Schema artifacts',
      files: '`spec/schemas/`',
      subject: 'feat: artifact JSON schemas #47',
    },
    {
      id: 'schema-tests',
      concern: 'Fixture validation in CI',
      files: '`packages/mdcp-core/test/`',
      subject: 'test: schema fixture validation #47',
    },
  ],
  49: [
    {
      id: 'vectors',
      concern: 'Conformance vectors and golden files',
      files: '`spec/conformance/`',
      subject: 'feat: conformance vectors #49',
    },
    {
      id: 'runner',
      concern: 'Runner subcommand + CI job',
      files: '`packages/mdcp-cli/`',
      subject: 'feat: conformance runner #49',
    },
  ],
  160: [
    {
      id: 'phase-0-1',
      concern: 'Mini-project docs tree',
      files: '`docs/review-bench/`',
      subject: 'docs: review-bench docs tree #160',
    },
    {
      id: 'phase-2',
      concern: 'Harness scaffold + makefile',
      files: '`scripts/review-bench.mk`',
      subject: 'feat: review-bench harness scaffold #160',
    },
    {
      id: 'phase-3-5',
      concern: 'Packs, proxy scoring, pilot protocol',
      files: '`tests/review-bench/`',
      subject: 'feat: review-bench MVP packs #160',
    },
  ],
  153: [
    {
      id: 'docs-design',
      concern: 'Spec and plan shards',
      files: '`docs/developer/`',
      subject: 'docs: skills audit sync spec #153',
    },
    {
      id: 'proxy',
      concern: 'Vercel OIDC proxy',
      files: 'external `mdcp-skills-audit-proxy`',
      subject: 'feat: skills audit proxy #153',
    },
    {
      id: 'gha',
      concern: 'GitHub Actions sync workflow',
      files: '`.github/workflows/`',
      subject: 'ci: skills audit sync workflow #153',
    },
  ],
  201: [
    {
      id: 'inventory',
      concern: 'Regex inventory with risk notes',
      files: '`packages/mdcp-core/`',
      subject: 'docs: regex inventory Phase B #201',
    },
    {
      id: 'fixes',
      concern: 'ReDoS fixes + regression tests',
      files: '`packages/mdcp-core/src/`',
      subject: 'fix: ReDoS hardening Phase B #201',
    },
  ],
};

function tasksFor(node) {
  if (node.mode === 'gate-monitor') {
    return `### Task 1: Document gate (plan-only)

- [ ] Record gate criteria from issue body in this plan
- [ ] List \`blocked_until\` issues: ${JSON.stringify(node.gate?.blocked_until ?? node.gate?.unpark_when_any ?? 'see gate')}
- [ ] Add unblock checklist to issue comment when gate fires
- [ ] **Stop** — no code changes until \`gate: open\``;
  }
  if (node.mode === 'rollup') {
    return `### Task 1: Track child completion

- [ ] Verify each child issue acceptance criteria
- [ ] Update epic checklist on GitHub
- [ ] ${node.never_close ? 'Keep epic open per issue body' : 'Close epic when all children done'}`;
  }
  return `### Task 1: Load scope

- [ ] \`gh issue view ${node.issue}\`
- [ ] Confirm acceptance criteria unchanged
- [ ] Invoke \`/${node.mdcp_helper}\` with WORK_ITEM=${node.issue}

### Task 2: Execute atomic commit groups (sequential PRs)

- [ ] One PR per commit group in table above
- [ ] \`pnpm run check\` before each push
- [ ] Final PR body: \`Closes #${node.issue}\``;
}

function renderPlan(node) {
  const deps =
    (node.depends_on ?? []).length > 0
      ? (node.depends_on ?? []).map((d) => `#${d}`).join(', ')
      : 'none';
  const title = node.title ?? node.slug;

  return `# Issue #${node.issue}: ${title} — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Deliver GitHub [#${node.issue}](https://github.com/betsalel-williamson/mdcp/issues/${node.issue}) per acceptance criteria.

**Architecture:** ${ARCH[node.issue] ?? `Execute via MDCP helper \`${node.mdcp_helper}\` in an isolated worktree; one concern per PR.`}

**Tech Stack:** TypeScript (mdcp-core, mdcp-cli), MDCP shards, pnpm, Vitest, optional Vale.

## Global Constraints

- One \`WORK_ITEM\` per branch; conventional commits; atomic commit groups
- \`pnpm run check\` before merge claims
- Shards are source of truth; run \`pnpm docs:compile:repo\` after doc edits
- No Tier C unmeasured claims on README ([benefit-claims-and-evidence](docs/features/protocol/benefit-claims-and-evidence.md))

## DAG metadata

| Field | Value |
| --- | --- |
| Wave | \`${node.wave}\` |
| Mode | \`${node.mode}\` |
| Priority | \`${node.priority ?? 'see labels'}\` |
| Depends on | ${deps} |
| MDCP helper | \`/${node.mdcp_helper}\` |
| Plan file | \`${node.plan_file}\` |

${groupsFor(node)}

---

${tasksFor(node)}
${FOOTER}`;
}

const ARCH = {
  232: 'Publish normative position: documentation context vs OOP domain modeling; map reuse to MDCP primitives (mitosis, glossary, composition).',
  233: 'Extend measurement beyond char-based dogfood bench; document corpora, session definition, static-first verification bar.',
  48: 'Complete normative MDCP 1.0 spec reconciled against mdcp-core behavior.',
  47: 'JSON Schema for mdcp.config.json, refs.json; protocol version field in core.',
  49: 'Shared conformance vectors any implementation can run; CI gate on compile/refs changes.',
  52: 'Read-only diff of edited monolith vs fresh compile; JSON mode for agents; shard attribution.',
  59: '@bwilliamson/mdcp-mcp stdio server mapping CLI tools to MCP tools.',
  157: 'Brownfield doc-sync helper skill with live-eval proving gap detection.',
  160: 'Optional in-repo HIL review falsification harness; makefile-only operator entry.',
  46: 'Polish ADR shards if acceptance gaps remain vs #46 checklist.',
  45: 'Polish usage-model shard for adoption paths and coexistence sections.',
  78: 'Extension catalog naming and manifest conventions for arch-*/format-* packs.',
  76: 'Compatibility matrix shard for C4, ArchiMate, UML-as-GFM, ADR patterns.',
  81: 'Versioned format-c4/0.5.0.0 pack with viewpoint templates.',
};

let written = 0;
for (const node of DAG.nodes) {
  const path = join(REPO_ROOT, node.plan_file);
  const content = renderPlan(node);
  writeFileSync(path, content, 'utf8');
  written++;
  console.log(`wrote ${node.plan_file}`);
}
console.log(`Generated ${written} plan files.`);
