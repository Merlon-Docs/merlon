#!/usr/bin/env node
/**
 * Run every Alloy model under formal/alloy/ and compare each command's result
 * with the `expect` it declares: `expect 0` means no instance (a check holds,
 * or a run is impossible) and `expect 1` means an instance exists (a check finds
 * its counterexample, or a run is reachable). Every command must declare one.
 *
 * Java 17 or later must be on PATH. The pinned Alloy jar is downloaded from
 * Maven Central into .caches/alloy/ on first use and verified by SHA-256.
 */
import { Buffer } from 'node:buffer';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { evaluateModel, parseCommandList } from './lib/alloy-receipt.mjs';

const ALLOY_VERSION = '6.2.0';
const ALLOY_SHA256 = '6037cbeee0e8423c1c468447ed10f5fcf2f2743a2ffc39cb1c81f2905c0fdb9d';
const ALLOY_URL = `https://repo1.maven.org/maven2/org/alloytools/org.alloytools.alloy.dist/${ALLOY_VERSION}/org.alloytools.alloy.dist-${ALLOY_VERSION}.jar`;
// Glucose ships in the jar for Linux, macOS and Windows and is many times faster than the default SAT4J here.
const SOLVER = 'glucose';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const modelsDir = join(root, 'formal', 'alloy');
const jar = join(root, '.caches', 'alloy', `alloy-${ALLOY_VERSION}.jar`);

function sha256(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

async function ensureJar() {
  if (existsSync(jar) && sha256(jar) === ALLOY_SHA256) return;
  mkdirSync(dirname(jar), { recursive: true });
  console.log(`formal-check: downloading Alloy ${ALLOY_VERSION}`);
  const res = await globalThis.fetch(ALLOY_URL);
  if (!res.ok) throw new Error(`Alloy download failed: ${res.status} ${ALLOY_URL}`);
  const bytes = Buffer.from(await res.arrayBuffer());
  const got = createHash('sha256').update(bytes).digest('hex');
  if (got !== ALLOY_SHA256) {
    throw new Error(`Alloy jar checksum mismatch: expected ${ALLOY_SHA256}, got ${got}`);
  }
  writeFileSync(jar, bytes);
}

const out = mkdtempSync(join(tmpdir(), 'mdcp-alloy-'));

/** Run the Alloy CLI with its scratch files kept inside `out`. */
function alloy(args) {
  return spawnSync('java', [`-Djava.io.tmpdir=${out}`, '-jar', jar, ...args], {
    encoding: 'utf-8',
  });
}

const models = existsSync(modelsDir)
  ? readdirSync(modelsDir)
      .filter((f) => f.endsWith('.als'))
      .sort()
  : [];

let failures = 0;
try {
  if (models.length === 0) throw new Error(`no .als models in ${modelsDir}`);
  if (spawnSync('java', ['-version'], { stdio: 'ignore' }).status !== 0) {
    throw new Error('Java 17 or later must be on PATH.');
  }
  await ensureJar();

  for (const model of models) {
    const source = join(modelsDir, model);
    const listed = alloy(['commands', source]);
    const commands = parseCommandList(listed.stdout ?? '');
    const dest = join(out, basename(model, '.als'));
    // Alloy exits non-zero when a command misses its expect; the receipt says which.
    const run = alloy([
      'exec',
      '-q',
      '-f',
      '-s',
      SOLVER,
      '-c',
      '*',
      '-t',
      'text',
      '-o',
      dest,
      source,
    ]);
    const receiptPath = join(dest, 'receipt.json');
    if (listed.status !== 0 || !existsSync(receiptPath)) {
      failures++;
      console.error(`  FAIL  ${model}: Alloy could not run the model (exit ${run.status})`);
      console.error(run.stderr || run.stdout || listed.stderr);
      continue;
    }
    const receipt = JSON.parse(readFileSync(receiptPath, 'utf-8'));
    const before = failures;
    for (const r of evaluateModel(commands, receipt)) {
      if (r.ok) {
        console.log(`  ok    ${model} ${r.name}: ${r.found ? 'instance' : 'no instance'}`);
      } else {
        failures++;
        console.error(`  FAIL  ${model} ${r.name}: ${r.problem}`);
      }
    }
    if (run.status !== 0) {
      if (failures === before) failures++;
      console.error(`  Alloy exited ${run.status} on ${model}:`);
      console.error(run.stderr || run.stdout);
    }
  }
} catch (err) {
  failures++;
  console.error(`formal-check: ${err.message}`);
} finally {
  rmSync(out, { recursive: true, force: true });
}

if (failures > 0) {
  console.error(`formal-check: ${failures} failure(s).`);
  process.exit(1);
}
console.log(`formal-check: ok (${models.length} model(s))`);
