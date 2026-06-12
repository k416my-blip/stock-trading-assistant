import { mkdtempSync, readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import {
  buildLogcatSnapshotBasename,
  buildTwelveHourFinalBasename,
  finalizeLogcatSnapshot,
  formatLogcatTimestamp,
  isLogWriteWarningError,
  parseLogcatMetrics,
  resolveUniquePath,
} from '../../scripts/lib/phase12-5-logcat-finalization.mjs';

describe('phase12-5 logcat finalization', () => {
  it('formatLogcatTimestamp produces stable basename-friendly output', () => {
    const ts = formatLogcatTimestamp(new Date('2026-06-11T15:24:24.769Z'));
    expect(ts).toMatch(/^\d{8}-\d{6}$/);
    expect(buildLogcatSnapshotBasename(ts)).toBe(`logcat-snapshot-${ts}.txt`);
    expect(buildTwelveHourFinalBasename(ts)).toBe(`adb-logcat-final-${ts}.log`);
  });

  it('parseLogcatMetrics counts crash markers', () => {
    const raw = 'FATAL EXCEPTION\nANR in com.example\nReactNativeJS TypeError\n';
    expect(parseLogcatMetrics(raw)).toEqual({
      fatal: 1,
      anr: 1,
      rnTypeError: 1,
      undefined: 0,
    });
  });

  it('resolveUniquePath avoids overwriting existing files', () => {
    const dir = mkdtempSync(join(tmpdir(), 'p125-log-'));
    try {
      writeFileSync(join(dir, 'logcat-snapshot-20260611-152424.txt'), 'first');
      const p = resolveUniquePath(dir, 'logcat-snapshot-20260611-152424.txt');
      expect(p.endsWith('logcat-snapshot-20260611-152424-1.txt')).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('finalizeLogcatSnapshot copies live log without throwing', () => {
    const root = mkdtempSync(join(tmpdir(), 'p125-root-'));
    const liveRel = 'docs/review/twelve-hour-test/adb-logcat-live.log';
    const liveAbs = join(root, liveRel);
    mkdirSync(dirname(liveAbs), { recursive: true });
    writeFileSync(liveAbs, 'live-line-1\nlive-line-2\n', 'utf8');
    const result = finalizeLogcatSnapshot({
      rootDir: root,
      outDir: 'docs/review/phase12-5-long-run',
      twelveHourLogDir: 'docs/review/twelve-hour-test',
      liveRelativePath: liveRel,
      adbDumpText: 'adb-dump-line\n',
      now: new Date('2026-06-11T15:24:24.769Z'),
    });
    expect(result.ok).toBe(true);
    expect(result.path).toBeTruthy();
    expect(readFileSync(result.path!, 'utf8')).toContain('live-line-1');
    expect(result.warning).toBeNull();
  });

  it('finalizeLogcatSnapshot returns WARN result on mock fail without throwing', () => {
    const result = finalizeLogcatSnapshot({
      rootDir: mkdtempSync(join(tmpdir(), 'p125-mock-')),
      mockFail: true,
      adbDumpText: 'x',
    });
    expect(result.ok).toBe(false);
    expect(result.warning?.code).toBe('MOCK_FAIL');
  });

  it('isLogWriteWarningError recognizes errno -4094', () => {
    expect(isLogWriteWarningError({ code: 'UNKNOWN', errno: -4094 })).toBe(true);
    expect(isLogWriteWarningError({ code: 'ENOENT' })).toBe(true);
    expect(isLogWriteWarningError({ code: 'EINVAL' })).toBe(false);
  });
});
