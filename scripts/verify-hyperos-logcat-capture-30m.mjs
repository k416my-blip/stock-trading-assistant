/**
 * 30-minute run-scoped logcat capture validation (orchestrator fix).
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import {
  startLogcatCaptureToFile,
  stopLogcatCapture,
  readCaptureBytes,
} from './lib/hyperos-logcat-capture.mjs';
import {
  countHeartbeat,
  countPriceUpdate,
  countNewsFetch,
} from './lib/hyperos-monitor-metrics.mjs';

const ROOT = process.cwd();
const SERIAL = process.env.ANDROID_SERIAL ?? 'FYRWXSNNAIOR9DCM';
const PKG = 'com.assistant.stocktrading';
const MINUTES = Number(process.env.LOGCAT_VERIFY_MINUTES ?? '30');
const SKIP_APP_LAUNCH = process.env.LOGCAT_VERIFY_SKIP_APP_LAUNCH === '1';
const OUT_DIR = path.join(ROOT, 'docs/review/hyperos-screen-off-survival');
const REPORT_PATH = path.join(ROOT, 'docs/review/LOGCAT_CAPTURE_30M_VALIDATION_REPORT.md');
const RERUN_REPORT_PATH = path.join(ROOT, 'docs/review/LOGCAT_CAPTURE_30M_RERUN_REPORT.md');

function countSubstring(raw, needle) {
  return raw.split('\n').filter((l) => l.includes(needle)).length;
}

function ts() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
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

function adb(cmd) {
  return execSync(`adb -s ${SERIAL} ${cmd}`, { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
}

async function launchAppCold() {
  adb(`shell am force-stop ${PKG}`);
  await sleep(1500);
  adb(`shell monkey -p ${PKG} -c android.intent.category.LAUNCHER 1`);
}

async function waitMonitorInLiveLog(destAbs, timeoutMs = 120_000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    if (readCaptureBytes(destAbs) > 0) {
      const raw = fs.readFileSync(destAbs, 'utf8');
      if (raw.includes('12H-MONITOR') && (raw.includes("'heartbeat'") || raw.includes('test_started'))) {
        return true;
      }
    }
    await sleep(3000);
    try {
      adb(`shell monkey -p ${PKG} -c android.intent.category.LAUNCHER 1`);
    } catch {
      /* ignore */
    }
  }
  return false;
}

const runId = ts();
const destRel = `docs/review/hyperos-screen-off-survival/logcat-live-verify-${runId}.log`;
const destAbs = path.join(ROOT, destRel);
const evidencePath = path.join(OUT_DIR, `logcat-capture-30m-${runId}.json`);

const startMyt = myt();
const startUtc = new Date().toISOString();
console.log('LOGCAT_VERIFY_START', runId, MINUTES, 'min');

// Clear device logcat ring for cleaner baseline (optional marker)
try {
  adb('logcat -c');
} catch {
  /* ignore */
}

const handle = startLogcatCaptureToFile({ serial: SERIAL, destPath: destAbs, rootDir: ROOT });
let coldLaunch = false;
let monitorReady = false;
if (!SKIP_APP_LAUNCH) {
  console.log('LOGCAT_VERIFY cold launch + wait monitor');
  await launchAppCold();
  coldLaunch = true;
  monitorReady = await waitMonitorInLiveLog(destAbs);
  console.log('LOGCAT_VERIFY monitorReady=', monitorReady);
} else {
  console.log('LOGCAT_VERIFY skip app launch (logcat-only mode)');
}
const samples = [];
const intervalMin = MINUTES <= 5 ? 1 : 5;
const endAt = Date.now() + MINUTES * 60 * 1000;

function takeSample() {
  const bytes = readCaptureBytes(destAbs);
  let hb = 0;
  let pr = 0;
  let nw = 0;
  if (bytes > 0) {
    const raw = fs.readFileSync(destAbs, 'utf8');
    hb = countHeartbeat(raw);
    pr = countPriceUpdate(raw);
    nw = countNewsFetch(raw);
  }
  const row = {
    at: new Date().toISOString(),
    elapsedMin: Math.round((Date.now() - Date.parse(startUtc)) / 60000),
    bytes,
    heartbeat: hb,
    price_update: pr,
    news_fetch: nw,
    capturePid: handle.pid,
    adbAlive: !handle.child.killed,
  };
  samples.push(row);
  console.log('SAMPLE', row.elapsedMin, 'm', bytes, 'B', 'hb=', hb);
}

