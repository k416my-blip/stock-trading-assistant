/**
 * 5-minute process memory watch → logs/memory_watch_<timestamp>.jsonl
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { readNodeHeapStatsMb } from './oom-node-env.mjs';
import { collectSnapshot } from './devStatusCore.mjs';

export const DEFAULT_INTERVAL_MS = Number(process.env.MEMORY_WATCH_JSONL_MS ?? 5 * 60 * 1000);
export const LOGS_DIR = 'logs';

export function formatWatchTimestamp(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return (
    `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-` +
    `${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
  );
}

export const SESSION_MARKER = path.join(LOGS_DIR, '.memory_watch_session');

export function readMemoryWatchSessionFile(rootDir) {
  try {
    const raw = fs.readFileSync(path.join(rootDir, SESSION_MARKER), 'utf8').trim();
    return raw || null;
  } catch {
    return null;
  }
}

export function writeMemoryWatchSessionFile(rootDir, sessionId) {
  fs.mkdirSync(path.join(rootDir, LOGS_DIR), { recursive: true });
  fs.writeFileSync(path.join(rootDir, SESSION_MARKER), sessionId + '\n', 'utf8');
}

/** MEMORY_WATCH_SESSION env > logs/.memory_watch_session > prefix-timestamp */
export function resolveMemoryWatchSession(rootDir, { defaultPrefix = null, startDate = new Date() } = {}) {
  const fromEnv = process.env.MEMORY_WATCH_SESSION?.trim();
  if (fromEnv) return fromEnv;
  const fromFile = readMemoryWatchSessionFile(rootDir);
  if (fromFile) return fromFile;
  const ts = formatWatchTimestamp(startDate);
  return defaultPrefix ? `${defaultPrefix}-${ts}` : ts;
}

export function resolveWatchLogPath(rootDir, sessionTs = formatWatchTimestamp()) {
  return path.join(rootDir, LOGS_DIR, `memory_watch_${sessionTs}.jsonl`);
}

function probeAlive(namePattern) {
  try {
    if (process.platform === 'win32') {
      const out = execSync(
        `powershell -NoProfile -Command "Get-Process -ErrorAction SilentlyContinue | Where-Object { \$_.ProcessName -match '${namePattern}' } | Select-Object -First 1 -ExpandProperty Id"`,
        { encoding: 'utf8', windowsHide: true, maxBuffer: 1024 * 1024 },
      ).trim();
      return out ? { alive: true, pid: Number(out) } : { alive: false, pid: null };
    }
    const out = execSync(`pgrep -f "${namePattern}" | head -1`, { encoding: 'utf8' }).trim();
    return out ? { alive: true, pid: Number(out) } : { alive: false, pid: null };
  } catch {
    return { alive: false, pid: null };
  }
}

export function collectMemoryWatchEntry({ rootDir = process.cwd(), label = 'tick' } = {}) {
  const heap = readNodeHeapStatsMb();
  const snap = collectSnapshot();
  const metro = probeAlive('node|expo|metro|8081');
  const adb = probeAlive('^adb$');
  const runner = probeAlive('phase12-5-long-run|oom-smoke|device-smoke|vitest');
  return {
    timestamp: new Date().toISOString(),
    label,
    process: {
      name: 'node-runner',
      pid: process.pid,
      rssMb: heap.rssMb,
      heapUsedMb: heap.heapUsedMb,
      heapTotalMb: heap.heapTotalMb,
      externalMb: heap.externalMb,
    },
    system: snap.memory,
    cursorTotalMb: snap.cursorTotalMb,
    services: {
      metro: metro,
      adb: adb,
      runner: runner,
      adbLogcat: {
        alive: snap.processes?.adbLogcat?.running ?? false,
        pid: snap.processes?.adbLogcat?.pids?.[0] ?? null,
        mb: snap.processes?.adbLogcat?.totalMb ?? 0,
      },
    },
  };
}

export function appendMemoryWatchEntry(logPath, entry) {
  fs.mkdirSync(path.dirname(logPath), { recursive: true });
  fs.appendFileSync(logPath, JSON.stringify(entry) + '\n', 'utf8');
}
