/**
 * Phase12.5 invalid-condition detectors — bundle errors, PID drift, watch staleness.
 */
import { buildMetroDownResult, checkMetroListening } from './phase12-5-metro-watchdog.mjs';
import { resolveInvalidDetectorFlags } from './phase12-5-runtime-mode.mjs';

export const BUNDLE_ERROR_PATTERNS = [
  /Could not load bundle/i,
  /UI crash: Could not load bundle/i,
  /LoadBundleFromServerRequestError/i,
  /AppErrorBoundary.*Could not load bundle/i,
];

export const DEFAULT_WATCH_WARN_MS = 5 * 60 * 1000;
export const DEFAULT_WATCH_FAIL_MS = 10 * 60 * 1000;

/**
 * Scan new logcat file bytes for bundle load failures.
 * @returns {{ detected: boolean, matchingLine?: string, bundleErrorAt?: string, sourceFile?: string, bytesRead?: number, newOffset: number }}
 */
export function scanFileForBundleErrors({
  fs,
  filePath,
  offset = 0,
  patterns = BUNDLE_ERROR_PATTERNS,
  maxReadBytes = 512 * 1024,
  now = new Date(),
}) {
  if (!fs.existsSync(filePath)) {
    return { detected: false, newOffset: offset };
  }
  const stat = fs.statSync(filePath);
  if (stat.size <= offset) {
    return { detected: false, newOffset: offset };
  }
  const readLen = Math.min(stat.size - offset, maxReadBytes);
  const fd = fs.openSync(filePath, 'r');
  const buf = Buffer.alloc(readLen);
  fs.readSync(fd, buf, 0, readLen, offset);
  fs.closeSync(fd);
  const chunk = buf.toString('utf8');
  const lines = chunk.split(/\r?\n/);
  for (const line of lines) {
    for (const pattern of patterns) {
      if (pattern.test(line)) {
        return {
          detected: true,
          matchingLine: line.trim().slice(0, 500),
          bundleErrorAt: now.toISOString(),
          sourceFile: filePath,
          bytesRead: readLen,
          newOffset: stat.size,
        };
      }
    }
  }
  return { detected: false, newOffset: stat.size };
}

/**
 * Scan inline logcat text (for tests / adb dump).
 */
export function scanTextForBundleErrors(text, patterns = BUNDLE_ERROR_PATTERNS, now = new Date()) {
  if (!text) return { detected: false };
  for (const line of text.split(/\r?\n/)) {
    for (const pattern of patterns) {
      if (pattern.test(line)) {
        return {
          detected: true,
          matchingLine: line.trim().slice(0, 500),
          bundleErrorAt: now.toISOString(),
        };
      }
    }
  }
  return { detected: false };
}

/**
 * Compare current app PID against baseline recorded at runner start.
 */
export function checkAppPid({ currentPid, baselinePid }) {
  const pid = (currentPid ?? '').trim();
  if (!pid) {
    return {
      ok: false,
      stopReason: 'app_pid_lost',
      detail: 'app PID not found',
      previousPid: baselinePid ? String(baselinePid).trim() : null,
      currentPid: null,
    };
  }
  if (baselinePid && pid !== String(baselinePid).trim()) {
    return {
      ok: false,
      stopReason: 'app_pid_changed',
      detail: `${baselinePid} -> ${pid}`,
      previousPid: String(baselinePid).trim(),
      currentPid: pid,
    };
  }
  return { ok: true, stopReason: null, detail: null };
}

/**
 * pre-run-watch.log mtime staleness — watchdog uses mtime only (no adb).
 */
export function checkWatchLogStale({
  mtimeMs,
  nowMs,
  runnerStartedMs = 0,
  warnAfterMs = DEFAULT_WATCH_WARN_MS,
  failAfterMs = DEFAULT_WATCH_FAIL_MS,
  fileExists = true,
}) {
  if (!fileExists) {
    return { level: 'ok', ageSec: 0, stopReason: null };
  }
  const ageMs = Math.max(0, nowMs - mtimeMs);
  const ageSec = Math.floor(ageMs / 1000);
  const runnerAgeMs = Math.max(0, nowMs - runnerStartedMs);
  if (runnerAgeMs < warnAfterMs) {
    return { level: 'ok', ageSec, stopReason: null };
  }
  if (ageMs >= failAfterMs) {
    return { level: 'fail', ageSec, stopReason: 'watch_dead' };
  }
  if (ageMs >= warnAfterMs) {
    return { level: 'warn', ageSec, stopReason: null };
  }
  return { level: 'ok', ageSec, stopReason: null };
}

