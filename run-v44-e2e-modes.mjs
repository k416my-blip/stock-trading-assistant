#!/usr/bin/env node
/**
 * Separated UX mode + Trust checks (Standard / Pro / Beginner / Trust).
 * Run after core create→list passes: node run-v44-e2e-modes.mjs
 */
process.env.PYTHONIOENCODING = 'utf-8';
process.env.E2E_RUN_TAG = 'rerun4-modes';

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { OUT, buildMeta, writeUtf8File, ensureMetroLink, adb, PKG } from './_deviceVerifyE2eCommon.mjs';

const STEPS = ['run-v44-e2e-d-ux-modes.mjs', 'run-v44-e2e-e-trust.mjs'];
const MERGED = path.join(OUT, 'results-rerun4-modes-merged.json');

function runStep(script) {
  console.log('\n==========', script, '==========\n');
  execSync(`node ${script}`, {
    stdio: 'inherit',
    encoding: 'utf8',
    env: { ...process.env, E2E_RUN_TAG: 'rerun4-modes', PYTHONIOENCODING: 'utf-8' },
  });
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const metroOk = await ensureMetroLink();
  if (!metroOk) {
    console.error('FATAL: Start Metro first');
    process.exit(2);
  }
  adb(`am force-stop ${PKG}`);
  await new Promise((r) => setTimeout(r, 2000));

  for (const s of STEPS) runStep(s);

  const all = [];
  let meta = buildMeta();
  for (const step of ['d', 'e']) {
    const p = path.join(OUT, `results-rerun4-modes-${step}.json`);
    if (!fs.existsSync(p)) continue;
    const data = JSON.parse(fs.readFileSync(p, 'utf8'));
    if (data.meta) meta = { ...meta, ...data.meta };
    all.push(...(data.results || []));
  }
  writeUtf8File(MERGED, `${JSON.stringify({ meta, results: all }, null, 2)}\n`);
  console.log('Modes run complete. Merged:', MERGED);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
