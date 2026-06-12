/**
 * Phase12.5 Metro watchdog — :8081 LISTENING check (Windows netstat / optional execSync inject).
 */
export const DEFAULT_METRO_PORT = 8081;

/**
 * Parse owning PID from Windows netstat output for a listening port.
 */
export function parseMetroPidFromNetstat(output, port = DEFAULT_METRO_PORT) {
  if (!output || typeof output !== 'string') return null;
  const lines = output.split(/\r?\n/);
  for (const line of lines) {
    if (!line.includes(`:${port}`) || !/LISTENING/i.test(line)) continue;
    const parts = line.trim().split(/\s+/);
    const pid = Number(parts[parts.length - 1]);
    if (Number.isFinite(pid) && pid > 0) return pid;
  }
  return null;
}

/**
 * Returns { listening, pid, checkedAt, method }.
 * @param {{ execSync?: (cmd: string, opts?: object) => string, port?: number }} opts
 */
export function checkMetroListening({ execSync = null, port = DEFAULT_METRO_PORT } = {}) {
  const checkedAt = new Date().toISOString();
  if (!execSync) {
    return { listening: false, pid: null, checkedAt, method: 'none' };
  }
  try {
    const out = execSync('netstat -ano', {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    const listening =
      out.includes(`:${port}`) &&
      new RegExp(`:${port}[^\\r\\n]*LISTENING`, 'i').test(out);
    const pid = parseMetroPidFromNetstat(out, port);
    return { listening, pid, checkedAt, method: 'netstat' };
  } catch {
    return { listening: false, pid: null, checkedAt, method: 'netstat' };
  }
}

/**
 * Map Metro check to stopReason when not listening.
 */
export function metroStopReason(metroResult) {
  if (metroResult?.listening) return null;
  return 'metro_down';
}

/**
 * Structured INVALID payload when Metro is down. Never throws.
 */
export function buildMetroDownResult(metroResult, port = DEFAULT_METRO_PORT) {
  const checkedAt = metroResult?.checkedAt ?? new Date().toISOString();
  return {
    stopReason: 'metro_down',
    metroDownAt: checkedAt,
    lastMetroCheck: checkedAt,
    metroPid: metroResult?.pid ?? null,
    metroCheckDetails: {
      port,
      listening: false,
      method: metroResult?.method ?? 'unknown',
      pid: metroResult?.pid ?? null,
      checkedAt,
    },
  };
}
