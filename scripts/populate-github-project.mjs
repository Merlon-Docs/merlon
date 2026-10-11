#!/usr/bin/env node
/**
 * One-shot: add all Merlon Docs repo issues to GitHub project #4 and set Status + Track.
 * Usage: node scripts/populate-github-project.mjs [--dry-run]
 */
import { execSync } from 'node:child_process';

const DRY_RUN = process.argv.includes('--dry-run');
const REPO = 'Merlon-Docs/merlon'; // eslint-disable-line @typescript-eslint/no-unused-vars
const PROJECT_ID = 'PVT_kwHOAJLCJ84BbroI';
const STATUS_FIELD = 'PVTSSF_lAHOAJLCJ84BbroIzhWaeqg';
const TRACK_FIELD = 'PVTSSF_lAHOAJLCJ84BbroIzhWafDI';

const STATUS = {
  todo: 'f75ad846',
  inProgress: '47fc9ee4',
  done: '98236657',
};

const TRACK = {
  0.5: 'b05efaec',
  '1.0': '54748d16',
  maintenance: '0294358c',
  performance: '4fc723b4',
  future: 'c68bc060',
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

function trackForIssue(issue) {
  const labels = issue.labels.map((l) => l.name);
  const n = issue.number;
  const title = issue.title.toLowerCase();

  if (labels.includes('0.5') || (n >= 74 && n <= 88)) return TRACK['0.5'];
  if (n === 59 || n === 60 || title.startsWith('v2:') || title.startsWith('v3:'))
    return TRACK.future;
  if (n === 66 || n === 67 || n === 64 || title.includes('performance')) return TRACK.performance;
  if (n === 69 || n === 70 || labels.includes('bug')) return TRACK.maintenance;
  if (
    (n >= 44 && n <= 49) ||
    n === 52 ||
    n === 58 ||
    title.includes('1.0') ||
    title.includes('formalization') ||
    title.includes('normative specification') ||
    title.includes('conformance')
  )
    return TRACK['1.0'];
  if (labels.includes('compile') || labels.includes('cli') || labels.includes('refs'))
    return TRACK.maintenance;
  return null;
}

function fetchIssues() {
  const issues = [];
  let cursor = null;
  for (;;) {
    const after = cursor ? `, after: "${cursor}"` : '';
    const data = graphql(
      `{ repository(owner: "Merlon-Docs", name: "merlon") { issues(first: 100, states: [OPEN, CLOSED]${after}) { pageInfo { hasNextPage endCursor } nodes { id number title state labels(first: 20) { nodes { name } } } } } }`,
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

function addToProject(contentId) {
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
    { projectId: PROJECT_ID, contentId },
  );
  return data.data.addProjectV2ItemById.item.id;
}

function setField(itemId, fieldId, optionId) {
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
    { projectId: PROJECT_ID, itemId, fieldId, optionId },
  );
}

const issues = fetchIssues();
console.log(`Found ${issues.length} issues`);

let added = 0;
let skipped = 0;
for (const issue of issues) {
  const status = issue.state === 'CLOSED' ? STATUS.done : STATUS.todo;
  const track = trackForIssue(issue);
  const trackName = Object.entries(TRACK).find(([, id]) => id === track)?.[0] ?? '—';

  if (DRY_RUN) {
    console.log(
      `#${issue.number} [${issue.state}] status=${issue.state === 'CLOSED' ? 'Done' : 'Todo'} track=${trackName}`,
    );
    continue;
  }

  try {
    const itemId = addToProject(issue.id);
    setField(itemId, STATUS_FIELD, status);
    if (track) setField(itemId, TRACK_FIELD, track);
    console.log(
      `#${issue.number} added (status=${issue.state === 'CLOSED' ? 'Done' : 'Todo'}, track=${trackName})`,
    );
    added++;
  } catch (err) {
    if (String(err.stderr ?? err.message).includes('already exists')) {
      console.log(`#${issue.number} already in project, skipping`);
      skipped++;
    } else {
      throw err;
    }
  }
}

if (!DRY_RUN) {
  console.log(`\nDone: ${added} added, ${skipped} skipped`);
}
