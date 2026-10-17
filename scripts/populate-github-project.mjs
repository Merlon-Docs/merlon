#!/usr/bin/env node
/**
 * One-shot: add Merlon Docs repo issues to org GitHub project #1 and set Status.
 * Applies track:* labels from issue metadata when missing (org board has no Track column).
 * Usage: node scripts/populate-github-project.mjs [--dry-run] [--open-only]
 */
import { execSync } from 'node:child_process';

const DRY_RUN = process.argv.includes('--dry-run');
const OPEN_ONLY = process.argv.includes('--open-only');

const ORG = 'Merlon-Docs';
const PROJECT_NUMBER = 1;

const STATUS = {
  todo: 'f75ad846',
  inProgress: '47fc9ee4',
  done: '98236657',
};

const TRACK_LABEL = {
  '1.0': 'track:1.0-formalization',
  maintenance: 'track:maintenance',
  performance: 'track:performance',
  future: 'track:future',
};

function gh(args) {
  return execSync(`gh ${args}`, { encoding: 'utf8' }).trim();
}

function graphql(query, variables = {}) {
  const vars = Object.entries(variables)
    .map(([k, v]) => `-f ${k}=${typeof v === 'string' ? `'${v.replace(/'/g, "'\\''")}'` : v}`)
    .join(' ');
  const q = query.replace(/\s+/g, ' ').trim();
  return JSON.parse(gh(`api graphql -f query='${q.replace(/'/g, "'\\''")}' ${vars}`));
}

function loadProjectIds() {
  const data = graphql(`
    query {
      organization(login: "${ORG}") {
        projectV2(number: ${PROJECT_NUMBER}) {
          id
          fields(first: 30) {
            nodes {
              ... on ProjectV2SingleSelectField {
                id
                name
                options { id name }
              }
            }
          }
        }
      }
    }
  `);
  const project = data.data.organization.projectV2;
  const statusField = project.fields.nodes.find((f) => f.name === 'Status');
  if (!statusField) throw new Error('Status field not found on org project #1');
  const statusByName = Object.fromEntries(statusField.options.map((o) => [o.name, o.id]));
  return {
    projectId: project.id,
    statusFieldId: statusField.id,
    statusTodo: statusByName.Todo ?? STATUS.todo,
    statusDone: statusByName.Done ?? STATUS.done,
  };
}

function trackKeyForIssue(issue) {
  const labels = issue.labels.map((l) => l.name);
  const n = issue.number;
  const title = issue.title.toLowerCase();

  if (labels.some((l) => l.startsWith('track:'))) return null;

  if (labels.includes('0.5') || (n >= 74 && n <= 88)) return '1.0';
  if (n === 59 || n === 60 || title.startsWith('v2:') || title.startsWith('v3:')) return 'future';
  if (n === 66 || n === 67 || n === 64 || title.includes('performance')) return 'performance';
  if (n === 169 || title.includes('typescript 7')) return 'performance';
  if (n === 69 || labels.includes('bug') || labels.includes('chore')) return 'maintenance';
  if (
    (n >= 44 && n <= 49) ||
    n === 52 ||
    n === 58 ||
    title.includes('1.0') ||
    title.includes('formalization') ||
    title.includes('normative specification') ||
    title.includes('conformance') ||
    labels.includes('standard')
  )
    return '1.0';
  if (labels.includes('compile') || labels.includes('cli') || labels.includes('refs'))
    return 'maintenance';
  return 'maintenance';
}

function fetchIssues() {
  const issues = [];
  let cursor = null;
  for (;;) {
    const after = cursor ? `, after: "${cursor}"` : '';
    const states = OPEN_ONLY ? '[OPEN]' : '[OPEN, CLOSED]';
    const data = graphql(
      `{ repository(owner: "Merlon-Docs", name: "merlon") { issues(first: 100, states: ${states}${after}) { pageInfo { hasNextPage endCursor } nodes { id number title state labels(first: 30) { nodes { name } } } } } }`,
    );
    const batch = data.data.repository.issues;
    for (const node of batch.nodes) {
      issues.push({
        id: node.id,
        number: node.number,
        title: node.title,
        state: node.state,
        labels: node.labels.nodes,
      });
    }
    if (!batch.pageInfo.hasNextPage) break;
    cursor = batch.pageInfo.endCursor;
  }
  return issues.sort((a, b) => b.number - a.number);
}

function addToProject(projectId, contentId) {
  const data = graphql(
    `
      mutation ($projectId: ID!, $contentId: ID!) {
        addProjectV2ItemById(input: { projectId: $projectId, contentId: $contentId }) {
          item {
            id
          }
        }
      }
    `,
    { projectId, contentId },
  );
  return data.data.addProjectV2ItemById.item.id;
}

function setStatus(projectId, itemId, statusFieldId, optionId) {
  graphql(
    `
      mutation ($projectId: ID!, $itemId: ID!, $fieldId: ID!, $optionId: String!) {
        updateProjectV2ItemFieldValue(
          input: {
            projectId: $projectId
            itemId: $itemId
            fieldId: $fieldId
            value: { singleSelectOptionId: $optionId }
          }
        ) {
          projectV2Item {
            id
          }
        }
      }
    `,
    { projectId, itemId, fieldId: statusFieldId, optionId },
  );
}

function ensureTrackLabel(issue, trackKey) {
  if (!trackKey || trackKey === null) return;
  const label = TRACK_LABEL[trackKey];
  if (!label) return;
  if (issue.labels.some((l) => l.name === label)) return;
  if (DRY_RUN) {
    console.log(`  would add label ${label}`);
    return;
  }
  try {
    gh(`issue edit ${issue.number} --repo Merlon-Docs/merlon --add-label "${label}"`);
  } catch (err) {
    console.warn(
      `#${issue.number}: could not add ${label} (${err.message?.split('\n')[0] ?? err})`,
    );
  }
}

const { projectId, statusFieldId, statusTodo, statusDone } = loadProjectIds();
const issues = fetchIssues();
console.log(`Found ${issues.length} issues (project ${projectId})`);

let added = 0;
let skipped = 0;
for (const issue of issues) {
  const statusOption = issue.state === 'CLOSED' ? statusDone : statusTodo;
  const trackKey = trackKeyForIssue(issue);

  if (DRY_RUN) {
    console.log(
      `#${issue.number} [${issue.state}] status=${issue.state === 'CLOSED' ? 'Done' : 'Todo'} track=${trackKey ?? '—'}`,
    );
    continue;
  }

  try {
    ensureTrackLabel(issue, trackKey);
    const itemId = addToProject(projectId, issue.id);
    setStatus(projectId, itemId, statusFieldId, statusOption);
    console.log(
      `#${issue.number} added (status=${issue.state === 'CLOSED' ? 'Done' : 'Todo'}, track=${trackKey ?? '—'})`,
    );
    added++;
  } catch (err) {
    if (String(err.stderr ?? err.message).includes('already exists')) {
      console.log(`#${issue.number} already in project, skipping add`);
      skipped++;
    } else {
      throw err;
    }
  }
}

if (!DRY_RUN) {
  console.log(`\nDone: ${added} added, ${skipped} skipped`);
}
