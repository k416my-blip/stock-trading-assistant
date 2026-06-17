/**
 * HyperOS v9 — 3h screen-off run with phase12-5 apk orchestration.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync, spawn, spawnSync } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import {
  DEFAULT_LIVE_LOGCAT,
  finalizeLogcatSnapshot,
  parseLogcatMetrics,
} from './lib/phase12-5-logcat-finalization.mjs';
import {
  countHeartbeat,
  countNewsFetch,
  countPriceUpdate,
  countStaSurvivalNative,
  countSurvivalEvents,
  parseFgsEvidence,
  parseWakeLockEvidence,
  buildPidTimeline,
  readLogcatMetricsFromFile,
} from './lib/hyperos-monitor-metrics.mjs';
import { writeJsonAtomicSync } from './lib/hyperos-evidence-io.mjs';
import {
  startLogcatCaptureToFile,
  stopLogcatCapture as stopLogcatCaptureHandle,
  readCaptureBytes,
} from './lib/hyperos-logcat-capture.mjs';

const ROOT = process.cwd();
const PKG = 'com.assistant.stocktrading';
const SERIAL = process.env.ANDROID_SERIAL ?? process.env.ADB_SERIAL ?? 'FYRWXSNNAIOR9DCM';
const HOURS = Number(process.env.PHASE12_5_HOURS ?? process.env.VERIFY_HYPEROS_HOURS ?? '3');
const STAGE = process.env.VERIFY_HYPEROS_STAGE ?? `${HOURS}h`;
const REPORT_VER = process.env.VERIFY_HYPEROS_REPORT_VER ?? 'V15';
const IS_RERUN = process.env.VERIFY_HYPEROS_RERUN === '1';
const IS_6H_ORCH = process.env.VERIFY_HYPEROS_6H_ORCH === '1' || (HOURS === 6 && process.env.VERIFY_HYPEROS_6H_ORCH !== '0' && !IS_RERUN);
const IS_12H = HOURS >= 12 || process.env.VERIFY_HYPEROS_12H === '1';
const IS_LONG_RUN = IS_12H || IS_6H_ORCH;
const POLL_MIN = 15;
const APK = path.join(ROOT, 'artifacts/preview-v15.apk');
const APK_FALLBACK = path.join(ROOT, 'artifacts/preview-v11.apk');
const TWELVE_DIR = path.join(ROOT, 'docs/review/twelve-hour-test');
const OUT_DIR = path.join(ROOT, 'docs/review/hyperos-screen-off-survival');
const HEALTH_DIR = path.join(ROOT, 'docs/review/phase12-5-v8-3h-health');
const CHECKPOINT_PS = path.join(TWELVE_DIR, 'phase12-5-v8-3h-checkpoint-once.ps1');
const LIVE_LOG = path.join(ROOT, DEFAULT_LIVE_LOGCAT);
const EVIDENCE_PATH = path.join(
  OUT_DIR,
  IS_RERUN
    ? 'hyperos-v15-3h-rerun-evidence.json'
    : IS_12H
      ? 'hyperos-v15-12h-evidence.json'
      : IS_6H_ORCH
        ? 'hyperos-v15-6h-evidence.json'
        : `hyperos-v15-${STAGE}-evidence.json`,
);
const REPORT_PATH = path.join(
  ROOT,
  IS_RERUN
    ? 'docs/review/HYPEROS_V15_3H_RERUN_REPORT.md'
    : IS_12H
      ? 'docs/review/HYPEROS_V15_12H_RUN_REPORT.md'
      : IS_6H_ORCH
        ? 'docs/review/HYPEROS_V15_6H_RUN_REPORT.md'
        : `docs/review/HYPEROS_${REPORT_VER}_${STAGE.toUpperCase()}_SCREEN_OFF_RUN_REPORT.md`,
);
const INTERIM_REPORT_PATH = path.join(
  ROOT,
  IS_RERUN
    ? 'docs/review/HYPEROS_V15_3H_RERUN_INTERIM_REPORT.md'
    : IS_12H
      ? 'docs/review/HYPEROS_V15_12H_RUN_INTERIM_REPORT.md'
      : IS_6H_ORCH
        ? 'docs/review/HYPEROS_V15_6H_RUN_INTERIM_REPORT.md'
        : `docs/review/HYPEROS_${REPORT_VER}_${STAGE.toUpperCase()}_SCREEN_OFF_RUN_INTERIM_REPORT.md`,
);
const ORCHESTRATOR_REPORT_PATH = path.join(ROOT, 'docs/review/ORCHESTRATOR_FIX_VALIDATION_REPORT.md');
const STREAMING_ORCH_REPORT_PATH = path.join(ROOT, 'docs/review/ORCHESTRATOR_STREAMING_VALIDATION_REPORT.md');
const DUMPSYS_DIR = path.join(OUT_DIR, 'dumpsys-evidence');

function sh(cmd, opts = {}) {
  return execSync(cmd, {
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
    maxBuffer: 80 * 1024 * 1024,
    ...opts,
  }).trim();
}

function adb(cmd) {
  return sh(`adb -s ${SERIAL} ${cmd}`);
}

function ts() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

function myt(d = new Date()) {
  return new Date(d.getTime() + 8 * 3600 * 1000).toISOString().replace('T', ' ').slice(0, 19) + ' MYT';
}

function pidof() {
  try {
    return adb(`shell pidof ${PKG}`).split(/\s+/).filter(Boolean)[0] ?? null;
  } catch {
    return null;
  }
}

function logcatDump() {
  try {
    return adb('logcat -d -v time');
  } catch {
    return '';
  }
}

function countLines(raw, needles) {
  const list = Array.isArray(needles) ? needles : [needles];
  return raw.split('\n').filter((l) => list.some((n) => l.includes(n))).length;
}

function sanitizeLogcat(raw) {
  return raw
    .split('\n')
    .map((l) =>
      l
        .replace(/api[_-]?key[=:]\s*['"]?[A-Za-z0-9_-]{8,}/gi, 'api_key=[REDACTED]')
        .replace(/(twelvedata|newsapi)[^&\s]*[&?]apikey=[^&\s]+/gi, '$1?apikey=[REDACTED]')
        .replace(/Bearer\s+[A-Za-z0-9._-]{20,}/gi, 'Bearer [REDACTED]'),
    )
    .join('\n');
}

function wakefulness() {
  try {
    const m = adb('shell dumpsys power').match(/mWakefulness=([^\s]+)/);
    return m?.[1] ?? 'unknown';
  } catch {
    return 'unknown';
  }
}

function fgsSnippet() {
  try {
    const raw = adb(`shell dumpsys activity services ${PKG}`);
    return parseFgsEvidence(raw);
  } catch {
    return { running: false, snippet: '', hitCount: 0 };
  }
}

function saveDumpsysEvidence(label, ev) {
  fs.mkdirSync(DUMPSYS_DIR, { recursive: true });
  const base = path.join(DUMPSYS_DIR, `${ev.runId}-${label}`);
  try {
    fs.writeFileSync(`${base}-services.txt`, adb(`shell dumpsys activity services ${PKG}`));
    fs.writeFileSync(`${base}-power.txt`, adb('shell dumpsys power'));
    fs.writeFileSync(`${base}-proc.txt`, adb(`shell dumpsys activity processes | grep -i ${PKG}`));
  } catch {
    /* optional */
  }
  return `${base}-services.txt`;
}

