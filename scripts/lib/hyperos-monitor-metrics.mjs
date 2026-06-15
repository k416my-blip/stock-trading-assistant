/**
 * Shared HyperOS long-run monitor logcat / dumpsys metrics.
 */

export function countMonitorEvent(raw, eventName) {
  const needle = `'${eventName}'`;
  return raw.split('\n').filter((l) => l.includes('12H-MONITOR') && l.includes(needle)).length;
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
