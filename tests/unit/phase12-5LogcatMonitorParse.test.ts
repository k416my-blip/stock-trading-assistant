import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import {
  decodeLogcatBuffer,
  extractLastMonitor,
  readLogcatTailBytes,
} from '../../scripts/lib/phase12-5-logcat-monitor-parse.mjs';

describe('phase12-5 logcat monitor parse', () => {
  it('extractLastMonitor finds heartbeat in ReactNativeJS line', () => {
    const tail = [
      '06-13 19:34:53.112 10207 10278 I ReactNativeJS: \'[12H-MONITOR]\', \'heartbeat\', { elapsedMin: 666,',
      '06-13 19:35:13.543 10207 10278 I ReactNativeJS: \'[12H-MONITOR]\', \'heartbeat\', { elapsedMin: 666,',
    ].join('\n');
    expect(extractLastMonitor(tail, 'heartbeat')).toBe('06-13 19:35:13.543');
  });

  it('extractLastMonitor returns none when heartbeat absent', () => {
    expect(extractLastMonitor('camera spam only', 'heartbeat')).toBe('none');
  });

  it('decodeLogcatBuffer handles UTF-16LE adb logcat from Tee-Object', () => {
    const utf16 = Buffer.from('06-13 18:05:13.509 I ReactNativeJS(10207): heartbeat 12H-MONITOR\0', 'utf16le');
    const decoded = decodeLogcatBuffer(utf16);
    expect(decoded).toContain('12H-MONITOR');
    expect(decoded).toContain('heartbeat');
  });

  it('readLogcatTailBytes reads tail from file with UTF-16 payload', () => {
    const dir = mkdtempSync(join(tmpdir(), 'p125-logtail-'));
    const filePath = join(dir, 'adb-logcat-live.log');
    const line =
      '06-13 18:05:13.509 10207 10278 I ReactNativeJS: \'[12H-MONITOR]\', \'heartbeat\', { elapsedMin: 576,';
    writeFileSync(filePath, Buffer.from(`${line}\n`, 'utf16le'));
    const tail = readLogcatTailBytes(filePath, 65536);
    expect(extractLastMonitor(tail, 'heartbeat')).toBe('06-13 18:05:13.509');
    rmSync(dir, { recursive: true, force: true });
  });
});