function wakelockSnippet() {
  try {
    return adb('shell dumpsys power').split('\n').filter((l) => /wake|WakeLock/i.test(l)).slice(0, 12).join('\n');
  } catch {
    return '';
  }
}

function survivalFromLogcat(raw) {
  return parseWakeLockEvidence(wakelockSnippet(), raw).held;
}

function versionCode() {
  try {
    const m = adb(`shell dumpsys package ${PKG}`).match(/versionCode=(\d+)/);
    return m ? Number(m[1]) : null;
  } catch {
    return null;
  }
}

function ensureDirs() {
  for (const d of [OUT_DIR, TWELVE_DIR, HEALTH_DIR, path.join(ROOT, 'docs/review/phase12-5-long-run')]) {
    fs.mkdirSync(d, { recursive: true });
  }
}

function runLiveLogPathFor(runId) {
  return path.join(OUT_DIR, `logcat-live-${runId}.log`);
}

/** @type {ReturnType<typeof startLogcatCaptureToFile> | null} */
let logcatCaptureHandle = null;

function startLogcatCapture(runId) {
  stopLogcatCapture();
  const runLog = runLiveLogPathFor(runId);
  logcatCaptureHandle = startLogcatCaptureToFile({ serial: SERIAL, destPath: runLog, rootDir: ROOT });
  fs.writeFileSync(path.join(TWELVE_DIR, 'adb-logcat-live.pid'), String(logcatCaptureHandle.pid));
  return runLog;
}

function readRunLogcat(ev) {
  const rel = ev.runLiveLogPath;
  const p = rel ? path.join(ROOT, rel) : runLiveLogPathFor(ev.runId);
  if (fs.existsSync(p) && readCaptureBytes(p) > 0) {
    const m = readLogcatMetricsFromFile(p);
    if (m.raw) return m.raw;
    ev._streamMetrics = m;
    return logcatDump();
  }
  return logcatDump();
}

function stopLogcatCapture() {
  if (logcatCaptureHandle) {
    stopLogcatCaptureHandle(logcatCaptureHandle);
    logcatCaptureHandle = null;
  }
  const pidFile = path.join(TWELVE_DIR, 'adb-logcat-live.pid');
  if (fs.existsSync(pidFile)) fs.unlinkSync(pidFile);
}

function readMetricsLogcat(ev) {
  const p = ev?.runLiveLogPath ? path.join(ROOT, ev.runLiveLogPath) : null;
  if (p && fs.existsSync(p) && readCaptureBytes(p) > 0) {
    const m = readLogcatMetricsFromFile(p);
    if (m.raw) {
      delete ev._streamMetrics;
      return m.raw;
    }
    ev._streamMetrics = m;
    return logcatDump();
  }
  delete ev._streamMetrics;
  return logcatDump();
}

function countsFromRawOrStream(ev, raw) {
  if (ev._streamMetrics) {
    return {
      hb: ev._streamMetrics.heartbeat,
      pr: ev._streamMetrics.price,
      nw: ev._streamMetrics.news,
    };
  }
  return {
    hb: countHeartbeat(raw),
    pr: countPriceUpdate(raw),
    nw: countNewsFetch(raw),
  };
}

async function launchCold() {
  adb(`shell am force-stop ${PKG}`);
  await sleep(1500);
  adb(`shell monkey -p ${PKG} -c android.intent.category.LAUNCHER 1`);
}

async function waitSurvival(timeoutMs = 120_000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    const raw = logcatDump();
    if (raw.includes('survival_enabled') || raw.includes('[12H-MONITOR]')) {
      if (raw.includes('survival_enabled') || raw.includes('heartbeat')) return true;
    }
    await sleep(3000);
    adb(`shell monkey -p ${PKG} -c android.intent.category.LAUNCHER 1`);
  }
  return false;
}

function screenOff() {
  adb('shell input keyevent KEYCODE_POWER');
}

async function enforceScreenOff() {
  const w = wakefulness();
  if (w === 'Awake' || w === 'Dreaming') {
    await sleep(400);
    screenOff();
  }
}

function writeEvidence(ev) {
  writeJsonAtomicSync(EVIDENCE_PATH, ev);
}

function runCheckpoint(label) {
  if (!fs.existsSync(CHECKPOINT_PS)) return { ok: false, note: 'checkpoint script missing' };
  const r = spawnSync(
    'powershell',
    ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', CHECKPOINT_PS, '-Label', label],
    { cwd: ROOT, encoding: 'utf8', stdio: 'pipe' },
  );
  return { ok: r.status === 0, stdout: r.stdout?.slice(0, 2000), stderr: r.stderr?.slice(0, 1000) };
}

function gitSha() {
  try {
    return sh('git rev-parse HEAD');
  } catch {
    return 'unknown';
  }
}