/**
 * Run all injectable detectors; never throws.
 * @param {object} opts
 * @param {import('node:fs')} opts.fs
 * @param {Function} [opts.execSync]
 * @param {string|null} [opts.liveLogcatPath]
 * @param {string|null} [opts.watchLogPath]
 * @param {number} [opts.logcatScanOffset]
 * @param {string|number|null} [opts.baselineAppPid]
 * @param {string} [opts.currentAppPid]
 * @param {number} [opts.runnerStartedMs]
 * @param {number} [opts.nowMs]
 * @param {string} [opts.runtimeMode]
 * @param {boolean} [opts.checkWatch]
 * @param {boolean} [opts.checkMetro]
 * @param {boolean} [opts.checkBundle]
 * @param {boolean} [opts.checkPid]
 * @returns {{ stop: boolean, stopReason?: string, detail?: string, metro?: object, watch?: object, newLogcatScanOffset?: number, watchWarn?: boolean, bundleWarn?: boolean, runtimeMode?: string, detectorError?: string, metroDownAt?: string, lastMetroCheck?: string, metroCheckDetails?: object, previousPid?: string|null, currentPid?: string|null, bundle?: object }}
 */
export function runInvalidDetectorPass({
  fs,
  execSync,
  liveLogcatPath = null,
  watchLogPath = null,
  logcatScanOffset = 0,
  baselineAppPid = null,
  currentAppPid = '',
  runnerStartedMs = 0,
  nowMs = Date.now(),
  runtimeMode = undefined,
  checkWatch = undefined,
  checkMetro = undefined,
  checkBundle = undefined,
  checkPid = undefined,
}) {
  const flags = resolveInvalidDetectorFlags({
    runtimeMode,
    checkWatch,
    checkMetro,
    checkBundle,
    checkPid,
  });
  const out = {
    stop: false,
    newLogcatScanOffset: logcatScanOffset,
    runtimeMode: flags.runtimeMode,
  };
  try {
    if (flags.checkMetro) {
      const metro = checkMetroListening({ execSync });
      out.metro = metro;
      if (!metro.listening) {
        const metroDown = buildMetroDownResult(metro);
        return {
          ...out,
          stop: true,
          stopReason: metroDown.stopReason,
          detail: 'Metro :8081 NOT LISTENING',
          ...metroDown,
        };
      }
    }

    if (flags.checkBundle && fs && liveLogcatPath) {
      const bundle = scanFileForBundleErrors({ fs, filePath: liveLogcatPath, offset: logcatScanOffset });
      out.newLogcatScanOffset = bundle.newOffset ?? logcatScanOffset;
      if (bundle.detected) {
        if (flags.bundleErrorSeverity === 'warn') {
          out.bundleWarn = true;
          out.bundle = bundle;
        } else {
          return {
            ...out,
            stop: true,
            stopReason: 'bundle_error',
            detail: bundle.matchingLine,
            bundle,
          };
        }
      }
    }

    if (flags.checkPid) {
      const pidCheck = checkAppPid({ currentPid: currentAppPid, baselinePid: baselineAppPid });
      if (!pidCheck.ok) {
        return {
          ...out,
          stop: true,
          stopReason: pidCheck.stopReason,
          detail: pidCheck.detail,
          previousPid: pidCheck.previousPid,
          currentPid: pidCheck.currentPid,
        };
      }
    }

    if (flags.checkWatch && fs && watchLogPath) {
      const exists = fs.existsSync(watchLogPath);
      const mtimeMs = exists ? fs.statSync(watchLogPath).mtimeMs : 0;
      const watch = checkWatchLogStale({
        mtimeMs,
        nowMs,
        runnerStartedMs,
        fileExists: exists,
      });
      out.watch = watch;
      if (watch.level === 'fail') {
        return {
          ...out,
          stop: true,
          stopReason: 'watch_dead',
          detail: `pre-run-watch stale ${watch.ageSec}s`,
        };
      }
      if (watch.level === 'warn') {
        out.watchWarn = true;
      }
    }

    return out;
  } catch (err) {
    return {
      ...out,
      stop: false,
      detectorError: err?.message ?? String(err),
    };
  }
}
