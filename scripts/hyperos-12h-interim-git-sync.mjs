/**
 * Hourly git sync for HyperOS 12h run interim reports.
 * Usage: node scripts/hyperos-12h-interim-git-sync.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

const ROOT = process.cwd();
const INTERIM = path.join(ROOT, 'docs/review/HYPEROS_V15_12H_RUN_INTERIM_REPORT.md');
const EVIDENCE = path.join(ROOT, 'docs/review/hyperos-screen-off-survival/hyperos-v15-12h-evidence.json');
const FINAL = path.join(ROOT, 'docs/review/HYPEROS_V15_12H_RUN_REPORT.md');

function sh(cmd) {
  return execSync(cmd, { cwd: ROOT, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
}

function lastCommitAgeMs() {
  try {
    const t = sh('git log -1 --format=%ct').trim();
    return Date.now() - Number(t) * 1000;
  } catch {
    return Infinity;
  }
}

async function maybeCommit(label) {
  const status = sh('git status --porcelain docs/review/HYPEROS_V15_12H docs/review/hyperos-screen-off-survival/hyperos-v15-12h-evidence.json docs/review/hyperos-screen-off-survival/logcat-summary-12h docs/review/hyperos-screen-off-survival/dumpsys-evidence docs/review/hyperos-screen-off-survival/logcat-live docs/review/hyperos-screen-off-survival/hyperos-v15-12h-evidence.json 2>nul || git status --porcelain');
  if (!status.trim()) return;
  sh('git add docs/review/HYPEROS_V15_12H*.md docs/review/hyperos-screen-off-survival/hyperos-v15-12h-evidence.json docs/review/hyperos-screen-off-survival/logcat-summary-12h*.txt docs/review/hyperos-screen-off-survival/dumpsys-evidence docs/review/hyperos-screen-off-survival/logcat-live*.log 2>nul; git add docs/review/HYPEROS_V15_12H_RUN_INTERIM_REPORT.md docs/review/HYPEROS_V15_12H_RUN_INTERIM_*_REPORT.md docs/review/hyperos-screen-off-survival/hyperos-v15-12h-evidence.json');
  try {
    sh(`git commit -m "docs: HyperOS 12h interim sync (${label})."`);
    sh('git push origin HEAD');
    console.log('GIT_SYNC', label, sh('git rev-parse --short HEAD').trim());
  } catch (e) {
    console.warn('GIT_SYNC skip', label, e.message?.slice(0, 120));
  }
}

console.log('hyperos-12h-interim-git-sync watching...');
let lastMtime = 0;
while (!fs.existsSync(FINAL)) {
  await sleep(10 * 60 * 1000);
  if (fs.existsSync(FINAL)) break;
  const mtime = Math.max(
    fs.existsSync(INTERIM) ? fs.statSync(INTERIM).mtimeMs : 0,
    fs.existsSync(EVIDENCE) ? fs.statSync(EVIDENCE).mtimeMs : 0,
  );
  if (mtime > lastMtime && lastCommitAgeMs() > 50 * 60 * 1000) {
    lastMtime = mtime;
    const label = fs.existsSync(INTERIM)
      ? INTERIM.match(/Interim Report — (\w+)/)?.[1] ?? 'update'
      : 'evidence';
    await maybeCommit(label);
  }
}
await maybeCommit('final');
console.log('hyperos-12h-interim-git-sync done');