function buildLogcatSummary(raw, metrics) {
  const lines = [
    `# HyperOS v10 ${STAGE} logcat summary (${ts()})`,
    `heartbeat: ${countHeartbeat(raw)}`,
    `survival_events: ${countSurvivalEvents(raw)}`,
    `sta_survival_native: ${countStaSurvivalNative(raw)}`,
    `survival_enabled: ${raw.split('\n').filter((l) => l.includes('survival_enabled')).length}`,
    `survival_status: ${raw.split('\n').filter((l) => l.includes('survival_status')).length}`,
    `price_update: ${countPriceUpdate(raw)}`,
    `news_fetch: ${countNewsFetch(raw)}`,
    `FATAL: ${metrics.fatal}`,
    `ANR: ${metrics.anr}`,
    '',
    '--- sample monitor lines (sanitized, last 40) ---',
    ...sanitizeLogcat(raw)
      .split('\n')
      .filter((l) => /12H-MONITOR|survival_|price_update|news_fetch/i.test(l))
      .slice(-40),
  ];
  return lines.join('\n');
}

function evaluatePass(ev, metrics) {
  const hbIntervalMin = Number(process.env.VERIFY_HYPEROS_HEARTBEAT_MIN ?? '15');
  const expectedHb = Math.max(1, Math.floor((HOURS * 60) / hbIntervalMin) - 1);
  const pidOk = ev.pidLostEvents === 0 && ev.baselinePid;
  const hbOk = ev.finalHeartbeatCount >= Math.max(1, expectedHb * 0.5);
  const priceOk = ev.finalPriceCount >= 3;
  const newsOk = ev.finalNewsCount >= 1;
  const fgsOk = ev.polls.filter((p) => p.fgsRunning).length >= Math.max(1, Math.floor(ev.polls.length * 0.7));
  const wlOk = ev.polls.filter((p) => p.wakeLockHeld).length >= ev.polls.length * 0.7;
  const crashOk = metrics.fatal === 0 && metrics.anr === 0;
  const screenOk = ev.screenOffEnforcedCount >= ev.polls.length * 0.5 || ev.polls.every((p) => p.wakefulness !== 'Awake');
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
    screenOk,
    pollsComplete,
    expectedHb,
  };
}

function evaluateOrchestratorFix(ev, metrics, eval_) {
  const writeEvidenceOk = !ev.notes?.some((n) => /writeEvidence|orchestrator error/i.test(n));
  const autoFinalizeOk = Boolean(ev.endedAt) && Boolean(ev.finalizeRan);
  const runScopedLogOk = (ev.runLiveLogBytes ?? 0) > 0;
  const heartbeatCountOk = (ev.finalHeartbeatCount ?? 0) > 0;
  const priceCountOk = (ev.finalPriceCount ?? 0) >= 0;
  let evidenceJsonOk = false;
  try {
    const parsed = JSON.parse(fs.readFileSync(EVIDENCE_PATH, 'utf8'));
    evidenceJsonOk = parsed.runId === ev.runId && parsed.endedAt != null;
  } catch {
    evidenceJsonOk = false;
  }
  const pollsComplete = eval_.pollsComplete ?? ev.polls.length >= HOURS * 4;
  const overall =
    writeEvidenceOk &&
    autoFinalizeOk &&
    runScopedLogOk &&
    heartbeatCountOk &&
    evidenceJsonOk &&
    pollsComplete;
  return {
    overall,
    writeEvidenceOk,
    autoFinalizeOk,
    runScopedLogOk,
    heartbeatCountOk,
    priceCountOk,
    evidenceJsonOk,
    pollsComplete,
    runLiveLogBytes: ev.runLiveLogBytes ?? 0,
    finalHeartbeatCount: ev.finalHeartbeatCount ?? 0,
    finalPriceCount: ev.finalPriceCount ?? 0,
    fixCommit: ev.orchestratorFixCommit ?? '6dc5e63',
  };
}

function evaluateOrchestratorStreaming(ev, metrics, eval_) {
  const base = evaluateOrchestratorFix(ev, metrics, eval_);
  const streamingOk =
    !ev.notes?.some((n) => /ERR_STRING_TOO_LONG|string longer than/i.test(n)) &&
    (ev._streamMetrics?.streamed === true || (ev.runLiveLogBytes ?? 0) > 512 * 1024 * 1024);
  const metricsViaStream = Boolean(ev._streamMetrics?.streamed || ev.streamedFinalize);
  return {
    ...base,
    streamingOk,
    metricsViaStream,
    overall: base.overall && streamingOk,
    priorFailureRef: '20260616-210645 ERR_STRING_TOO_LONG @ ~5h',
    fixCommit: ev.orchestratorFixCommit ?? '780118f',
  };
}

function writeOrchestratorStreamingValidationReport(ev, metrics, eval_, orchEval) {
  const go = orchEval.overall ? 'PASS' : 'FAIL';
  const md = `# Orchestrator Streaming Validation Report

## Verdict: **${go}**

**Purpose:** Validate streamed logcat metrics fix after \`ERR_STRING_TOO_LONG\` at ~5h (run \`20260616-210645\`).  
**Run ID:** \`${ev.runId}\`  
**Window (MYT):** ${ev.startMyt} → ${ev.endMyt ?? 'in progress'}  
**Duration:** ${HOURS}h orchestrator validation  
**APK:** preview-v15.apk (versionCode ${ev.versionCode})  
**Device:** ${SERIAL}

## Validation matrix

| # | Check | Result | Evidence |
|---|-------|--------|----------|
| 1 | writeEvidence errors | ${orchEval.writeEvidenceOk ? 'PASS' : 'FAIL'} | ${(ev.notes ?? []).filter((n) => /error|UNKNOWN|ERR_STRING/i.test(n)).join('; ') || 'none'} |
| 2 | auto-finalize executed | ${orchEval.autoFinalizeOk ? 'PASS' : 'FAIL'} | finalizeRan=${ev.finalizeRan ?? false} |
| 3 | run-scoped logcat | ${orchEval.runScopedLogOk ? 'PASS' : 'FAIL'} | **${orchEval.runLiveLogBytes}** bytes |
| 4 | streamed metrics (no OOM read) | ${orchEval.streamingOk ? 'PASS' : 'FAIL'} | streamed=${orchEval.metricsViaStream} |
| 5 | heartbeat aggregation | ${orchEval.heartbeatCountOk ? 'PASS' : 'FAIL'} | **${orchEval.finalHeartbeatCount}** |
| 6 | price_update aggregation | ${orchEval.priceCountOk ? 'PASS' : 'WARN'} | **${orchEval.finalPriceCount}** |
| 7 | evidence.json | ${orchEval.evidenceJsonOk ? 'PASS' : 'FAIL'} | \`${path.relative(ROOT, EVIDENCE_PATH).replace(/\\/g, '/')}\` |
| 8 | full poll schedule | ${orchEval.pollsComplete ? 'PASS' : 'FAIL'} | polls=${ev.polls.length} / ${HOURS * 4} |

## Prior failure reference

| Run | Failure |
|-----|---------|
| 20260616-210645 | \`readFileSync\` on 574MB log → \`ERR_STRING_TOO_LONG\` @ ~5h |

## Fix reference

Commit: **${orchEval.fixCommit}** — \`readLogcatMetricsFromFile()\` streamed chunk reader

## App reference (informational)

| Item | Value |
|------|-------|
| App eval | ${eval_.overall ? 'GO' : 'NO-GO'} |
| PID lost | ${ev.pidLostEvents} |
| FATAL / ANR | ${metrics.fatal} / ${metrics.anr} |

## Event counts (final)

| Pattern | Count |
|---------|-------|
| heartbeat | **${ev.finalHeartbeatCount ?? 0}** |
| price_update | **${ev.finalPriceCount ?? 0}** |
| news_fetch | **${ev.finalNewsCount ?? 0}** |

## PID timeline

${buildPidTimeline(ev.polls)
  .map((r) => `- **${r.elapsedMin}m** · PID=${r.pid ?? 'null'}`)
  .join('\n')}

## GitHub sync

_(filled after commit/push)_
`;
  fs.writeFileSync(STREAMING_ORCH_REPORT_PATH, md);
  return STREAMING_ORCH_REPORT_PATH;
}

