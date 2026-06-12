import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import {
  BUNDLE_ERROR_PATTERNS,
  checkAppPid,
  checkWatchLogStale,
  runInvalidDetectorPass,
  scanFileForBundleErrors,
  scanTextForBundleErrors,
} from '../../scripts/lib/phase12-5-invalid-detectors.mjs';

describe('phase12-5 invalid detectors', () => {
  it('detects Could not load bundle line', () => {
    const text = "06-12 23:29:22.695  9593  9787 E ReactNativeJS: Could not load bundle\n";
    const result = scanTextForBundleErrors(text);
    expect(result.detected).toBe(true);
    expect(result.matchingLine).toContain('Could not load bundle');
  });

  it('detects UI crash: Could not load bundle line', () => {
    const text = "06-12 23:29:22.712  9593  9787 E ReactNativeJS: '[prod] UI crash: Could not load bundle'\n";
    const result = scanTextForBundleErrors(text);
    expect(result.detected).toBe(true);
    expect(result.matchingLine).toContain('UI crash: Could not load bundle');
  });

  it('detects LoadBundleFromServerRequestError', () => {
    const text = '{ [LoadBundleFromServerRequestError: Could not load bundle]';
    expect(scanTextForBundleErrors(text).detected).toBe(true);
  });

  it('detects AppErrorBoundary Could not load bundle line', () => {
    const text =
      "06-12 23:29:22.702  9593  9787 E ReactNativeJS: '[AppErrorBoundary]', 'Could not load bundle', stack\n";
    const result = scanTextForBundleErrors(text);
    expect(result.detected).toBe(true);
    expect(result.matchingLine).toContain('AppErrorBoundary');
  });

  it('scanFileForBundleErrors does not read entire huge file at once', () => {
    const dir = mkdtempSync(join(tmpdir(), 'p125-huge-'));
    const filePath = join(dir, 'live.log');
    try {
      const padding = 'x'.repeat(1024 * 1024);
      writeFileSync(filePath, `${padding}\n`, 'utf8');
      const offset = fs.statSync(filePath).size;
      writeFileSync(filePath, `${padding}\nCould not load bundle\n`, 'utf8');
      const result = scanFileForBundleErrors({ fs, filePath, offset, maxReadBytes: 8192 });
      expect(result.detected).toBe(true);
      expect(result.bytesRead).toBeLessThanOrEqual(8192);
      expect(result.sourceFile).toBe(filePath);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('scanFileForBundleErrors reads only new bytes from offset', () => {
    const dir = mkdtempSync(join(tmpdir(), 'p125-bundle-'));
    const filePath = join(dir, 'live.log');
    try {
      writeFileSync(filePath, 'line1\n', 'utf8');
      const first = scanFileForBundleErrors({ fs, filePath, offset: 0 });
      expect(first.detected).toBe(false);
      writeFileSync(filePath, 'line1\nCould not load bundle\n', 'utf8');
      const second = scanFileForBundleErrors({ fs, filePath, offset: first.newOffset });
      expect(second.detected).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('checkAppPid detects PID change with previousPid and currentPid', () => {
    const result = checkAppPid({ currentPid: '12345', baselinePid: '9593' });
    expect(result.ok).toBe(false);
    expect(result.stopReason).toBe('app_pid_changed');
    expect(result.previousPid).toBe('9593');
    expect(result.currentPid).toBe('12345');
  });

  it('checkAppPid detects PID lost', () => {
    const result = checkAppPid({ currentPid: '', baselinePid: '9593' });
    expect(result.ok).toBe(false);
    expect(result.stopReason).toBe('app_pid_lost');
    expect(result.previousPid).toBe('9593');
    expect(result.currentPid).toBeNull();
  });

  it('checkWatchLogStale warns after 5 minutes and fails after 10', () => {
    const now = 1_000_000_000_000;
    const runnerStarted = now - 11 * 60 * 1000;
    const warn = checkWatchLogStale({
      mtimeMs: now - 6 * 60 * 1000,
      nowMs: now,
      runnerStartedMs: runnerStarted,
      fileExists: true,
    });
    expect(warn.level).toBe('warn');

    const fail = checkWatchLogStale({
      mtimeMs: now - 11 * 60 * 1000,
      nowMs: now,
      runnerStartedMs: runnerStarted,
      fileExists: true,
    });
    expect(fail.level).toBe('fail');
    expect(fail.stopReason).toBe('watch_dead');
  });

  it('runInvalidDetectorPass returns metro_down when Metro is down', () => {
    const result = runInvalidDetectorPass({
      fs,
      execSync: () => '',
      liveLogcatPath: null,
      watchLogPath: null,
      checkBundle: false,
      checkPid: false,
      checkWatch: false,
    });
    expect(result.stop).toBe(true);
    expect(result.stopReason).toBe('metro_down');
    expect(result.metroCheckDetails && (result.metroCheckDetails as { listening?: boolean }).listening).toBe(false);
  });

  it('runInvalidDetectorPass returns bundle_error from live log file', () => {
    const dir = mkdtempSync(join(tmpdir(), 'p125-inv-'));
    const live = join(dir, 'adb-logcat-live.log');
    writeFileSync(live, "x Could not load bundle y\n", 'utf8');
    try {
      const result = runInvalidDetectorPass({
        fs,
        execSync: () => '  TCP  0.0.0.0:8081  LISTENING  1\n',
        liveLogcatPath: live,
        watchLogPath: undefined,
        checkPid: false,
        checkWatch: false,
      } as unknown as Parameters<typeof runInvalidDetectorPass>[0]);
      expect(result.stop).toBe(true);
      expect(result.stopReason).toBe('bundle_error');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('detector internal error does not throw and does not stop runner', () => {
    const badFs = {
      existsSync: () => {
        throw new Error('fs boom');
      },
    };
    const result = runInvalidDetectorPass({
      fs: badFs,
      execSync: () => '  TCP  0.0.0.0:8081  LISTENING  1\n',
      liveLogcatPath: '/nope',
      checkPid: false,
      checkWatch: true,
      watchLogPath: '/nope',
    } as unknown as Parameters<typeof runInvalidDetectorPass>[0]);
    expect(result.stop).toBe(false);
    expect((result as { detectorError?: string }).detectorError).toContain('fs boom');
  });

  it('BUNDLE_ERROR_PATTERNS includes AppErrorBoundary variant', () => {
    const joined = BUNDLE_ERROR_PATTERNS.map((p) => p.source).join('|');
    expect(joined).toMatch(/AppErrorBoundary/);
  });
});
