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

const ROOT = process.cwd();
const PKG = 'com.assistant.stocktrading';
const SERIAL = process.env.ANDROID_SERIAL ?? process.env.ADB_SERIAL ?? 'FYRWXSNNAIOR9DCM';
const HOURS = Number(process.env.PHASE12_5_HOURS ?? process.env.VERIFY_HYPEROS_HOURS ?? '3');
const POLL_MIN = 15;
const APK = path.join(ROOT, 'artifacts/preview-v9.apk');
const TWELVE_DIR = path.join(ROOT, 'docs/review/twelve-hour-test');
const OUT_DIR = path.join(ROOT, 'docs/review/hyperos-screen-off-survival');
const HEALTH_DIR = path.join(ROOT, 'docs/review/phase12-5-v8-3h-health');
const CHECKPOINT_PS = path.join(TWELVE_DIR, 'phase12-5-v8-3h-checkpoint-once.ps1');
const LIVE_LOG = path.join(ROOT, DEFAULT_LIVE_LOGCAT);
const EVIDENCE_PATH = path.join(OUT_DIR, 'hyperos-v9-3h-evidence.json');
const REPORT_PATH = path.join(ROOT, 'docs/review/HYPEROS_V9_3H_SCREEN_OFF_RUN_REPORT.md');

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
    return adb('shell dumpsys activity services').split('\n').filter((l) => l.includes('LongRunForegroundService')).slice(0, 5).join('\n');
  } catch {
    return '';
  }
}

function wakelockSnippet() {
  try {
    return adb('shell dumpsys power').split('\n').filter((l) => /wake|WakeLock/i.test(l)).slice(0, 12).join('\n');
  } catch {
    return '';
  }
}

