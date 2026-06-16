/**
 * Write interim progress report from rerun evidence JSON (callable during 3h run).
 */
import fs from 'node:fs';
import path from 'node:path';
import { buildPidTimeline } from './lib/hyperos-monitor-metrics.mjs';

const ROOT = process.cwd();
const EVIDENCE = path.join(ROOT, 'docs/review/hyperos-screen-off-survival/hyperos-v15-3h-rerun-evidence.json');
const OUT = path.join(ROOT, 'docs/review/HYPEROS_V15_3H_RERUN_INTERIM_REPORT.md');

function myt() {
  return new Date().toLocaleString('en-GB', { timeZone: 'Asia/Kuala_Lumpur', hour12: false }) + ' MYT';
}

if (!fs.existsSync(EVIDENCE)) {
  console.error('No rerun evidence yet:', EVIDENCE);
  process.exit(1);
}
const ev = JSON.parse(fs.readFileSync(EVIDENCE, 'utf8'));
const elapsedMin = ev.polls?.length ? ev.polls[ev.polls.length - 1].elapsedMin : 0;
const logBytes = (() => {
  const p = ev.runLiveLogPath ? path.join(ROOT, ev.runLiveLogPath) : null;
  return p && fs.existsSync(p) ? fs.statSync(p).size : 0;
})();

const md = `# HyperOS V15 3h RERUN — Interim Report

Updated: **${myt()}**  
Purpose: **Orchestrator fix validation (\`6dc5e63\`)**  
Run ID: \`${ev.runId}\`  
Start (MYT): ${ev.startMyt}

## Progress

| Item | Value |
|------|-------|
| Elapsed | ~${elapsedMin} min |
| Polls | ${ev.polls?.length ?? 0} / 12 |
| PID | ${ev.lastPid ?? '—'} (lost ${ev.pidLostEvents ?? 0}) |
| run-scoped logcat | **${logBytes}** bytes |

## Orchestrator checks (interim)

| Check | Status |
|-------|--------|
| writeEvidence errors | ${(ev.notes ?? []).some((n) => /orchestrator error|UNKNOWN/i.test(n)) ? '**FAIL**' : 'PASS so far'} |
| auto-finalize | ${ev.finalizeRan ? '**DONE**' : 'pending'} |
| evidence.json | ${fs.existsSync(EVIDENCE) ? 'updating' : 'missing'} |

## Poll timeline

| Elapsed | PID | HB | price | news | FGS | WL |
|---------|-----|-----|-------|------|-----|-----|
${(ev.polls ?? []).map((p) => `| ${p.elapsedMin}m | ${p.pid ?? '—'} | ${p.heartbeatTotal} | ${p.priceTotal} | ${p.newsTotal} | ${p.fgsRunning ? 'Y' : 'N'} | ${p.wakeLockHeld ? 'Y' : 'N'} |`).join('\n') || '| — | — | — | — | — | — | — |'}

## PID timeline

${buildPidTimeline(ev.polls ?? [])
  .map((r) => `- **${r.elapsedMin}m** · PID=${r.pid ?? 'null'}`)
  .join('\n') || '- pending'}
`;
fs.writeFileSync(OUT, md);
console.log('Wrote', path.relative(ROOT, OUT));
