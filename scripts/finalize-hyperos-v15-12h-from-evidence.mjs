/**
 * Finalize interrupted HyperOS 12h run from evidence + streamed logcat counts.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { writeJsonAtomicSync } from './lib/hyperos-evidence-io.mjs';
import { readLogcatMetricsFromFile, buildPidTimeline } from './lib/hyperos-monitor-metrics.mjs';
import { readCaptureBytes } from './lib/hyperos-logcat-capture.mjs';

const ROOT = process.cwd();
const EVIDENCE_PATH = path.join(ROOT, 'docs/review/hyperos-screen-off-survival/hyperos-v15-12h-evidence.json');
const REPORT_PATH = path.join(ROOT, 'docs/review/HYPEROS_V15_12H_RUN_REPORT.md');

function gitSha() {
  try {
    return execSync('git rev-parse HEAD', { cwd: ROOT, encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
}

const ev = JSON.parse(fs.readFileSync(EVIDENCE_PATH, 'utf8'));
const logPath = path.join(ROOT, ev.runLiveLogPath);
const bytes = readCaptureBytes(logPath);
const m = readLogcatMetricsFromFile(logPath);

ev.endedAt = ev.endedAt ?? new Date().toISOString();
ev.endMyt = new Date().toLocaleString('en-GB', { timeZone: 'Asia/Kuala_Lumpur', hour12: false }) + ' MYT';
ev.runLiveLogBytes = bytes;
ev.finalHeartbeatCount = m.heartbeat;
ev.finalPriceCount = m.price;
ev.finalNewsCount = m.news;
ev.finalSurvivalStatusCount = m.survival;
ev.finalPid = ev.lastPid;
ev.finalizeRan = true;
ev.interrupted = true;
ev.interruptReason = 'ERR_STRING_TOO_LONG at ~5h — orchestrator readMetricsLogcat; recovered via streamed finalize';
ev.notes = [...(ev.notes ?? []), ev.interruptReason];

const cpPath = path.join(ROOT, 'docs/review/phase12-5-long-run/checkpoint.json');
let checkpointSummary = 'n/a';
if (fs.existsSync(cpPath)) {
  try {
    const cp = JSON.parse(fs.readFileSync(cpPath, 'utf8'));
    checkpointSummary = `- priceRefreshRuns: ${cp.priceRefreshRuns?.length ?? 0}\n- pidLostEvents: ${cp.pidLostEvents ?? 0}\n- fatal: ${cp.crashes?.fatal ?? 0}\n- anr: ${cp.anrCount ?? 0}`;
  } catch {
    checkpointSummary = 'parse failed';
  }
}

const summaryPath = path.join(ROOT, 'docs/review/hyperos-screen-off-survival', `logcat-summary-12h-${ev.runId}.txt`);
const summaryText = [
  `# HyperOS 12h logcat summary (recovered ${ev.runId})`,
  `bytes: ${bytes}`,
  `12H-MONITOR: ${m.monitorLines}`,
  `heartbeat: ${m.heartbeat}`,
  `price_update: ${m.price}`,
  `news_fetch: ${m.news}`,
  `survival_health_ok: ${m.survivalOk}`,
  `streamed: ${m.streamed}`,
].join('\n');
fs.writeFileSync(summaryPath, summaryText);
ev.summaryPath = path.relative(ROOT, summaryPath).replace(/\\/g, '/');

const pidOk = ev.pidLostEvents === 0;
const hbOk = m.heartbeat >= 20;
const fgsOk = ev.polls.filter((p) => p.fgsRunning).length >= ev.polls.length * 0.7;
const wlOk = ev.polls.filter((p) => p.wakeLockHeld).length >= ev.polls.length * 0.7;
const appGo = pidOk && hbOk && fgsOk && wlOk;
const orchFail = true; // did not complete 12h / auto-finalize in-process
const overall = appGo && !orchFail ? 'GO' : appGo ? 'PARTIAL_GO_APP' : 'NO-GO';

const md = `# HyperOS V15 12h Screen-Off Run Report

## Verdict: **${overall}** (interrupted at ~5h)

| Field | Value |
|-------|-------|
| Run ID | \`${ev.runId}\` |
| Window (MYT) | ${ev.startMyt} → ${ev.endMyt} |
| Planned | 12h |
| Actual elapsed | ~${ev.polls.at(-1)?.elapsedMin ?? '?'} min (${ev.polls.length} polls) |
| APK | preview-v15.apk (versionCode ${ev.versionCode}) |
| Device | ${ev.targetSerial} |
| Interrupt | orchestrator \`ERR_STRING_TOO_LONG\` on 574MB logcat (fixed: streamed counts) |

## Verification (7 items)

| # | Item | Result | Evidence |
|---|------|--------|----------|
| 1 | PID maintenance | ${pidOk ? 'PASS' : 'FAIL'} | baseline ${ev.baselinePid}, lost ${ev.pidLostEvents}, final ${ev.lastPid} |
| 2 | Heartbeat continuation | ${hbOk ? 'PASS' : 'FAIL'} | ${m.heartbeat} (poll peak ${ev.pollPeakHeartbeat}) |
| 3 | Twelve Data / price | ${m.price >= 3 ? 'PASS' : 'WARN'} | price_update ${m.price} |
| 4 | News fetch | ${m.news >= 1 ? 'PASS' : 'WARN'} | news_fetch ${m.news} |
| 5 | Foreground service | ${fgsOk ? 'PASS' : 'FAIL'} | polls with FGS |
| 6 | WakeLock | ${wlOk ? 'PASS' : 'FAIL'} | polls with WL |
| 7 | Crash / ANR | see checkpoint | checkpoint below |

## Orchestrator

| Check | Result |
|-------|--------|
| run-scoped logcat | PASS (${bytes} bytes) |
| auto-finalize in-run | **FAIL** (crash ~5h) |
| evidence.json | PASS (recovered) |
| streamed finalize | PASS (this report) |

## Event counts (streamed from live log)

| Pattern | Count |
|---------|-------|
| 12H-MONITOR | **${m.monitorLines}** |
| heartbeat | **${m.heartbeat}** |
| price_update | **${m.price}** |
| news_fetch | **${m.news}** |
| survival_health_ok | **${m.survivalOk}** |

## PID timeline

${buildPidTimeline(ev.polls)
  .map((r) => `- **${r.elapsedMin}m** · PID=${r.pid ?? 'null'}`)
  .join('\n')}

## dumpsys evidence

${(ev.dumpsysPaths ?? []).map((p) => `- \`${p}\``).join('\n')}

## checkpoint.json

${checkpointSummary}

## logcat summary

\`${ev.summaryPath}\`

## GitHub sync

Commit: **${gitSha()}**
`;

fs.writeFileSync(REPORT_PATH, md);
writeJsonAtomicSync(EVIDENCE_PATH, ev);
console.log('FINALIZED', overall, { heartbeat: m.heartbeat, bytes, polls: ev.polls.length });