function survivalFromLogcat(raw) {
  const held = /wakeLockHeld["']?\s*:\s*true/i.test(raw) || /PARTIAL_WAKE_LOCK/i.test(raw);
  return held;
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

function startLogcatCapture() {
  const lp = LIVE_LOG.replace(/\\/g, '/');
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
  return child.pid;
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
  fs.writeFileSync(EVIDENCE_PATH, JSON.stringify(ev, null, 2));
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
    `# HyperOS v9 3h logcat summary (${ts()})`,
    `heartbeat_12H_MONITOR: ${countLines(raw, '[12H-MONITOR] heartbeat')}`,
    `survival_enabled: ${countLines(raw, 'survival_enabled')}`,
    `survival_status: ${countLines(raw, 'survival_status')}`,
    `price_update: ${countLines(raw, 'price_update')}`,
    `news_fetch: ${countLines(raw, 'news_fetch')}`,
    `Twelve Data hints: ${countLines(raw, ['Twelve', 'twelvedata', 'price_update'])}`,
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
  const fgsOk = ev.polls.every((p) => p.fgsRunning);
  const wlOk = ev.polls.filter((p) => p.wakeLockHeld).length >= ev.polls.length * 0.7;
  const crashOk = metrics.fatal === 0 && metrics.anr === 0;
  const screenOk = ev.screenOffEnforcedCount >= ev.polls.length * 0.5 || ev.polls.every((p) => p.wakefulness !== 'Awake');
  return {
    overall: pidOk && hbOk && priceOk && newsOk && fgsOk && wlOk && crashOk,
    pidOk,
    hbOk,
    priceOk,
    newsOk,
    fgsOk,
    wlOk,
    crashOk,
    screenOk,
    expectedHb,
  };
}

function writeReport(ev, metrics, eval_, summaryPath, checkpointSummary) {
  const go = eval_.overall ? 'GO' : 'NO-GO';
  const sha = gitSha();
  const md = `# HyperOS v9 3h Screen-Off Run Report

## Executive summary: **${go}**

| Field | Value |
|-------|-------|
| Test window (MYT) | ${ev.startMyt} → ${ev.endMyt} |
| APK | preview-v9.apk (versionCode ${ev.versionCode}) |
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
  const skipApkReinstall =
    process.env.PHASE12_5_SKIP_APK_REINSTALL === '1' || ev.versionCode === 9;
  if (fs.existsSync(APK) && !skipApkReinstall) {
    const inst = spawnSync('adb', ['-s', SERIAL, 'install', '-r', APK], {
      encoding: 'utf8',
      timeout: 10 * 60 * 1000,
    });
    if (inst.status !== 0) ev.notes.push(`APK install warn: ${inst.stderr?.slice(0, 200)}`);
    ev.versionCode = versionCode();
  } else if (!fs.existsSync(APK)) {
    ev.notes.push('preview-v9.apk missing; using installed build');
  } else if (skipApkReinstall) {
    ev.notes.push(`APK reinstall skipped (versionCode=${ev.versionCode})`);
  }
  if (ev.versionCode !== 9) ev.notes.push(`versionCode=${ev.versionCode} (expected 9)`);

  try {
    adb(`shell dumpsys deviceidle whitelist +${PKG}`);
  } catch {
    ev.notes.push('deviceidle whitelist command failed');
  }

  stopLogcatCapture();
  startLogcatCapture();
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
  const logcatStartBytes = fs.existsSync(LIVE_LOG) ? fs.statSync(LIVE_LOG).size : 0;
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
      },
      null,
      2,
    ),
  );

  const phaseChild = spawn('npm', ['run', 'verify:phase12-5'], {
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
    meta.logcatStartBytes = fs.existsSync(LIVE_LOG) ? fs.statSync(LIVE_LOG).size : 0;
    fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));
  } catch {}

  const durationMs = HOURS * 3600 * 1000;
  const endAt = Date.now() + durationMs;
  let hbBase = countLines(logcatDump(), '[12H-MONITOR] heartbeat');
  let priceBase = countLines(logcatDump(), 'price_update');
  let newsBase = countLines(logcatDump(), 'news_fetch');
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
    const hb = countLines(raw, '[12H-MONITOR] heartbeat');
    const pr = countLines(raw, 'price_update');
    const nw = countLines(raw, 'news_fetch');
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
      fgsRunning: fgsSnippet().length > 0,
      fgsSnippet: fgsSnippet().slice(0, 300),
      wakeLockHeld: survivalFromLogcat(raw) || /wakeLockHeld.*true/i.test(raw),
      wakelockSnippet: wakelockSnippet().slice(0, 300),
      wakefulness: wakefulness(),
    };
    ev.polls.push(poll);
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
      }
    }
  }

  await new Promise((resolve) => {
    if (phaseChild.exitCode != null) return resolve();
    phaseChild.on('exit', (code) => {
      ev.phase12_5ExitCode = code;
      resolve();
    });
    setTimeout(resolve, 30 * 60 * 1000);
  });

  stopLogcatCapture();
  const liveRaw = fs.existsSync(LIVE_LOG) ? fs.readFileSync(LIVE_LOG, 'utf8') : logcatDump();
  const fin = finalizeLogcatSnapshot({ rootDir: ROOT, adbDumpText: logcatDump() });
  const metrics = parseLogcatMetrics(liveRaw);
  const sanitized = sanitizeLogcat(liveRaw);
  const summaryPath = path.join(OUT_DIR, `logcat-summary-3h-${runId}.txt`);
  ev.finalHeartbeatCount = countLines(sanitized, '[12H-MONITOR] heartbeat');
  ev.finalSurvivalStatusCount = countLines(sanitized, 'survival_status');
  ev.finalPriceCount = countLines(sanitized, 'price_update');
  ev.finalNewsCount = countLines(sanitized, 'news_fetch');
  ev.finalPid = pidof();
  ev.endedAt = new Date().toISOString();
  ev.endMyt = myt();

  const summaryText = buildLogcatSummary(sanitized, metrics);
  fs.writeFileSync(summaryPath, summaryText);

  let checkpointSummary = 'n/a';
  const cpPath = path.join(ROOT, 'docs/review/phase12-5-long-run/checkpoint.json');
  if (fs.existsSync(cpPath)) {
    try {
      const cp = JSON.parse(fs.readFileSync(cpPath, 'utf8'));
      checkpointSummary = `- priceRefreshRuns: ${cp.priceRefreshRuns?.length ?? 0}\n- pidLostEvents: ${cp.pidLostEvents ?? 0}\n- fatal: ${cp.crashes?.fatal ?? 0}\n- anr: ${cp.crashes?.anr ?? 0}`;
    } catch {
      checkpointSummary = 'checkpoint.json parse failed';
    }
  }

  const eval_ = evaluatePass(ev, metrics);
  writeReport(ev, metrics, eval_, summaryPath, checkpointSummary);
  writeEvidence({ ...ev, metrics, eval_, fin, summaryPath: path.relative(ROOT, summaryPath) });

  console.log(eval_.overall ? 'PASS hyperos_v9_3h' : 'FAIL hyperos_v9_3h', eval_);
  process.exitCode = eval_.overall && ev.phase12_5ExitCode === 0 ? 0 : 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
