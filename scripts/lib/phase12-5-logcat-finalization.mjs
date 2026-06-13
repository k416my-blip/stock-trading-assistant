/**
 * Phase12.5 logcat finalization — live vs snapshot separation, WARN-only failures.
 */
import fs from 'node:fs';
import path from 'node:path';

export const DEFAULT_LIVE_LOGCAT = 'docs/review/twelve-hour-test/adb-logcat-live.log';

export function formatLogcatTimestamp(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return (
    `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-` +
    `${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
  );
}

export function buildLogcatSnapshotBasename(ts = formatLogcatTimestamp()) {
  return `logcat-snapshot-${ts}.txt`;
}

export function buildTwelveHourFinalBasename(ts = formatLogcatTimestamp()) {
  return `adb-logcat-final-${ts}.log`;
}

export function resolveUniquePath(dir, basename) {
  const ext = path.extname(basename);
  const stem = basename.slice(0, -ext.length);
  let candidate = path.join(dir, basename);
  if (!fs.existsSync(candidate)) return candidate;
  for (let i = 1; i < 1000; i += 1) {
    candidate = path.join(dir, `${stem}-${i}${ext}`);
    if (!fs.existsSync(candidate)) return candidate;
  }
  throw new Error(`Could not allocate unique path for ${basename}`);
}

export function parseLogcatMetrics(raw) {
  const fatal = (raw.match(/FATAL EXCEPTION/gi) ?? []).length;
  const anr = (raw.match(/ANR in /gi) ?? []).length;
  const rnType = (raw.match(/ReactNativeJS.*TypeError/gi) ?? []).length;
  const undef = (raw.match(/Cannot convert undefined value to object/gi) ?? []).length;
  return { fatal, anr, rnTypeError: rnType, undefined: undef };
}

export function isLogWriteWarningError(err) {
  if (!err || typeof err !== 'object') return false;
  const code = err.code;
  const errno = err.errno;
  return (
    code === 'EBUSY' ||
    code === 'EPERM' ||
    code === 'EACCES' ||
    code === 'ENOENT' ||
    code === 'EMFILE' ||
    code === 'UNKNOWN' ||
    errno === -4094 ||
    errno === -4082
  );
}

/**
 * Copy live append-only log to a timestamped final file, or write adb dump fallback.
 * Never throws — returns { ok, path, warning, source }.
 */
export function finalizeLogcatSnapshot({
  rootDir,
  outDir = 'docs/review/phase12-5-long-run',
  twelveHourLogDir = 'docs/review/twelve-hour-test',
  liveRelativePath = DEFAULT_LIVE_LOGCAT,
  adbDumpText = '',
  now = new Date(),
  mockFail = false,
}) {
  const livePath = path.join(rootDir, liveRelativePath);
  const ts = formatLogcatTimestamp(now);
  const twelveHourDir = path.join(rootDir, twelveHourLogDir);
  const snapshotDir = path.join(rootDir, outDir);

  if (mockFail) {
    return {
      ok: false,
      path: null,
      warning: {
        at: now.toISOString(),
        code: 'MOCK_FAIL',
        message: 'Simulated logcat finalization failure',
        source: 'mock',
      },
      source: 'mock',
      metrics: parseLogcatMetrics(adbDumpText),
    };
  }

  fs.mkdirSync(twelveHourDir, { recursive: true });
  fs.mkdirSync(snapshotDir, { recursive: true });

  const twelveHourFinal = resolveUniquePath(
    twelveHourDir,
    buildTwelveHourFinalBasename(ts),
  );
  const snapshotFinal = resolveUniquePath(snapshotDir, buildLogcatSnapshotBasename(ts));

  const attempts = [];

  if (fs.existsSync(livePath)) {
    attempts.push({
      dest: twelveHourFinal,
      source: 'live-copy',
      fn: () => fs.copyFileSync(livePath, twelveHourFinal),
    });
  }

  if (adbDumpText) {
    attempts.push({
      dest: snapshotFinal,
      source: 'adb-dump',
      fn: () => fs.writeFileSync(snapshotFinal, adbDumpText, 'utf8'),
    });
  } else if (fs.existsSync(livePath)) {
    attempts.push({
      dest: snapshotFinal,
      source: 'live-copy-snapshot',
      fn: () => fs.copyFileSync(livePath, snapshotFinal),
    });
  }

  if (!attempts.length) {
    return {
      ok: false,
      path: null,
      warning: {
        at: now.toISOString(),
        code: 'NO_SOURCE',
        message: 'No live logcat file and no adb dump available for finalization',
        source: 'none',
      },
      source: 'none',
      metrics: parseLogcatMetrics(adbDumpText),
    };
  }

  const written = [];
  const errors = [];

  for (const attempt of attempts) {
    try {
      attempt.fn();
      written.push({ dest: attempt.dest, source: attempt.source });
    } catch (err) {
      errors.push({ dest: attempt.dest, source: attempt.source, err });
    }
  }

  if (written.length) {
    return {
      ok: true,
      path: written[0].dest,
      snapshotPath: written[1]?.dest ?? written[0].dest,
      warning: errors.length
        ? {
            at: now.toISOString(),
            code: errors[0].err?.code ?? 'PARTIAL',
            errno: errors[0].err?.errno ?? null,
            message: errors.map((e) => e.err?.message ?? 'write failed').join('; '),
            source: errors[0].source,
          }
        : null,
      source: written.map((w) => w.source).join('+'),
      metrics: parseLogcatMetrics(adbDumpText),
    };
  }

  const err = errors[0]?.err ?? new Error('logcat finalization failed');
  return {
    ok: false,
    path: null,
    warning: {
      at: now.toISOString(),
      code: err.code ?? 'UNKNOWN',
      errno: err.errno ?? null,
      message: err.message,
      source: errors[0]?.source ?? 'unknown',
    },
    source: errors[0]?.source ?? 'unknown',
    metrics: parseLogcatMetrics(adbDumpText),
  };
}
