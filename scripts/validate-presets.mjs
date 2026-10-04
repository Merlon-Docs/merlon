#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const presetsDir = join(__dirname, '../packages/mdcp-presets');

const files = [
  'markdownlint-shards.markdownlint-cli2.jsonc',
  'markdownlint-compiled.markdownlint-cli2.jsonc',
];

const valeFiles = [
  'vale/MDCP/meta.json',
  'vale/MDCP/BareChapterRef.yml',
  'vale/MDCP/UnlinkedSeeChapter.yml',
  'vale/MDCP/BareSectionRef.yml',
  'vale/MDCP/UnlinkedSeeSection.yml',
  'vale/MDCP/DatedClaim.yml',
  'vale/mdcp.vale.ini',
  'vale/package/.vale.ini',
  'vale/package/styles/MDCP/meta.json',
  'vale/package/styles/MDCP/BareChapterRef.yml',
  'vale/package/styles/MDCP/UnlinkedSeeChapter.yml',
  'vale/package/styles/MDCP/BareSectionRef.yml',
  'vale/package/styles/MDCP/UnlinkedSeeSection.yml',
  'vale/package/styles/MDCP/DatedClaim.yml',
];

function stripJsoncComments(text) {
  return text
    .replace(/\/\/.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/,\s*([}\]])/g, '$1');
}

for (const file of files) {
  const path = join(presetsDir, file);
  try {
    JSON.parse(stripJsoncComments(readFileSync(path, 'utf-8')));
    console.log(`OK ${file}`);
  } catch (err) {
    console.error(`Invalid JSONC in ${file}: ${err.message}`);
    process.exit(1);
  }
}

for (const file of valeFiles) {
  const path = join(presetsDir, file);
  try {
    readFileSync(path, 'utf-8');
    console.log(`OK ${file}`);
  } catch (err) {
    console.error(`Missing Vale preset ${file}: ${err.message}`);
    process.exit(1);
  }
}

for (const file of valeFiles.filter((file) => file.startsWith('vale/MDCP/'))) {
  const packagedFile = file.replace('vale/MDCP/', 'vale/package/styles/MDCP/');
  const source = readFileSync(join(presetsDir, file), 'utf-8');
  const packaged = readFileSync(join(presetsDir, packagedFile), 'utf-8');
  if (source !== packaged) {
    console.error(`Vale package copy differs from source: ${packagedFile}`);
    process.exit(1);
  }
}
