/**
 * Shared HyperOS long-run monitor logcat / dumpsys metrics.
 */
import fs from 'node:fs';

export function countMonitorEvent(raw, eventName) {
  const needle = `'${eventName}'`;
  return raw.split('\n').filter((l) => l.includes('12H-MONITOR') && l.includes(needle)).length;
}

/** Stream large log files without loading entire file into memory. */
export function countMonitorEventFromFile(filePath, eventName) {
  const needle = `'${eventName}'`;
  const tag = '12H-MONITOR';
  let count = 0;
  let buf = '';
  const fd = fs.openSync(filePath, 'r');
  const chunkSize = 1024 * 1024;
  const tmp = Buffer.alloc(chunkSize);
  try {
    let pos = 0;
    let n;
    while ((n = fs.readSync(fd, tmp, 0, chunkSize, pos)) > 0) {
      pos += n;
      buf += tmp.toString('utf8', 0, n);
      const lines = buf.split('\n');
      buf = lines.pop() ?? '';
      for (const l of lines) {
        if (l.includes(tag) && l.includes(needle)) count += 1;
      }
    }
    if (buf && buf.includes(tag) && buf.includes(needle)) count += 1;
  } finally {
    fs.closeSync(fd);
  }
  return count;
}

export function countSubstringFromFile(filePath, needle) {
  let count = 0;
  let buf = '';
  const fd = fs.openSync(filePath, 'r');
  const chunkSize = 1024 * 1024;
  const tmp = Buffer.alloc(chunkSize);
  try {
    let pos = 0;
    let n;
    while ((n = fs.readSync(fd, tmp, 0, chunkSize, pos)) > 0) {
      pos += n;
      buf += tmp.toString('utf8', 0, n);
      const lines = buf.split('\n');
      buf = lines.pop() ?? '';
      for (const l of lines) {
        if (l.includes(needle)) count += 1;
      }
    }
    if (buf && buf.includes(needle)) count += 1;
  } finally {
    fs.closeSync(fd);
  }
  return count;
}

export function readLogcatMetricsFromFile(filePath) {
  const MAX_BYTES = 512 * 1024 * 1024;
  const size = fs.statSync(filePath).size;
  if (size <= MAX_BYTES) {
    const raw = fs.readFileSync(filePath, 'utf8');
    return {
      raw,
      heartbeat: countHeartbeat(raw),
      price: countPriceUpdate(raw),
      news: countNewsFetch(raw),
      survival: countSurvivalEvents(raw),
      monitorLines: countSubstringFromFile(filePath, '12H-MONITOR'),
      survivalOk: countSubstringFromFile(filePath, 'survival_health_ok'),
      streamed: false,
    };
  }
  return {
    raw: null,
    heartbeat: countMonitorEventFromFile(filePath, 'heartbeat'),
    price: countMonitorEventFromFile(filePath, 'price_update'),
    news: countMonitorEventFromFile(filePath, 'news_fetch'),
    survival: countSubstringFromFile(filePath, 'survival_'),
    monitorLines: countSubstringFromFile(filePath, '12H-MONITOR'),
    survivalOk: countSubstringFromFile(filePath, 'survival_health_ok'),
    streamed: true,
  };
}

export function countHeartbeat(raw) {
  return countMonitorEvent(raw, 'heartbeat');
}

export function countPriceUpdate(raw) {
  return countMonitorEvent(raw, 'price_update');
}

export function countNewsFetch(raw) {
  return countMonitorEvent(raw, 'news_fetch');
}

export function countSurvivalEvents(raw) {
  return raw.split('\n').filter((l) => /survival_(enabled|status|repaired|health_)/.test(l)).length;
}

export function countStaSurvivalNative(raw) {
  return raw.split('\n').filter((l) => l.includes('STA-SURVIVAL')).length;
}

export function parseFgsEvidence(dumpsysText) {
  const lines = dumpsysText.split('\n');
  const hits = lines.filter(
    (l) =>
      l.includes('LongRunForegroundService') ||
      l.includes('long_run_survival') ||
      (l.includes('com.assistant.stocktrading') && /isForeground|foreground/i.test(l)),
  );
  return {
    running: hits.some((l) => l.includes('LongRunForegroundService') || /isForeground=true/i.test(l)),
    snippet: hits.slice(0, 12).join('\n'),
    hitCount: hits.length,
  };
}

export function parseWakeLockEvidence(powerText, logcatRaw = '') {
  const held =
    /wakeLockHeld["']?\s*:\s*true/i.test(logcatRaw) ||
    /PARTIAL_WAKE_LOCK.*sta:sta-long-run/i.test(powerText) ||
    /mHoldingWakeLockSuspendBlocker=true/i.test(powerText);
  const wakefulness = powerText.match(/mWakefulness=([^\s]+)/)?.[1] ?? 'unknown';
  return { held, wakefulness };
}

export function buildPidTimeline(polls, extra = []) {
  const rows = [...polls.map((p) => ({ at: p.at, elapsedMin: p.elapsedMin, pid: p.pid, note: p.note ?? '' })), ...extra];
  return rows.sort((a, b) => (a.elapsedMin ?? 0) - (b.elapsedMin ?? 0));
}
