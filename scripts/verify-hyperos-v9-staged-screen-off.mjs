/**
 * HyperOS v10 staged screen-off verification: 30m → 1h → 3h.
 *
 * Usage:
 *   node scripts/verify-hyperos-v9-staged-screen-off.mjs
 *   VERIFY_HYPEROS_STAGE=30m node scripts/verify-hyperos-v9-staged-screen-off.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, 'docs/review/hyperos-screen-off-survival');
const STAGES = [
  { key: '30m', hours: 0.5, label: '30分' },
  { key: '1h', hours: 1, label: '1時間' },
  { key: '3h', hours: 3, label: '3時間' },
];

function ts() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

function runStage(stage) {
  console.log(`\n=== STAGE ${stage.key} (${stage.label}) ===`);
  const audit = spawnSync('node', ['scripts/audit-hyperos-power-restrictions.mjs'], {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: 'pipe',
    env: process.env,
  });
  console.log(audit.stdout || audit.stderr);

  const r = spawnSync('node', ['scripts/verify-hyperos-v9-3h-screen-off.mjs'], {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: 'inherit',
    env: {
      ...process.env,
      PHASE12_5_HOURS: String(stage.hours),
      VERIFY_HYPEROS_HOURS: String(stage.hours),
      VERIFY_HYPEROS_STAGE: stage.key,
      VERIFY_HYPEROS_DEVICE_READY: '1',
    },
  });
  return r.status ?? 1;
}

function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const only = process.env.VERIFY_HYPEROS_STAGE;
  const chain = only ? STAGES.filter((s) => s.key === only) : STAGES;
  const results = [];

  for (const stage of chain) {
    const code = runStage(stage);
    results.push({ stage: stage.key, exitCode: code, ok: code === 0 });
    if (code !== 0) {
      console.error(`Stage ${stage.key} FAILED — stopping chain`);
      break;
    }
  }

  const runId = ts();
  const summaryPath = path.join(OUT_DIR, `hyperos-v10-staged-summary-${runId}.json`);
  fs.writeFileSync(summaryPath, JSON.stringify({ runId, results }, null, 2));
  console.log(JSON.stringify({ summaryPath, results }));
  process.exitCode = results.every((r) => r.ok) ? 0 : 1;
}

main();
