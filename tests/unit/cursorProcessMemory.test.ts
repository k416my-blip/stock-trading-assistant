import { describe, expect, it } from 'vitest';
import {
  classifyCursorProcess,
  detectLeakSuspects,
  isCursorRelated,
  linearRegressionSlope,
  summarizeCursorMemory,
} from '../../scripts/lib/cursorProcessMemory.mjs';

describe('cursorProcessMemory', () => {
  it('classifies extension host, indexing, and tsserver', () => {
    expect(classifyCursorProcess('Cursor.exe', 'Cursor.exe --type=extensionHost')).toBe('extensionHost');
    expect(
      classifyCursorProcess(
        'Cursor.exe',
        'Cursor.exe --type=utility --utility-sub-type=node.mojom.NodeService --inspect-port=0',
      ),
    ).toBe('extensionHost');
    expect(classifyCursorProcess('Cursor.exe', 'Cursor Indexing Service')).toBe('indexing');
    expect(classifyCursorProcess('node.exe', 'tsserver.js --serverMode partialSemantic')).toBe('tsserver');
  });

  it('isCursorRelated matches cursor and cursor-backed node', () => {
    expect(isCursorRelated('Cursor.exe', '')).toBe(true);
    expect(isCursorRelated('node.exe', 'typescript-language-features')).toBe(true);
    expect(isCursorRelated('node.exe', 'expo start')).toBe(false);
  });

  it('summarizeCursorMemory groups by category and PID', () => {
    const summary = summarizeCursorMemory([
      {
        Name: 'Cursor.exe',
        ProcessId: 10,
        WorkingSetSize: 500 * 1024 * 1024,
        CommandLine: 'Cursor.exe --type=extensionHost',
      },
      {
        Name: 'node.exe',
        ProcessId: 11,
        WorkingSetSize: 300 * 1024 * 1024,
        CommandLine: 'tsserver.js',
      },
      {
        Name: 'Cursor.exe',
        ProcessId: 12,
        WorkingSetSize: 200 * 1024 * 1024,
        CommandLine: 'Cursor Indexing',
      },
    ]);
    expect(summary.totalMb).toBe(1000);
    expect(summary.categories.extensionHost.totalMb).toBe(500);
    expect(summary.categories.tsserver.totalMb).toBe(300);
    expect(summary.categories.indexing.totalMb).toBe(200);
    expect(summary.byPid[0].pid).toBe(10);
  });

  it('linearRegressionSlope detects upward trend', () => {
    const slope = linearRegressionSlope([
      { t: 0, mb: 100 },
      { t: 1, mb: 200 },
      { t: 2, mb: 300 },
    ]);
    expect(slope).toBeGreaterThan(90);
  });

  it('detectLeakSuspects flags sustained growth', () => {
    const base = '2026-07-03T00:00:00.000Z';
    const samples = [0, 1, 2, 3].map((h) => ({
      capturedAt: new Date(new Date(base).getTime() + h * 3_600_000).toISOString(),
      byPid: [{ pid: 42, name: 'Cursor.exe', category: 'extensionHost', mb: 100 + h * 50 }],
    }));
    const result = detectLeakSuspects(samples);
    expect(result.suspects.length).toBeGreaterThan(0);
    expect(result.suspects[0].pid).toBe(42);
  });
});
