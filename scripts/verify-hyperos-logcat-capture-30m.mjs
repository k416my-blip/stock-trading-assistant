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
let monitorReady = false;
if (!SKIP_APP_LAUNCH) {
  console.log('LOGCAT_VERIFY launch app + wait monitor');
  await launchAppCold();
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
const endMyt = myt();

const pass = finalBytes > 0;
const monitorPass = finalHb >= 1 || raw.includes('survival_health_ok');
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
  monitorReady,
  samples,
  finalBytes,
  finalHb,
  finalPr,
  finalNw,
  pass,
  monitorPass,
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
console.log(pass ? 'PASS logcat_30m' : 'FAIL logcat_30m', { finalBytes, finalHb, finalPr });
process.exitCode = pass ? 0 : 1;
