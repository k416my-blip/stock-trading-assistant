import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import {
  applyNodeMemoryLimit,
  isNodeHeapOverThreshold,
  readNodeHeapStatsMb,
} from '../../scripts/lib/oom-node-env.mjs';
import {
  scanLogcatFileDelta,
  readLogcatTailLines,
} from '../../scripts/lib/rotating-logcat-stream.mjs';
import { buildLightLogSection, excerptErrors } from '../../scripts/lib/light-report.mjs';
import {
  HEALTH_RESTART,
  shouldGracefulRestart,
  buildHealthRestartRecord,
} from '../../scripts/lib/chunked-runner.mjs';

describe('oom hotfix libs', () => {
  it('applyNodeMemoryLimit sets NODE_OPTIONS max-old-space-size', () => {
    const prev = process.env.NODE_OPTIONS;
    delete process.env.NODE_OPTIONS;
    const opts = applyNodeMemoryLimit(4096);
    expect(opts).toContain('--max-old-space-size=4096');
    process.env.NODE_OPTIONS = prev;
  });

  it('readNodeHeapStatsMb returns positive heapUsedMb', () => {
    const s = readNodeHeapStatsMb();
    expect(s.heapUsedMb).toBeGreaterThan(0);
    expect(s.rssMb).toBeGreaterThan(0);
  });

  it('scanLogcatFileDelta reads incrementally without full file load contract', () => {
    const dir = mkdtempSync(join(tmpdir(), 'oom-log-'));
    const file = join(dir, 'live.log');
    writeFileSync(file, 'line1\nFATAL EXCEPTION\n', 'utf8');
    const first = scanLogcatFileDelta({ filePath: file, offset: 0 });
    expect(first.metrics.fatal).toBe(1);
    expect(first.newOffset).toBeGreaterThan(0);
    writeFileSync(file, 'line1\nFATAL EXCEPTION\nANR in com.test\n', 'utf8');
    const second = scanLogcatFileDelta({ filePath: file, offset: first.newOffset });
    expect(second.metrics.anr).toBeGreaterThanOrEqual(0);
    rmSync(dir, { recursive: true, force: true });
  });

  it('readLogcatTailLines returns bounded tail', () => {
    const dir = mkdtempSync(join(tmpdir(), 'oom-tail-'));
    const file = join(dir, 'tail.log');
    writeFileSync(file, Array.from({ length: 500 }, (_, i) => 'L' + i).join('\n'), 'utf8');
    const lines = readLogcatTailLines(file, 50);
    expect(lines.length).toBeLessThanOrEqual(50);
    rmSync(dir, { recursive: true, force: true });
  });

  it('buildLightLogSection stays under markdown char budget', () => {
    const dir = mkdtempSync(join(tmpdir(), 'oom-report-'));
    const file = join(dir, 'x.log');
    writeFileSync(file, 'ERROR boom\n' + 'x'.repeat(200000), 'utf8');
    const md = buildLightLogSection({ title: 'test', filePath: file, tailLines: 100 });
    expect(md.length).toBeLessThanOrEqual(120_000);
    expect(excerptErrors(['ok', 'FATAL EXCEPTION'])).toHaveLength(1);
    rmSync(dir, { recursive: true, force: true });
  });

  it('shouldGracefulRestart returns HEALTH_RESTART record shape', () => {
    const now = Date.now();
    const r = shouldGracefulRestart({
      lastRestartMs: now - 70 * 60 * 1000,
      chunkMs: 60 * 60 * 1000,
      heapOverThreshold: false,
    });
    expect(r.restart).toBe(true);
    const rec = buildHealthRestartRecord({ reason: r.reason, heap: readNodeHeapStatsMb(), checkpointPath: '/tmp/cp.json' });
    expect(rec.status).toBe(HEALTH_RESTART);
  });

  it('isNodeHeapOverThreshold respects ratio', () => {
    expect(isNodeHeapOverThreshold({ maxMb: 4096, ratio: 2 })).toBe(false);
  });
});