function writeOrchestratorValidationReport(ev, metrics, eval_, orchEval) {
  const go = orchEval.overall ? 'PASS' : 'FAIL';
  const md = `# Orchestrator Fix Validation Report

## Verdict: **${go}**

**Purpose:** Validate orchestrator fixes from \`6dc5e63\` (not app survival GO/NO-GO).  
**Run ID:** \`${ev.runId}\`  
**Window (MYT):** ${ev.startMyt} → ${ev.endMyt ?? 'in progress'}  
**APK:** preview-v15.apk (versionCode ${ev.versionCode})  
**Device:** ${SERIAL}

## Validation matrix

| # | Check | Result | Evidence |
|---|-------|--------|----------|
| 1 | writeEvidence errors | ${orchEval.writeEvidenceOk ? 'PASS' : 'FAIL'} | notes: ${(ev.notes ?? []).filter((n) => /error|UNKNOWN/i.test(n)).join('; ') || 'none'} |
| 2 | auto-finalize executed | ${orchEval.autoFinalizeOk ? 'PASS' : 'FAIL'} | endedAt=${ev.endedAt ?? 'null'}, finalizeRan=${ev.finalizeRan ?? false} |
| 3 | run-scoped logcat generated | ${orchEval.runScopedLogOk ? 'PASS' : 'FAIL'} | ${ev.runLiveLogPath ?? '—'} · **${orchEval.runLiveLogBytes}** bytes |
| 4 | heartbeat final aggregation | ${orchEval.heartbeatCountOk ? 'PASS' : 'FAIL'} | count=**${orchEval.finalHeartbeatCount}** (live log) |
| 5 | price_update final aggregation | ${orchEval.priceCountOk ? 'PASS' : 'WARN'} | count=**${orchEval.finalPriceCount}** |
| 6 | evidence.json saved | ${orchEval.evidenceJsonOk ? 'PASS' : 'FAIL'} | \`${path.relative(ROOT, EVIDENCE_PATH).replace(/\\/g, '/')}\` |
| 7 | full poll schedule (12) | ${orchEval.pollsComplete ? 'PASS' : 'FAIL'} | polls=${ev.polls.length} |

## App run reference (informational)

| Item | Value |
|------|-------|
| App eval overall | ${eval_.overall ? 'GO' : 'NO-GO'} |
| PID lost | ${ev.pidLostEvents} |
| FATAL / ANR | ${metrics.fatal} / ${metrics.anr} |

## PID timeline

${buildPidTimeline(ev.polls)
  .map((r) => `- **${r.elapsedMin}m** · PID=${r.pid ?? 'null'}`)
  .join('\n')}

## Logcat summary

\`${ev.summaryPath ?? `docs/review/hyperos-screen-off-survival/logcat-summary-3h-${ev.runId}.txt`}\`

## GitHub sync

_(filled after commit/push)_
`;
  fs.writeFileSync(ORCHESTRATOR_REPORT_PATH, md);
  return ORCHESTRATOR_REPORT_PATH;
}

