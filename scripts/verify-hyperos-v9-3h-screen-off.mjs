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
} from './lib/hyperos-monitor-metrics.mjs';
import { writeJsonAtomicSync } from './lib/hyperos-evidence-io.mjs';

const ROOT = process.cwd();
const PKG = 'com.assistant.stocktrading';
const SERIAL = process.env.ANDROID_SERIAL ?? process.env.ADB_SERIAL ?? 'FYRWXSNNAIOR9DCM';
const HOURS = Number(process.env.PHASE12_5_HOURS ?? process.env.VERIFY_HYPEROS_HOURS ?? '3');
const STAGE = process.env.VERIFY_HYPEROS_STAGE ?? `${HOURS}h`;
const REPORT_VER = process.env.VERIFY_HYPEROS_REPORT_VER ?? 'V15';
const POLL_MIN = 15;
const APK = path.join(ROOT, 'artifacts/preview-v15.apk');
const APK_FALLBACK = path.join(ROOT, 'artifacts/preview-v11.apk');
const TWELVE_DIR = path.join(ROOT, 'docs/review/twelve-hour-test');
const OUT_DIR = path.join(ROOT, 'docs/review/hyperos-screen-off-survival');
const HEALTH_DIR = path.join(ROOT, 'docs/review/phase12-5-v8-3h-health');
const CHECKPOINT_PS = path.join(TWELVE_DIR, 'phase12-5-v8-3h-checkpoint-once.ps1');
const LIVE_LOG = path.join(ROOT, DEFAULT_LIVE_LOGCAT);
const EVIDENCE_PATH = path.join(OUT_DIR, `hyperos-v15-${STAGE}-evidence.json`);
const REPORT_PATH = path.join(ROOT, `docs/review/HYPEROS_${REPORT_VER}_${STAGE.toUpperCase()}_SCREEN_OFF_RUN_REPORT.md`);
const INTERIM_REPORT_PATH = path.join(
  ROOT,
  `docs/review/HYPEROS_${REPORT_VER}_${STAGE.toUpperCase()}_SCREEN_OFF_RUN_INTERIM_REPORT.md`,
);
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

function startLogcatCapture(runId) {
  const runLog = runLiveLogPathFor(runId);
  fs.writeFileSync(runLog, '', 'utf8');
  const lp = runLog.replace(/\\/g, '/');
  const child = spawn(
    'powershell',
    [
      '-NoProfile',
      '-Command',
      `adb -s ${SERIAL} logcat -v threadtime 2>&1 | ForEach-Object { $_ | Out-File -FilePath '${lp}' -Append -Encoding utf8 }`,
    ],
    { detached: true, stdio: 'ignore', cwd: ROOT },
  );
  child.unref();
  fs.writeFileSync(path.join(TWELVE_DIR, 'adb-logcat-live.pid'), String(child.pid));
  return runLog;
}

function readRunLogcat(ev) {
  const rel = ev.runLiveLogPath;
  const p = rel ? path.join(ROOT, rel) : runLiveLogPathFor(ev.runId);
  if (fs.existsSync(p) && fs.statSync(p).size > 0) {
    return fs.readFileSync(p, 'utf8');
  }
  return logcatDump();
}

function stopLogcatCapture() {
  const pidFile = path.join(TWELVE_DIR, 'adb-logcat-live.pid');
  if (!fs.existsSync(pidFile)) return;
  const pid = Number(fs.readFileSync(pidFile, 'utf8').trim());
  if (pid) {
    spawnSync('taskkill', ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore' });
  }
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
  const expectedHb = Math.floor((HOURS * 60) / 5) - 2;
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
  ev.runLiveLogBytes = (() => {
    const p = ev.runLiveLogPath ? path.join(ROOT, ev.runLiveLogPath) : runLiveLogPathFor(ev.runId);
    return fs.existsSync(p) ? fs.statSync(p).size : 0;
  })();

  const summaryText = buildLogcatSummary(sanitized, metrics);
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

  const eval_ = evaluatePass(ev, metrics);
  writeReport(ev, metrics, eval_, summaryPath, checkpointSummary);
  writeEvidence({ ...ev, metrics, eval_, fin, summaryPath: path.relative(ROOT, summaryPath).replace(/\\/g, '/') });
  console.log(eval_.overall ? 'PASS hyperos_v9_3h' : 'FAIL hyperos_v9_3h', eval_);
  return eval_;
}

function writeInterimReport(ev, checkpointSummary) {
  const elapsedMin = ev.polls.length ? ev.polls[ev.polls.length - 1].elapsedMin : 0;
  const completionPct = Math.min(100, Math.round((elapsedMin / (HOURS * 60)) * 100));
  const md = `# HyperOS ${REPORT_VER} ${STAGE} Screen-Off Run — Interim Report (1h)

Updated: **${ev.endMyt ?? myt()}**  
APK: **preview-v15.apk** (versionCode **${ev.versionCode}**)  
Device: **${SERIAL}** (Redmi Note 13 Pro / HyperOS)  
Run ID: \`${ev.runId}\`

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
  return INTERIM_REPORT_PATH;
}

function writeReport(ev, metrics, eval_, summaryPath, checkpointSummary) {
  const go = eval_.overall ? 'GO' : 'NO-GO';
  const sha = gitSha();
  const md = `# HyperOS ${REPORT_VER} ${STAGE} Screen-Off Run Report

## Executive summary: **${go}**

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
  let hbBase = countHeartbeat(logcatDump());
  let priceBase = countPriceUpdate(logcatDump());
  let newsBase = countNewsFetch(logcatDump());
  const checkpointLabels = [
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

    const raw = logcatDump();
    const hb = countHeartbeat(raw);
    const pr = countPriceUpdate(raw);
    const nw = countNewsFetch(raw);
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
        if (ck.label === '1h' && HOURS >= 3) {
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
          const interimPath = writeInterimReport(ev, checkpointSummary);
          console.log('INTERIM_REPORT', path.relative(ROOT, interimPath));
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
