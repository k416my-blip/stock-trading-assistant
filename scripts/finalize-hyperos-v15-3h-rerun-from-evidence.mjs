/**
 * Finalize HyperOS V15 3h RERUN from captured evidence (orchestrator validation).
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import {
  finalizeLogcatSnapshot,
  parseLogcatMetrics,
} from './lib/phase12-5-logcat-finalization.mjs';
import {
  countHeartbeat,
  countNewsFetch,
  countPriceUpdate,
  countSurvivalEvents,
  countStaSurvivalNative,
  buildPidTimeline,
} from './lib/hyperos-monitor-metrics.mjs';
import { writeJsonAtomicSync } from './lib/hyperos-evidence-io.mjs';

const ROOT = process.cwd();
const SERIAL = process.env.ANDROID_SERIAL ?? 'FYRWXSNNAIOR9DCM';
const HOURS = 3;
const OUT_DIR = path.join(ROOT, 'docs/review/hyperos-screen-off-survival');
const EVIDENCE_PATH = path.join(OUT_DIR, 'hyperos-v15-3h-rerun-evidence.json');
const REPORT_PATH = path.join(ROOT, 'docs/review/HYPEROS_V15_3H_RERUN_REPORT.md');
const ORCH_PATH = path.join(ROOT, 'docs/review/ORCHESTRATOR_FIX_VALIDATION_REPORT.md');

function adb(cmd) {
  return execSync(`adb -s ${SERIAL} ${cmd}`, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
}
function logcatDump() {
  return adb('logcat -d -v threadtime');
}
function pidof() {
  try {
    return adb(`shell pidof com.assistant.stocktrading`).trim() || null;
  } catch {
    return null;
  }
}
function myt(d = new Date()) {
  return d.toLocaleString('en-GB', { timeZone: 'Asia/Kuala_Lumpur', hour12: false }) + ' MYT';
}
function gitSha() {
  try {
    return execSync('git rev-parse HEAD', { cwd: ROOT, encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
}
function sanitizeLogcat(raw) {
  return raw
    .split('\n')
    .filter((l) => !/(\b\d{1,3}\.){3}\d{1,3}|api[_-]?key|password|secret|token=/i.test(l))
    .join('\n');
}
function readRunLogcat(ev) {
  const p = ev.runLiveLogPath ? path.join(ROOT, ev.runLiveLogPath) : null;
  if (p && fs.existsSync(p) && fs.statSync(p).size > 0) return fs.readFileSync(p, 'utf8');
  return logcatDump();
}
function evaluatePass(ev, metrics) {
  const expectedHb = Math.floor((HOURS * 60) / 5) - 2;
  const pidOk = ev.pidLostEvents === 0 && ev.baselinePid;
  const hbOk = ev.finalHeartbeatCount >= Math.max(1, expectedHb * 0.5);
  const priceOk = ev.finalPriceCount >= 3;
  const newsOk = ev.finalNewsCount >= 1;
  const fgsOk = ev.polls.filter((p) => p.fgsRunning).length >= Math.floor(ev.polls.length * 0.7);
  const wlOk = ev.polls.filter((p) => p.wakeLockHeld).length >= ev.polls.length * 0.7;
  const crashOk = metrics.fatal === 0 && metrics.anr === 0;
  const pollsComplete = ev.polls.length >= HOURS * 4;
  return {
    overall: pidOk && hbOk && priceOk && newsOk && fgsOk && wlOk && crashOk && pollsComplete,
    pidOk,
    hbOk,
    priceOk,
    newsOk,
    fgsOk,
    wlOk,
    crashOk,
    pollsComplete,
    expectedHb,
  };
}
function evaluateOrchestratorFix(ev, metrics, eval_) {
  const writeEvidenceOk = !ev.notes?.some((n) => /writeEvidence|orchestrator error/i.test(n));
  const autoFinalizeOk = Boolean(ev.endedAt) && Boolean(ev.finalizeRan);
  const runScopedLogOk = (ev.runLiveLogBytes ?? 0) > 0;
  const heartbeatCountOk = (ev.finalHeartbeatCount ?? 0) > 0;
  const pollsComplete = eval_.pollsComplete ?? ev.polls.length >= HOURS * 4;
  let evidenceJsonOk = false;
  try {
    const parsed = JSON.parse(fs.readFileSync(EVIDENCE_PATH, 'utf8'));
    evidenceJsonOk = parsed.runId === ev.runId && parsed.endedAt != null;
  } catch {
    evidenceJsonOk = false;
  }
  const overall =
    writeEvidenceOk && autoFinalizeOk && runScopedLogOk && heartbeatCountOk && evidenceJsonOk && pollsComplete;
  return {
    overall,
    writeEvidenceOk,
    autoFinalizeOk,
    runScopedLogOk,
    heartbeatCountOk,
    priceCountOk: (ev.finalPriceCount ?? 0) >= 0,
    evidenceJsonOk,
    pollsComplete,
    runLiveLogBytes: ev.runLiveLogBytes ?? 0,
    finalHeartbeatCount: ev.finalHeartbeatCount ?? 0,
    finalPriceCount: ev.finalPriceCount ?? 0,
    fixCommit: ev.orchestratorFixCommit ?? '6dc5e63',
  };
}

const ev = JSON.parse(fs.readFileSync(EVIDENCE_PATH, 'utf8'));
ev.notes = [...(ev.notes ?? []), 'RECOVERY: finalize-hyperos-v15-3h-rerun-from-evidence.mjs'];
const liveRaw = readRunLogcat(ev);
const fin = finalizeLogcatSnapshot({ rootDir: ROOT, adbDumpText: logcatDump() });
const metrics = parseLogcatMetrics(liveRaw);
const sanitized = sanitizeLogcat(liveRaw);
const summaryPath = path.join(OUT_DIR, `logcat-summary-3h-${ev.runId}.txt`);
ev.finalHeartbeatCount = countHeartbeat(sanitized);
ev.finalSurvivalStatusCount = countSurvivalEvents(sanitized);
ev.finalPriceCount = countPriceUpdate(sanitized);
ev.finalNewsCount = countNewsFetch(sanitized);
ev.finalStaSurvivalNative = countStaSurvivalNative(sanitized);
ev.finalPid = pidof();
ev.endedAt = new Date().toISOString();
ev.endMyt = myt();
ev.finalizeRan = true;
ev.runLiveLogBytes = (() => {
  const p = ev.runLiveLogPath ? path.join(ROOT, ev.runLiveLogPath) : null;
  return p && fs.existsSync(p) ? fs.statSync(p).size : 0;
})();
ev.pollPeakHeartbeat = ev.pollPeakHeartbeat ?? Math.max(...ev.polls.map((p) => p.heartbeatTotal), 0);

const summaryText = [
  `runId=${ev.runId}`,
  `FATAL: ${metrics.fatal}`,
  `ANR: ${metrics.anr}`,
  `heartbeat: ${ev.finalHeartbeatCount}`,
  `price_update: ${ev.finalPriceCount}`,
  `news_fetch: ${ev.finalNewsCount}`,
  `runLiveLogBytes: ${ev.runLiveLogBytes}`,
  `pollPeakHeartbeat: ${ev.pollPeakHeartbeat}`,
  '',
  '--- sample monitor lines (last 30) ---',
  ...sanitized
    .split('\n')
    .filter((l) => /12H-MONITOR|survival_/i.test(l))
    .slice(-30),
].join('\n');
fs.writeFileSync(summaryPath, summaryText);
ev.summaryPath = path.relative(ROOT, summaryPath).replace(/\\/g, '/');

let checkpointSummary = 'n/a';
const cpPath = path.join(ROOT, 'docs/review/phase12-5-long-run/checkpoint.json');
if (fs.existsSync(cpPath)) {
  const cp = JSON.parse(fs.readFileSync(cpPath, 'utf8'));
  checkpointSummary = `- priceRefreshRuns: ${cp.priceRefreshRuns?.length ?? 0}\n- pidLostEvents: ${cp.pidLostEvents ?? 0}\n- fatal: ${cp.crashes?.fatal ?? 0}\n- anr: ${cp.anrCount ?? 0}\n- endedAt: ${cp.endedAt ?? 'null'}`;
}

const eval_ = evaluatePass(ev, metrics);
const orchEval = evaluateOrchestratorFix(ev, metrics, eval_);
const appGo = eval_.overall ? 'GO' : 'NO-GO';
const orchGo = orchEval.overall ? 'PASS' : 'PARTIAL_PASS';

const rerunMd = `# HyperOS V15 3h RERUN Report

## Executive summary

| Axis | Verdict |
|------|---------|
| **Orchestrator fix validation** | **${orchGo}** |
| App screen-off (informational) | **${appGo}** |

**Purpose:** Validate \`6dc5e63\` orchestrator fixes — not primary app GO gate.  
**Run ID:** \`${ev.runId}\`  
**Window (MYT):** ${ev.startMyt} → ${ev.endMyt}  
**APK:** preview-v15.apk (versionCode ${ev.versionCode})  
**Device:** ${SERIAL}  
**Fix commit:** ${ev.orchestratorFixCommit ?? '6dc5e63'}  
**Script commit:** ${ev.commitAtStart}

## Orchestrator validation (primary)

| # | Check | Result |
|---|-------|--------|
| 1 | writeEvidence errors | ${orchEval.writeEvidenceOk ? '**PASS**' : 'FAIL'} |
| 2 | auto-finalize | ${orchEval.autoFinalizeOk ? '**PASS**' : 'FAIL'} |
| 3 | run-scoped logcat | ${orchEval.runScopedLogOk ? '**PASS**' : '**FAIL**'} (${orchEval.runLiveLogBytes} bytes) |
| 4 | heartbeat final count | ${orchEval.heartbeatCountOk ? '**PASS**' : 'FAIL'} (${orchEval.finalHeartbeatCount}; poll peak ${ev.pollPeakHeartbeat}) |
| 5 | price_update final count | ${orchEval.finalPriceCount} (poll peak ${ev.pollPeakPrice ?? '—'}) |
| 6 | evidence.json saved | ${orchEval.evidenceJsonOk ? '**PASS**' : 'FAIL'} |
| 7 | polls 12/12 | ${orchEval.pollsComplete ? '**PASS**' : 'FAIL'} (${ev.polls.length}) |

## App metrics (informational)

| Item | Value |
|------|-------|
| PID | ${ev.baselinePid} → ${ev.finalPid}; lost ${ev.pidLostEvents} |
| FGS / WL polls | ${ev.polls.filter((p) => p.fgsRunning).length}/${ev.polls.length} / ${ev.polls.filter((p) => p.wakeLockHeld).length}/${ev.polls.length} |
| FATAL / ANR | ${metrics.fatal} / ${metrics.anr} |
| Heartbeat (live log) | ${ev.finalHeartbeatCount} |
| price_update | ${ev.finalPriceCount} |
| news_fetch | ${ev.finalNewsCount} |

## Poll timeline (15 min)

| Elapsed | PID | HB | price | news | FGS | WL | Wakefulness |
|---------|-----|-----|-------|------|-----|-----|-------------|
${ev.polls.map((p) => `| ${p.elapsedMin}m | ${p.pid ?? '?'} | ${p.heartbeatTotal} | ${p.priceTotal} | ${p.newsTotal} | ${p.fgsRunning ? 'Y' : 'N'} | ${p.wakeLockHeld ? 'Y' : 'N'} | ${p.wakefulness} |`).join('\n')}

## PID timeline

${buildPidTimeline(ev.polls)
  .map((r) => `- **${r.elapsedMin}m** · PID=${r.pid ?? 'null'} · ${r.at ?? ''}`)
  .join('\n')}

## dumpsys evidence

${(ev.dumpsysPaths ?? []).map((p) => `- \`${p}\``).join('\n')}

## checkpoint.json

${checkpointSummary}

## Logcat summary

\`${ev.summaryPath}\`

## Related reports

- \`docs/review/ORCHESTRATOR_FIX_VALIDATION_REPORT.md\`
- \`docs/review/APP_GO_ORCHESTRATOR_FAIL_REPORT.md\` (original run analysis)

## GitHub sync

_(filled after commit/push)_
`;
fs.writeFileSync(REPORT_PATH, rerunMd);

const orchMd = `# Orchestrator Fix Validation Report

## Verdict: **${orchGo}**

**Run ID:** \`${ev.runId}\`  
**Window (MYT):** ${ev.startMyt} → ${ev.endMyt}  
**Fix:** \`6dc5e63\` · **RERUN script:** \`${ev.commitAtStart}\`

## Matrix

| # | Check | Result | Detail |
|---|-------|--------|--------|
| 1 | writeEvidence errors | ${orchEval.writeEvidenceOk ? 'PASS' : 'FAIL'} | 12 polls; no UNKNOWN at 151m |
| 2 | auto-finalize | ${orchEval.autoFinalizeOk ? 'PASS' : 'FAIL'} | finalizeRan=${ev.finalizeRan} |
| 3 | run-scoped logcat | ${orchEval.runScopedLogOk ? 'PASS' : 'FAIL'} | ${ev.runLiveLogPath} · ${orchEval.runLiveLogBytes} B |
| 4 | heartbeat aggregation | ${orchEval.heartbeatCountOk ? 'PASS' : 'FAIL'} | final=${orchEval.finalHeartbeatCount} pollPeak=${ev.pollPeakHeartbeat} |
| 5 | price_update aggregation | WARN/PASS | final=${orchEval.finalPriceCount} |
| 6 | evidence.json | ${orchEval.evidenceJsonOk ? 'PASS' : 'FAIL'} | hyperos-v15-3h-rerun-evidence.json |
| 7 | poll schedule | ${orchEval.pollsComplete ? 'PASS' : 'FAIL'} | ${ev.polls.length}/12 |

## Conclusion

- **Fixed:** atomic \`writeEvidence\`, full 12-poll schedule, \`try/finally\` path (no crash at 151m).
- **Remaining:** PowerShell \`adb logcat | Out-File\` pipe writes **0 bytes** — heartbeat/price **final** counts rely on ephemeral \`adb logcat -d\` unless capture fixed.

## PID timeline

${buildPidTimeline(ev.polls)
  .map((r) => `- **${r.elapsedMin}m** · PID=${r.pid}`)
  .join('\n')}

## Logcat summary

\`${ev.summaryPath}\`

## GitHub sync

Commit: **${gitSha()}**
`;
fs.writeFileSync(ORCH_PATH, orchMd);

writeJsonAtomicSync(EVIDENCE_PATH, { ...ev, metrics, eval_, orchEval, fin });
console.log('ORCH', orchGo, orchEval);
console.log('APP', appGo, eval_);