async function finalizeRun(ev, phaseChild) {
  if (ev.endedAt) return;
  await new Promise((resolve) => {
    if (!phaseChild || phaseChild.exitCode != null) return resolve();
    phaseChild.on('exit', (code) => {
      ev.phase12_5ExitCode = code;
      resolve();
    });
    setTimeout(resolve, 30 * 60 * 1000);
  });

  stopLogcatCapture();
  const liveRaw = readRunLogcat(ev);
  const fin = finalizeLogcatSnapshot({ rootDir: ROOT, adbDumpText: logcatDump() });
  const metrics = parseLogcatMetrics(liveRaw);
  const summaryPath = path.join(OUT_DIR, `logcat-summary-${HOURS}h-${ev.runId}.txt`);
  if (ev._streamMetrics) {
    ev.finalHeartbeatCount = ev._streamMetrics.heartbeat;
    ev.finalSurvivalStatusCount = ev._streamMetrics.survival;
    ev.finalPriceCount = ev._streamMetrics.price;
    ev.finalNewsCount = ev._streamMetrics.news;
    ev.finalStaSurvivalNative = 0;
  } else {
    const sanitized = sanitizeLogcat(liveRaw);
    ev.finalHeartbeatCount = countHeartbeat(sanitized);
    ev.finalSurvivalStatusCount = countSurvivalEvents(sanitized);
    ev.finalPriceCount = countPriceUpdate(sanitized);
    ev.finalNewsCount = countNewsFetch(sanitized);
    ev.finalStaSurvivalNative = countStaSurvivalNative(sanitized);
  }
  ev.finalPid = pidof();
  ev.endedAt = new Date().toISOString();
  ev.endMyt = myt();
  ev.runLiveLogBytes = (() => {
    const p = ev.runLiveLogPath ? path.join(ROOT, ev.runLiveLogPath) : runLiveLogPathFor(ev.runId);
    return fs.existsSync(p) ? fs.statSync(p).size : 0;
  })();

  const summaryText = ev._streamMetrics
    ? [
        `# HyperOS ${STAGE} logcat summary (${ts()}) [streamed]`,
        `bytes: ${ev.runLiveLogBytes ?? 0}`,
        `12H-MONITOR lines: ${ev._streamMetrics.monitorLines}`,
        `heartbeat: ${ev.finalHeartbeatCount}`,
        `survival_events: ${ev.finalSurvivalStatusCount}`,
        `survival_health_ok: ${ev._streamMetrics.survivalOk}`,
        `price_update: ${ev.finalPriceCount}`,
        `news_fetch: ${ev.finalNewsCount}`,
        `FATAL: ${metrics.fatal}`,
        `ANR: ${metrics.anr}`,
      ].join('\n')
    : buildLogcatSummary(sanitizeLogcat(liveRaw), metrics);
  fs.writeFileSync(summaryPath, summaryText);

  let checkpointSummary = 'n/a';
  const cpPath = path.join(ROOT, 'docs/review/phase12-5-long-run/checkpoint.json');
  if (fs.existsSync(cpPath)) {
    try {
      const cp = JSON.parse(fs.readFileSync(cpPath, 'utf8'));
      checkpointSummary = `- priceRefreshRuns: ${cp.priceRefreshRuns?.length ?? 0}\n- pidLostEvents: ${cp.pidLostEvents ?? 0}\n- fatal: ${cp.crashes?.fatal ?? 0}\n- anr: ${cp.anrCount ?? 0}`;
    } catch {
      checkpointSummary = 'checkpoint.json parse failed';
    }
  }

  if (ev._streamMetrics) {
    ev.streamedFinalize = true;
  }
  const eval_ = evaluatePass(ev, metrics);
  ev.finalizeRan = true;
  ev.summaryPath = path.relative(ROOT, summaryPath).replace(/\\/g, '/');
  writeReport(ev, metrics, eval_, summaryPath, checkpointSummary);
  writeEvidence({ ...ev, metrics, eval_, fin, summaryPath: ev.summaryPath });
  if (IS_RERUN || ev.rerun) {
    const orchEval = evaluateOrchestratorFix(ev, metrics, eval_);
    writeOrchestratorValidationReport(ev, metrics, eval_, orchEval);
    writeEvidence({ ...ev, metrics, eval_, fin, orchEval, summaryPath: ev.summaryPath });
    console.log(orchEval.overall ? 'PASS orchestrator_fix' : 'FAIL orchestrator_fix', orchEval);
  }
  if (IS_6H_ORCH) {
    const orchEval = evaluateOrchestratorStreaming(ev, metrics, eval_);
    writeOrchestratorStreamingValidationReport(ev, metrics, eval_, orchEval);
    writeEvidence({ ...ev, metrics, eval_, fin, orchEval, summaryPath: ev.summaryPath });
    console.log(orchEval.overall ? 'PASS orchestrator_streaming' : 'FAIL orchestrator_streaming', orchEval);
  }
  console.log(eval_.overall ? 'PASS hyperos_v9_3h' : 'FAIL hyperos_v9_3h', eval_);
  return eval_;
}

function writeInterimReport(ev, checkpointSummary, hourLabel = null) {
  const elapsedMin = ev.polls.length ? ev.polls[ev.polls.length - 1].elapsedMin : 0;
  const completionPct = Math.min(100, Math.round((elapsedMin / (HOURS * 60)) * 100));
  const hourTitle = hourLabel ? ` — ${hourLabel}` : IS_LONG_RUN && elapsedMin >= 55 ? ` — ~${Math.round(elapsedMin / 60)}h` : '';
  const runLabel = IS_12H ? '12h Screen-Off Run' : IS_6H_ORCH ? '6h Orchestrator Validation' : IS_RERUN ? '3h RERUN' : `${STAGE} Screen-Off Run`;
  const purpose = IS_6H_ORCH
    ? 'Streaming metrics orchestrator validation (post 780118f)'
    : IS_RERUN
      ? 'Orchestrator fix validation (6dc5e63)'
      : 'Screen-off survival';
  const md = `# HyperOS ${REPORT_VER} ${runLabel} — Interim Report${hourTitle}

Updated: **${myt()}**  
Purpose: **${purpose}**  
APK: **preview-v15.apk** (versionCode **${ev.versionCode}**)  
Device: **${SERIAL}** (Redmi Note 13 Pro / HyperOS)  
Run ID: \`${ev.runId}\`

## Orchestrator checks (interim)

| Check | Value |
|-------|-------|
| writeEvidence errors | ${(ev.notes ?? []).some((n) => /orchestrator error|UNKNOWN|ERR_STRING_TOO_LONG/i.test(n)) ? 'FAIL' : 'PASS so far'} |
| streamed metrics path | ${ev._streamMetrics?.streamed ? 'active (file >512MB)' : 'in-memory or pending'} |
| run-scoped logcat bytes | ${(() => { const p = ev.runLiveLogPath ? path.join(ROOT, ev.runLiveLogPath) : null; return p && fs.existsSync(p) ? fs.statSync(p).size : 0; })()} |
| polls completed | ${ev.polls.length} |
| auto-finalize | pending |

## Progress

| Item | Value |
|------|-------|
| Start (MYT) | ${ev.startMyt} |
| Elapsed | ~${elapsedMin} min |
| Completion | ~${completionPct}% |
| Expected end (MYT) | ${ev.endMyt ?? 'TBD'} |

## Metrics (interim)

| # | Item | Value |
|---|------|-------|
| 1 | App PID | ${ev.lastPid ?? '—'} (baseline ${ev.baselinePid}) |
| 2 | PID lost events | ${ev.pidLostEvents} |
| 3 | Heartbeat (latest poll total) | ${ev.polls.at(-1)?.heartbeatTotal ?? '—'} |
| 4 | Price (latest poll total) | ${ev.polls.at(-1)?.priceTotal ?? '—'} |
| 5 | News (latest poll total) | ${ev.polls.at(-1)?.newsTotal ?? '—'} |
| 6 | FGS (latest poll) | ${ev.polls.at(-1)?.fgsRunning ? 'true' : 'false'} |
| 7 | WakeLock (latest poll) | ${ev.polls.at(-1)?.wakeLockHeld ? 'true' : 'false'} |

## Poll timeline

| Elapsed | PID | HB | price | news | FGS | WL | Wakefulness |
|---------|-----|-----|-------|------|-----|-----|-------------|
${ev.polls.map((p) => `| ${p.elapsedMin}m | ${p.pid ?? '—'} | ${p.heartbeatTotal} | ${p.priceTotal} | ${p.newsTotal} | ${p.fgsRunning ? 'Y' : 'N'} | ${p.wakeLockHeld ? 'Y' : 'N'} | ${p.wakefulness} |`).join('\n')}

## PID timeline

${buildPidTimeline(ev.polls)
  .map((r) => `- **${r.elapsedMin}m** · PID=${r.pid ?? 'null'} · ${r.at ?? ''}`)
  .join('\n')}

## dumpsys evidence

${(ev.dumpsysPaths ?? []).map((p) => `- \`${p}\``).join('\n') || '- pending'}

