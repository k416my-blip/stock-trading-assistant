#!/usr/bin/env node
/**
 * Phase12.5 lightweight pre-run watch — Node replacement for heavy PowerShell loop.
 *
 * Usage:
 *   node scripts/phase12-5-pre-run-watch.mjs
 *   PRE_RUN_WATCH_INTERVAL_MS=180000 node scripts/phase12-5-pre-run-watch.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { checkMetroListening } from './lib/phase12-5-metro-watchdog.mjs';

const ROOT = process.cwd();
const LOG_DIR = path.join(ROOT, 'docs/review/twelve-hour-test');
const LOG_PATH = path.join(LOG_DIR, 'pre-run-watch.log');
const HEARTBEAT_PATH = path.join(LOG_DIR, 'pre-run-watch-heartbeat.log');
const LOGCAT_PATH = path.join(LOG_DIR, 'adb-logcat-live.log');
const PKG = 'com.assistant.stocktrading';
const DEVICE_SERIAL = process.env.ANDROID_SERIAL ?? 'FYRWXSNNAIOR9DCM';
const INTERVAL_MS = Number(process.env.PRE_RUN_WATCH_INTERVAL_MS ?? '180000');
const ADB_TIMEOUT_MS = Number(process.env.PRE_RUN_WATCH_ADB_TIMEOUT_MS ?? '10000');

function shTimeout(cmd) {
  try {
    const result = spawnSync(cmd, {
      shell: true,
      encoding: 'utf8',
      timeout: ADB_TIMEOUT_MS,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    if (result.error) return '';
    return `${result.stdout ?? ''}${result.stderr ?? ''}`.trim();
  } catch {
    return '';
  }
}

function appendLine(filePath, line) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.appendFileSync(filePath, `${line}\n`, 'utf8');
}

function logcatStats() {
  if (!fs.existsSync(LOGCAT_PATH)) {
    return { size: 0, ageSec: -1 };
  }
  const stat = fs.statSync(LOGCAT_PATH);
  const ageSec = Math.floor((Date.now() - stat.mtimeMs) / 1000);
  return { size: stat.size, ageSec };
}

function readLogcatTailKb(maxBytes = 4096) {
  if (!fs.existsSync(LOGCAT_PATH)) return '';
  const stat = fs.statSync(LOGCAT_PATH);
  const start = Math.max(0, stat.size - maxBytes);
  const fd = fs.openSync(LOGCAT_PATH, 'r');
  const buf = Buffer.alloc(stat.size - start);
  fs.readSync(fd, buf, 0, buf.length, start);
  fs.closeSync(fd);
  return buf.toString('utf8');
}

function extractLastMonitor(tail, kind) {
  const re =
    kind === 'heartbeat'
      ? /(\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3}).*12H-MONITOR.*heartbeat/
      : /price_update[^\n]*(\d{4}-\d{2}-\d{2}T[\d:.]+Z)/;
  const matches = [...tail.matchAll(new RegExp(re.source, 'g'))];
  const m = matches.pop();
  if (!m) return 'none';
  return kind === 'heartbeat' ? m[1] : m[1];
}

async function tick(baselinePidRef) {
  const ts = new Date().toISOString();
  const adbOut = shTimeout('adb devices -l');
  const adbState =
    adbOut.includes(`${DEVICE_SERIAL}\tdevice`) || adbOut.includes(`${DEVICE_SERIAL} device`)
      ? 'device'
      : adbOut.includes(DEVICE_SERIAL)
        ? 'other'
        : 'missing';
  const appPid = shTimeout(`adb shell pidof ${PKG}`).split(/\s+/)[0] || 'none';
  if (baselinePidRef.value == null && appPid !== 'none') {
    baselinePidRef.value = appPid;
  }
  const metro = checkMetroListening({
    execSync: (cmd, opts) =>
      spawnSync(cmd, { shell: true, encoding: 'utf8', timeout: 5000, ...opts }).stdout?.toString?.() ?? '',
  });
  const battery = shTimeout('adb shell dumpsys battery')
    .split('\n')
    .filter((l) => /level:|status:/.test(l))
    .map((l) => l.trim())
    .join(' | ');
  const stay = shTimeout('adb shell settings get global stay_on_while_plugged_in') || '?';
  const { size: logcatSize, ageSec: logcatAgeSec } = logcatStats();
  const tail = readLogcatTailKb();
  const lastHb = extractLastMonitor(tail, 'heartbeat');
  const lastPrice = extractLastMonitor(tail, 'price_update');
  const alerts = [];
  if (metro.listening !== true) alerts.push('WARN:metro');
  if (adbState !== 'device') alerts.push('WARN:adb');
  if (appPid !== 'none' && baselinePidRef.value && appPid !== baselinePidRef.value) {
    alerts.push('INVALID:pid_change');
  }
  if (logcatAgeSec > 600) alerts.push('WARN:logcat_stale');
  const alertStr = alerts.length ? ` | ALERTS=${alerts.join(',')}` : '';
  const line = `[${ts}] adb=${adbState} | appPid=${appPid} | baselinePid=${baselinePidRef.value ?? 'pending'} | metro=${metro.listening ? 'LISTENING' : 'NOT_LISTENING'} | battery=${battery || 'n/a'} | stay=${stay} | logcatSize=${logcatSize} | logcatAgeSec=${logcatAgeSec} | lastHb=${lastHb} | lastPrice=${lastPrice}${alertStr}`;
  appendLine(LOG_PATH, line);
  appendLine(HEARTBEAT_PATH, `[${ts}] watch_alive intervalMs=${INTERVAL_MS}`);
  return line;
}

async function main() {
  fs.mkdirSync(LOG_DIR, { recursive: true });
  const head = shTimeout('git rev-parse --short HEAD') || 'unknown';
  appendLine(
    LOG_PATH,
    `--- pre-run-watch NODE started ${new Date().toISOString()} HEAD=${head} intervalMs=${INTERVAL_MS} ---`,
  );
  appendLine(HEARTBEAT_PATH, `[${new Date().toISOString()}] watch_started`);
  const baselinePidRef = { value: null };
  while (true) {
    try {
      await tick(baselinePidRef);
    } catch (err) {
      appendLine(HEARTBEAT_PATH, `[${new Date().toISOString()}] tick_error ${err?.message ?? err}`);
    }
    await sleep(INTERVAL_MS);
  }
}

main().catch((err) => {
  appendLine(HEARTBEAT_PATH, `[${new Date().toISOString()}] fatal ${err?.message ?? err}`);
  process.exit(1);
});