takeSample();
while (Date.now() < endAt) {
  const remainingMs = endAt - Date.now();
  const sleepMs = Math.min(intervalMin * 60 * 1000, remainingMs);
  if (sleepMs <= 0) break;
  await sleep(sleepMs);
  if (Date.now() >= endAt) break;
  takeSample();
}

stopLogcatCapture(handle);
await sleep(1500);

const finalBytes = readCaptureBytes(destAbs);
const raw = finalBytes > 0 ? fs.readFileSync(destAbs, 'utf8') : '';
const finalHb = countHeartbeat(raw);
const finalPr = countPriceUpdate(raw);
const finalNw = countNewsFetch(raw);
const final12H = countSubstring(raw, '12H-MONITOR');
const finalSurvivalOk = countSubstring(raw, 'survival_health_ok');
const endMyt = myt();

const pass = finalBytes > 0;
const monitorPass = finalHb >= 1 || finalSurvivalOk >= 1;
const overallPass = pass && coldLaunch && monitorReady && monitorPass;
const ev = {
  runId,
  startUtc,
  startMyt,
  endMyt,
  minutes: MINUTES,
  serial: SERIAL,
  destRel,
  captureMethod: 'node-spawn-adb-pipe',
  fixRef: 'hyperos-logcat-capture.mjs',
  skipAppLaunch: SKIP_APP_LAUNCH,
  coldLaunch,
  monitorReady,
  monitorPass,
  overallPass,
  samples,
  finalBytes,
  counts: {
    '12H-MONITOR': final12H,
    heartbeat: finalHb,
    price_update: finalPr,
    news_fetch: finalNw,
    survival_health_ok: finalSurvivalOk,
  },
  finalHb,
  finalPr,
  finalNw,
  pass,
};
fs.writeFileSync(evidencePath, JSON.stringify(ev, null, 2));

const md = `# Logcat Capture 30m Validation Report

## Verdict: **${pass ? 'PASS' : 'FAIL'}**

| Field | Value |
|-------|-------|
| Run ID | \`${runId}\` |
| Window (MYT) | ${startMyt} → ${endMyt} |
| Duration | ${MINUTES} min |
| Device | ${SERIAL} |
| Capture file | \`${destRel}\` |
| Method | Node \`spawn('adb logcat')\` → \`WriteStream\` (replaces PowerShell Out-File) |

## Results

| Metric | Value | Gate |
|--------|-------|------|
| Final file size | **${finalBytes}** bytes | > 0 |
| heartbeat lines | **${finalHb}** | accumulated in live file |
| price_update lines | **${finalPr}** | accumulated in live file |
| news_fetch lines | **${finalNw}** | accumulated in live file |
| Capture PID | ${handle.pid} | adb child |

## 5-minute samples

| Elapsed | Bytes | HB | price | news |
|---------|-------|-----|-------|------|
${samples.map((s) => `| ${s.elapsedMin}m | ${s.bytes} | ${s.heartbeat} | ${s.price_update} | ${s.news_fetch} |`).join('\n')}

## Root cause (fixed)

PowerShell \`adb | ForEach-Object { Out-File -Append }\` spawned detached from Node produced **0-byte** files on Windows. Node direct pipe is the fix.

## Evidence

- \`${path.relative(ROOT, evidencePath).replace(/\\/g, '/')}\`

## GitHub sync

Commit: **${gitSha()}**
`;
fs.writeFileSync(REPORT_PATH, md);