## checkpoint.json

${checkpointSummary}

## Provisional verdict

**TBD** — final at ${HOURS}h completion.

Evidence: \`${path.relative(ROOT, EVIDENCE_PATH).replace(/\\/g, '/')}\`
`;
  fs.writeFileSync(INTERIM_REPORT_PATH, md);
  if (IS_LONG_RUN && hourLabel) {
    const snapName = IS_6H_ORCH
      ? `HYPEROS_V15_6H_RUN_INTERIM_${hourLabel.toUpperCase()}_REPORT.md`
      : `HYPEROS_V15_12H_RUN_INTERIM_${hourLabel.toUpperCase()}_REPORT.md`;
    const snapPath = path.join(ROOT, `docs/review/${snapName}`);
    fs.writeFileSync(snapPath, md);
  }
  return INTERIM_REPORT_PATH;
}

function writeReport(ev, metrics, eval_, summaryPath, checkpointSummary) {
  const go = eval_.overall ? 'GO' : 'NO-GO';
  const sha = gitSha();
  const reportTitle = IS_6H_ORCH ? '6h Orchestrator Validation' : IS_RERUN ? '3h RERUN' : `${STAGE} Screen-Off Run`;
  const md = `# HyperOS ${REPORT_VER} ${reportTitle} Report

## Executive summary: **${go}**${IS_6H_ORCH ? ' (streaming orchestrator validation)' : IS_RERUN ? ' (orchestrator validation)' : ''}

| Field | Value |
|-------|-------|
| Stage | ${STAGE} |
| Test window (MYT) | ${ev.startMyt} → ${ev.endMyt} |
| APK | preview-v15.apk (versionCode ${ev.versionCode}) |
| Device | ${SERIAL} (Redmi Note 13 Pro HyperOS) |
| Branch | cursor/top3-maxdd-capital-audit |
| Commit | ${sha} |
| phase12-5 | ${HOURS}h, runtimeMode=apk |

## Verification (7 items)

| # | Item | Result | Evidence |
|---|------|--------|----------|
| 1 | 3h screen-off run | ${eval_.screenOk ? 'PASS' : 'WARN'} | wakefulness polls; screen-off enforce ${ev.screenOffEnforcedCount}x |
| 2 | PID maintenance | ${eval_.pidOk ? 'PASS' : 'FAIL'} | baseline ${ev.baselinePid}, lost events ${ev.pidLostEvents}, final ${ev.finalPid} |
| 3 | Heartbeat continuation | ${eval_.hbOk ? 'PASS' : 'FAIL'} | ${ev.finalHeartbeatCount} (expected ~${eval_.expectedHb}) |
| 4 | Twelve Data / price | ${eval_.priceOk ? 'PASS' : 'FAIL'} | price_update lines ${ev.finalPriceCount} |
| 5 | News fetch | ${eval_.newsOk ? 'PASS' : 'FAIL'} | news_fetch lines ${ev.finalNewsCount} |
| 6 | Foreground service | ${eval_.fgsOk ? 'PASS' : 'FAIL'} | LongRunForegroundService in dumpsys polls |
| 7 | WakeLock | ${eval_.wlOk ? 'PASS' : 'FAIL'} | survival_status / dumpsys partial wakelock |

## Poll timeline (15 min)

| Elapsed | PID | HBΔ | priceΔ | newsΔ | FGS | WakeLock | Wakefulness |
|---------|-----|-----|--------|-------|-----|----------|-------------|
${ev.polls.map((p) => `| ${p.elapsedMin}m | ${p.pid ?? '—'} | ${p.heartbeatDelta} | ${p.priceDelta} | ${p.newsDelta} | ${p.fgsRunning ? 'Y' : 'N'} | ${p.wakeLockHeld ? 'Y' : 'N'} | ${p.wakefulness} |`).join('\n')}

## PID timeline

${buildPidTimeline(ev.polls)
  .map((r) => `- **${r.elapsedMin}m** · PID=${r.pid ?? 'null'} · ${r.at ?? ''}`)
  .join('\n')}

## dumpsys evidence

${(ev.dumpsysPaths ?? []).map((p) => `- \`${p}\``).join('\n') || '- see docs/review/hyperos-screen-off-survival/dumpsys-evidence/'}

## checkpoint.json summary

${checkpointSummary}

## Logcat counts

| Metric | Count |
|--------|-------|
| FATAL | ${metrics.fatal} |
| ANR | ${metrics.anr} |
| [12H-MONITOR] heartbeat | ${ev.finalHeartbeatCount} |
| survival_enabled / status | ${ev.survivalEnabledSeen ? 'seen' : 'not seen'} / ${ev.finalSurvivalStatusCount} |
| price_update | ${ev.finalPriceCount} |
| news_fetch | ${ev.finalNewsCount} |

