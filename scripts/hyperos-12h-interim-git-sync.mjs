/**
 * Hourly git sync for HyperOS 12h run interim reports (Windows-safe paths).
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

const ROOT = process.cwd();
const REVIEW = path.join(ROOT, 'docs/review');
const SURVIVAL = path.join(ROOT, 'docs/review/hyperos-screen-off-survival');
const INTERIM = path.join(REVIEW, 'HYPEROS_V15_12H_RUN_INTERIM_REPORT.md');
const FINAL = path.join(REVIEW, 'HYPEROS_V15_12H_RUN_REPORT.md');

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

function collect12hPaths() {
  const paths = [];
  for (const f of fs.readdirSync(REVIEW)) {
    if (f.startsWith('HYPEROS_V15_12H')) paths.push(path.join('docs/review', f));
  }
  if (fs.existsSync(path.join(SURVIVAL, 'hyperos-v15-12h-evidence.json'))) {
    paths.push('docs/review/hyperos-screen-off-survival/hyperos-v15-12h-evidence.json');
  }
  if (fs.existsSync(SURVIVAL)) {
    for (const f of fs.readdirSync(SURVIVAL)) {
      if (f.startsWith('logcat-summary-12h-') || f.startsWith('logcat-live-')) {
        paths.push(path.join('docs/review/hyperos-screen-off-survival', f));
      }
    }
  }
  return paths;
}

async function maybeCommit(label) {
  const paths = collect12hPaths();
  const status = sh('git status --porcelain').trim();
  const relevant = status
    .split('\n')
    .filter((l) => l.includes('HYPEROS_V15_12H') || l.includes('hyperos-v15-12h') || l.includes('ORCHESTRATOR_FINAL'));
  if (!relevant.length) return;
  for (const p of paths) {
    if (fs.existsSync(path.join(ROOT, p))) {
      try {
        sh(`git add "${p.replace(/\\/g, '/')}"`);
      } catch {
        /* ignore per-file */
      }
    }
  }
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
    fs.existsSync(path.join(SURVIVAL, 'hyperos-v15-12h-evidence.json'))
      ? fs.statSync(path.join(SURVIVAL, 'hyperos-v15-12h-evidence.json')).mtimeMs
      : 0,
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