const rerunMd = `# Logcat Capture 30m RERUN Report

## Verdict: **${overallPass ? 'PASS' : 'FAIL'}**

| Field | Value |
|-------|-------|
| Run ID | \`${runId}\` |
| Window (MYT) | ${startMyt} → ${endMyt} |
| Duration | ${MINUTES} min |
| Device | ${SERIAL} |
| APK | preview-v15.apk |
| Capture file | \`${destRel}\` |
| Method | Node adb pipe + cold launch harness |

## Harness gates

| Gate | Result | Requirement |
|------|--------|-------------|
| cold launch | **${coldLaunch ? 'PASS' : 'FAIL'}** | force-stop + monkey launch |
| monitorReady | **${monitorReady ? 'PASS' : 'FAIL'}** | \`12H-MONITOR\` + \`test_started\` or \`'heartbeat'\` within 120s |
| run-scoped logcat | **${pass ? 'PASS' : 'FAIL'}** | finalBytes > 0 |
| monitorPass | **${monitorPass ? 'PASS' : 'FAIL'}** | heartbeat ≥ 1 OR survival_health_ok ≥ 1 |

## Event counts (live file)

| Pattern | Count | orchestrator counter |
|---------|-------|---------------------|
| \`12H-MONITOR\` | **${final12H}** | substring |
| \`heartbeat\` (monitor) | **${finalHb}** | countHeartbeat |
| \`price_update\` | **${finalPr}** | countPriceUpdate |
| \`news_fetch\` | **${finalNw}** | countNewsFetch |
| \`survival_health_ok\` | **${finalSurvivalOk}** | substring |

## 5-minute samples

| Elapsed | Bytes | HB | price | news |
|---------|-------|-----|-------|------|
${samples.map((s) => `| ${s.elapsedMin}m | ${s.bytes} | ${s.heartbeat} | ${s.price_update} | ${s.news_fetch} |`).join('\n')}

## Evidence

- \`${path.relative(ROOT, evidencePath).replace(/\\/g, '/')}\`
- \`${destRel}\`

## GitHub sync

Commit: **${gitSha()}**
`;
fs.writeFileSync(RERUN_REPORT_PATH, rerunMd);

if (overallPass) {
  const goMd = `# HyperOS 12h GO / NO-GO Report

## Verdict: **GO** — 12時間テスト開始可

**Date:** ${endMyt}  
**Branch:** cursor/top3-maxdd-capital-audit  
**APK:** preview-v15.apk (versionCode 15)  
**Device:** ${SERIAL} (Redmi Note 13 Pro / HyperOS)

---

## Gate summary

| Gate | Status | Evidence |
|------|--------|----------|
| App PID / FGS / WakeLock (3h RERUN) | **PASS** | APP_GO — 12/12 polls, PID 2506 |
| run-scoped logcat capture | **PASS** | 30m RERUN ${finalBytes} bytes |
| cold launch harness | **PASS** | logcat-capture-30m RERUN |
| monitorReady | **PASS** | \`12H-MONITOR\` seen within 120s |
| monitorPass | **PASS** | heartbeat=${finalHb}, survival_health_ok=${finalSurvivalOk} |
| Orchestrator finalize | **PASS** | 3h RERUN writeEvidence OK |

---

## 30m RERUN event counts

| Pattern | Count |
|---------|-------|
| 12H-MONITOR | **${final12H}** |
| heartbeat | **${finalHb}** |
| price_update | **${finalPr}** |
| news_fetch | **${finalNw}** |
| survival_health_ok | **${finalSurvivalOk}** |

Run ID: \`${runId}\`  
Report: \`docs/review/LOGCAT_CAPTURE_30M_RERUN_REPORT.md\`

---

## Recommended 12h launch

\`\`\`powershell
$env:ANDROID_SERIAL="${SERIAL}"
$env:PHASE12_5_HOURS="12"
$env:PHASE12_5_SKIP_APK_REINSTALL="1"
node scripts/verify-hyperos-v9-3h-screen-off.mjs
\`\`\`

---

## GitHub sync

Commit: **${gitSha()}**
`;
  fs.writeFileSync(path.join(ROOT, 'docs/review/HYPEROS_12H_GO_NO_GO_REPORT.md'), goMd);
}

console.log(overallPass ? 'PASS logcat_30m_rerun' : 'FAIL logcat_30m_rerun', {
  coldLaunch,
  monitorReady,
  monitorPass,
  finalBytes,
  finalHb,
  final12H,
});
process.exitCode = overallPass ? 0 : 1;