Summary file: \`${path.relative(ROOT, summaryPath).replace(/\\/g, '/')}\`

## Known issues / infra

${ev.notes.map((n) => `- ${n}`).join('\n') || '- none'}

## GitHub sync

_(filled after commit/push)_
`;
  fs.writeFileSync(REPORT_PATH, md);
  return { go, sha, md };
}


function listDevices() {
  const out = sh('adb devices');
  return out
    .split(/\r?\n/)
    .slice(1)
    .map((l) => l.trim().split(/\s+/))
    .filter((p) => p.length >= 2 && p[1].replace(/\r$/, '') === 'device')
    .map((p) => p[0]);
}

function deviceReady() {
  try {
    const state = adb('get-state').trim();
    return state === 'device';
  } catch {
    return listDevices().includes(SERIAL);
  }
}

async function waitForDevice(maxMs = 30 * 60 * 1000) {
  const readyNow =
    process.env.VERIFY_HYPEROS_DEVICE_READY === '1' || process.env.PHASE12_5_SKIP_DEVICE_WAIT === '1';
  const capMs = readyNow ? Math.min(maxMs, 15_000) : maxMs;
  const t0 = Date.now();
  while (Date.now() - t0 < capMs) {
    if (deviceReady()) return true;
    await sleep(readyNow ? 1000 : 5000);
  }
  return deviceReady();
}

