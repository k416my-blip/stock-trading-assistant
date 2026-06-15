/**
 * HyperOS screen-off survival verification (16 min default).
 *
 * Usage:
 *   node scripts/verify-hyperos-screen-off-survival.mjs
 *   VERIFY_HYPEROS_MINUTES=2 node scripts/verify-hyperos-screen-off-survival.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync, spawnSync } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

const ROOT = process.cwd();
const PKG = 'com.assistant.stocktrading';
const TARGET_SERIAL = process.env.ADB_SERIAL ?? 'FYRWXSNNAIOR9DCM';
const WAIT_MINUTES = Number(process.env.VERIFY_HYPEROS_MINUTES ?? '16');
const POLL_MINUTES = 2;
const OUT_DIR = path.join(ROOT, 'docs/review/hyperos-screen-off-survival');
const APK_CANDIDATES = [
  path.join(ROOT, 'artifacts/preview-v9.apk'),
  path.join(ROOT, 'artifacts/preview-v8.apk'),
];

function sh(cmd, opts = {}) {
  return execSync(cmd, {
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
    maxBuffer: 40 * 1024 * 1024,
    ...opts,
  }).trim();
}

function ts() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

function ensureOut() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

function adb(cmd) {
  return sh(`adb -s ${TARGET_SERIAL} ${cmd}`);
}

function listDevices() {
  const out = sh('adb devices');
  return out
    .split('\n')
    .slice(1)
    .map((l) => l.trim().split(/\s+/))
    .filter((p) => p[1] === 'device')
    .map((p) => p[0]);
}

function pidof() {
  try {
    const out = adb(`shell pidof ${PKG}`);
    const pid = out.split(/\s+/).filter(Boolean)[0];
    return pid || null;
  } catch {
    return null;
  }
}

function logcatSince(tagFilter, sinceMs = 0) {
  try {
    const raw = adb('logcat -d -v time');
    return raw
      .split('\n')
      .filter((l) => l.includes(tagFilter))
      .filter((l) => {
        if (!sinceMs) return true;
        const m = l.match(/^(\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3})/);
        if (!m) return true;
        const year = new Date().getFullYear();
        const t = Date.parse(`${year}-${m[1].replace(' ', 'T')}`);
        return Number.isFinite(t) ? t >= sinceMs : true;
      });
  } catch {
    return [];
  }
}

function hasNetworkActivity(lines) {
  const hints = ['fetch', 'http', 'price_update', 'news_fetch', 'okhttp', 'ReactNativeJS'];
  return lines.some((l) => hints.some((h) => l.toLowerCase().includes(h.toLowerCase())));
}

function findApk() {
  for (const p of APK_CANDIDATES) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function installApk(apkPath) {
  console.log('INSTALL', apkPath);
  const r = spawnSync('adb', ['-s', TARGET_SERIAL, 'install', '-r', apkPath], {
    encoding: 'utf8',
    stdio: 'pipe',
  });
  return { ok: r.status === 0, stdout: r.stdout, stderr: r.stderr };
}

function launchApp() {
  adb(`shell monkey -p ${PKG} -c android.intent.category.LAUNCHER 1`);
}

function screenOff() {
  adb('shell input keyevent KEYCODE_POWER');
  sleep(500).then(() => adb('shell input keyevent KEYCODE_POWER')).catch(() => {});
}

async function waitForSurvivalEnabled(timeoutMs = 120_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const lines = logcatSince('survival_enabled');
    if (lines.length > 0) return lines;
    await sleep(3000);
    launchApp();
  }
  return [];
}

async function main() {
  ensureOut();
  const runId = ts();
  const evidence = {
    runId,
    targetSerial: TARGET_SERIAL,
    waitMinutes: WAIT_MINUTES,
    startedAt: new Date().toISOString(),
    deviceConnected: false,
    apkInstalled: false,
    apkPath: null,
    baselinePid: null,
    finalPid: null,
    pidStable: false,
    survivalEnabledSeen: false,
    heartbeatCount: 0,
    survivalStatusCount: 0,
    networkActivitySeen: false,
    polls: [],
    pass: false,
    notes: [],
  };

  const devices = listDevices();
  if (!devices.includes(TARGET_SERIAL)) {
    evidence.notes.push(`Device ${TARGET_SERIAL} not connected. Found: ${devices.join(', ') || 'none'}`);
    fs.writeFileSync(path.join(OUT_DIR, `result-${runId}.json`), JSON.stringify(evidence, null, 2));
    console.log('FAIL device_not_connected', evidence.notes[0]);
    process.exitCode = 1;
    return;
  }
  evidence.deviceConnected = true;

  const apk = findApk();
  if (apk) {
    evidence.apkPath = apk;
    const inst = installApk(apk);
    evidence.apkInstalled = inst.ok;
    if (!inst.ok) {
      evidence.notes.push(`APK install failed: ${inst.stderr || inst.stdout}`);
    }
  } else {
    evidence.notes.push('No preview-v9.apk found — using existing install; rebuild required for native survival');
  }

  adb('logcat -c');
  launchApp();
  await sleep(8000);

  const survivalLines = await waitForSurvivalEnabled();
  evidence.survivalEnabledSeen = survivalLines.length > 0;
  if (!evidence.survivalEnabledSeen) {
    const monitorLines = logcatSince('12H-MONITOR');
    evidence.survivalEnabledSeen = monitorLines.some((l) => l.includes('test_started'));
    if (!evidence.survivalEnabledSeen) {
      evidence.notes.push('survival_enabled not seen — app may lack v9 native module build');
    }
  }

  evidence.baselinePid = pidof();
  fs.writeFileSync(path.join(OUT_DIR, `baseline-${runId}.txt`), `pid=${evidence.baselinePid}\n`);

  console.log('SCREEN_OFF baselinePid=', evidence.baselinePid);
  adb('shell input keyevent KEYCODE_POWER');
  await sleep(800);
  adb('shell input keyevent KEYCODE_POWER');

  const screenOffAt = Date.now();
  const totalPolls = Math.ceil(WAIT_MINUTES / POLL_MINUTES);

  for (let i = 1; i <= totalPolls; i++) {
    await sleep(POLL_MINUTES * 60 * 1000);
    const pid = pidof();
    const hb = logcatSince('heartbeat', screenOffAt);
    const surv = logcatSince('survival_status', screenOffAt);
    const netLines = logcatSince('ReactNativeJS', screenOffAt).filter(
      (l) => l.includes('price_update') || l.includes('news_fetch') || l.includes('fetch'),
    );
    const poll = {
      poll: i,
      elapsedMin: i * POLL_MINUTES,
      pid,
      heartbeatLines: hb.length,
      survivalStatusLines: surv.length,
      networkLines: netLines.length,
    };
    evidence.polls.push(poll);
    console.log('POLL', poll);
    fs.appendFileSync(
      path.join(OUT_DIR, `poll-${runId}.jsonl`),
      `${JSON.stringify(poll)}\n`,
    );
  }

  evidence.finalPid = pidof();
  evidence.pidStable = Boolean(
    evidence.baselinePid && evidence.finalPid && evidence.baselinePid === evidence.finalPid,
  );
  evidence.heartbeatCount = logcatSince('heartbeat', screenOffAt).length;
  evidence.survivalStatusCount = logcatSince('survival_status', screenOffAt).length;
  evidence.networkActivitySeen = hasNetworkActivity(logcatSince('ReactNativeJS', screenOffAt));

  const minHeartbeats = WAIT_MINUTES >= 15 ? 1 : 0;
  evidence.pass =
    evidence.deviceConnected &&
    evidence.pidStable &&
    evidence.networkActivitySeen &&
    (evidence.survivalStatusCount > 0 || evidence.survivalEnabledSeen) &&
    evidence.heartbeatCount >= minHeartbeats;

  evidence.endedAt = new Date().toISOString();
  fs.writeFileSync(path.join(OUT_DIR, `result-${runId}.json`), JSON.stringify(evidence, null, 2));
  fs.writeFileSync(
    path.join(OUT_DIR, `logcat-tail-${runId}.txt`),
    adb('logcat -d -t 400'),
  );

  console.log(evidence.pass ? 'PASS hyperos_screen_off_survival' : 'FAIL hyperos_screen_off_survival', evidence);
  process.exitCode = evidence.pass ? 0 : 1;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