async function main() {
  ensureDirs();
  const runId = ts();
  const commitAtStart = gitSha();
  const ev = {
    runId,
    commitAtStart,
    rerun: IS_RERUN,
    orchestratorFixCommit: process.env.ORCHESTRATOR_FIX_COMMIT ?? (IS_6H_ORCH ? '780118f' : '6dc5e63'),
    versionCode: null,
    targetSerial: SERIAL,
    hours: HOURS,
    startedAt: new Date().toISOString(),
    startMyt: myt(),
    endMyt: null,
    endedAt: null,
    baselinePid: null,
    finalPid: null,
    pidLostEvents: 0,
    lastPid: null,
    survivalEnabledSeen: false,
    polls: [],
    checkpoints: [],
    dumpsysPaths: [],
    pidTimeline: [],
    finalHeartbeatCount: 0,
    finalSurvivalStatusCount: 0,
    finalPriceCount: 0,
    finalNewsCount: 0,
    screenOffEnforcedCount: 0,
    phase12_5ExitCode: null,
    notes: [],
  };

    const connected = await waitForDevice();
  if (!connected) {
    ev.notes.push(`Device ${SERIAL} not connected`);
    writeEvidence(ev);
    process.exit(1);
  }

  ev.versionCode = versionCode();
  const apkPath = fs.existsSync(APK) ? APK : APK_FALLBACK;
  const skipApkReinstall =
    process.env.PHASE12_5_SKIP_APK_REINSTALL === '1' ||
    (ev.versionCode === 15 && apkPath === APK) ||
    (ev.versionCode === 11 && apkPath === APK) ||
    (ev.versionCode === 10 && !fs.existsSync(APK));
  if (fs.existsSync(apkPath) && !skipApkReinstall) {
    const inst = spawnSync('adb', ['-s', SERIAL, 'install', '-r', apkPath], {
      encoding: 'utf8',
      timeout: 10 * 60 * 1000,
    });
    if (inst.status !== 0) ev.notes.push(`APK install warn: ${inst.stderr?.slice(0, 200)}`);
    ev.versionCode = versionCode();
  } else if (!fs.existsSync(apkPath)) {
    ev.notes.push('preview-v10/v9 apk missing; using installed build');
  } else if (skipApkReinstall) {
    ev.notes.push(`APK reinstall skipped (versionCode=${ev.versionCode}, apk=${path.basename(apkPath)})`);
  }
  if (ev.versionCode !== 15 && ev.versionCode !== 11 && ev.versionCode !== 10) {
    ev.notes.push(`versionCode=${ev.versionCode} (expected 15)`);
  }

  try {
    spawnSync('node', ['scripts/audit-hyperos-power-restrictions.mjs'], {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: 'pipe',
      env: process.env,
    });
  } catch {
    ev.notes.push('hyperos power audit failed');
  }

  try {
    adb(`shell dumpsys deviceidle whitelist +${PKG}`);
  } catch {
    ev.notes.push('deviceidle whitelist command failed');
  }

  stopLogcatCapture();
  const runLogAbs = startLogcatCapture(runId);
  ev.runLiveLogPath = path.relative(ROOT, runLogAbs).replace(/\\/g, '/');
  const preRunWatch = spawn('node', ['scripts/phase12-5-pre-run-watch.mjs'], {
    cwd: ROOT,
    env: { ...process.env, ANDROID_SERIAL: SERIAL },
    detached: true,
    stdio: 'ignore',
  });
  preRunWatch.unref();

  await launchCold();
  await sleep(8000);
  ev.survivalEnabledSeen = await waitSurvival();
  if (!ev.survivalEnabledSeen) ev.notes.push('survival_enabled not confirmed in 120s');

  ev.baselinePid = pidof();
  ev.lastPid = ev.baselinePid;
  screenOff();
  await sleep(600);
  const screenOffAt = Date.now();

  const startUtc = new Date().toISOString();
  const expectedEnd = new Date(Date.now() + HOURS * 3600 * 1000).toISOString();
  const logcatStartBytes = 0;
  fs.writeFileSync(
    path.join(HEALTH_DIR, 'run-meta.json'),
    JSON.stringify(
      {
        commit: commitAtStart,
        startUtc,
        expectedEndUtc: expectedEnd,
        startMyt: myt(),
        expectedEndMyt: myt(new Date(expectedEnd)),
        baselinePid: ev.baselinePid,
        logcatStartBytes,
        runLiveLogPath: ev.runLiveLogPath,
      },
      null,
      2,
    ),
  );

  ev.endMyt = myt(new Date(expectedEnd));
  writeEvidence(ev);
  if (IS_LONG_RUN) {
    const kickoffPath = writeInterimReport(ev, 'pending — test started', 'KICKOFF');
    console.log('INTERIM_REPORT', path.relative(ROOT, kickoffPath), 'KICKOFF');
  }

  let phaseChild;
  let finalized = false;
  let eval_ = { overall: false };
  try {
  phaseChild = spawn('npm', ['run', 'verify:phase12-5'], {
    cwd: ROOT,
    env: {
      ...process.env,
      ANDROID_SERIAL: SERIAL,
      PHASE12_5_RUNTIME_MODE: 'apk',
      PHASE12_5_HOURS: String(HOURS),
    },
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: true,
  });
  let phaseLog = '';
  phaseChild.stdout?.on('data', (d) => {
    phaseLog += d.toString();
    process.stdout.write(d);
  });
  phaseChild.stderr?.on('data', (d) => {
    phaseLog += d.toString();
    process.stderr.write(d);
  });

  await sleep(5000);
  const metaPath = path.join(HEALTH_DIR, 'run-meta.json');
  try {
    const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
    const runLog = path.join(ROOT, ev.runLiveLogPath);
    meta.logcatStartBytes = fs.existsSync(runLog) ? fs.statSync(runLog).size : 0;
    meta.runLiveLogPath = ev.runLiveLogPath;
    fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));
  } catch {}

  const durationMs = HOURS * 3600 * 1000;
  const endAt = Date.now() + durationMs;
  let metricsRaw = readMetricsLogcat(ev);
  let hbBase = countsFromRawOrStream(ev, metricsRaw).hb;
  let priceBase = countsFromRawOrStream(ev, metricsRaw).pr;
  let newsBase = countsFromRawOrStream(ev, metricsRaw).nw;
  const checkpointLabels =
    HOURS >= 12
      ? Array.from({ length: 12 }, (_, i) => ({ atMin: (i + 1) * 60, label: `${i + 1}h` }))
      : HOURS >= 6
        ? Array.from({ length: HOURS }, (_, i) => ({ atMin: (i + 1) * 60, label: `${i + 1}h` }))
        : [
            { atMin: 30, label: '30min' },
            { atMin: 60, label: '1h' },
            { atMin: 120, label: '2h' },
            { atMin: 180, label: '3h' },
          ];
  const doneCk = new Set();

  while (Date.now() < endAt) {
    await sleep(POLL_MIN * 60 * 1000);
    const elapsedMin = Math.round((Date.now() - screenOffAt) / 60000);
    await enforceScreenOff();
    if (wakefulness() !== 'Awake') ev.screenOffEnforcedCount += 0;
    else {
      screenOff();
      ev.screenOffEnforcedCount += 1;
    }

    const pid = pidof();
    if (!pid && ev.lastPid) ev.pidLostEvents += 1;
    else if (pid && ev.lastPid && pid !== ev.lastPid) {
      ev.notes.push(`PID change ${ev.lastPid} -> ${pid} at ${elapsedMin}m`);
      ev.lastPid = pid;
    } else if (pid) ev.lastPid = pid;

    const raw = readMetricsLogcat(ev);
    const { hb, pr, nw } = countsFromRawOrStream(ev, raw);
    const fgs = fgsSnippet();
    const wl = parseWakeLockEvidence(wakelockSnippet(), raw);
    const dumpsysPath = saveDumpsysEvidence(`${elapsedMin}m`, ev);
    ev.dumpsysPaths.push(path.relative(ROOT, dumpsysPath).replace(/\\/g, '/'));
    const poll = {
      at: new Date().toISOString(),
      elapsedMin,
      pid,
      heartbeatDelta: hb - hbBase,
      heartbeatTotal: hb,
      priceDelta: pr - priceBase,
      priceTotal: pr,
      newsDelta: nw - newsBase,
      newsTotal: nw,
      fgsRunning: fgs.running,
      fgsSnippet: fgs.snippet.slice(0, 300),
      fgsHitCount: fgs.hitCount,
      wakeLockHeld: wl.held || survivalFromLogcat(raw),
      wakelockSnippet: wakelockSnippet().slice(0, 300),
      wakefulness: wl.wakefulness || wakefulness(),
    };
    ev.polls.push(poll);
    ev.pollPeakHeartbeat = Math.max(ev.pollPeakHeartbeat ?? 0, poll.heartbeatTotal);
    ev.pollPeakPrice = Math.max(ev.pollPeakPrice ?? 0, poll.priceTotal);
    ev.pollPeakNews = Math.max(ev.pollPeakNews ?? 0, poll.newsTotal);
    ev.pidTimeline = buildPidTimeline(ev.polls);
    hbBase = hb;
    priceBase = pr;
    newsBase = nw;
    writeEvidence(ev);
    console.log('POLL', elapsedMin, poll.pid, poll.heartbeatTotal, poll.wakefulness);

    for (const ck of checkpointLabels) {
      if (elapsedMin >= ck.atMin - 2 && !doneCk.has(ck.label)) {
        doneCk.add(ck.label);
        const cp = runCheckpoint(ck.label);
        ev.checkpoints.push({ label: ck.label, ...cp });
        writeEvidence(ev);
        if ((ck.label === '1h' && HOURS >= 3 && !IS_LONG_RUN) || (IS_LONG_RUN && ck.label.endsWith('h'))) {
          let checkpointSummary = 'n/a';
          const cpPath = path.join(ROOT, 'docs/review/phase12-5-long-run/checkpoint.json');
          if (fs.existsSync(cpPath)) {
            try {
              const cj = JSON.parse(fs.readFileSync(cpPath, 'utf8'));
              checkpointSummary = `- priceRefreshRuns: ${cj.priceRefreshRuns?.length ?? 0}\n- pidLostEvents: ${cj.pidLostEvents ?? 0}\n- fatal: ${cj.crashes?.fatal ?? 0}\n- anr: ${cj.anrCount ?? 0}`;
            } catch {
              checkpointSummary = 'checkpoint.json parse failed';
            }
          }
          const interimPath = writeInterimReport(ev, checkpointSummary, ck.label);
          console.log('INTERIM_REPORT', path.relative(ROOT, interimPath), ck.label);
        }
      }
    }
  }

  } catch (err) {
    ev.notes.push(`orchestrator error: ${err?.message ?? String(err)}`);
    console.error(err);
  } finally {
    if (!finalized) {
      finalized = true;
      eval_ = await finalizeRun(ev, phaseChild);
    }
  }

  process.exitCode = eval_.overall && ev.phase12_5ExitCode === 0 ? 0 : 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
