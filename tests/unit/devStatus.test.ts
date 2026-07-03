import { describe, expect, it } from 'vitest';
import {
  detectStopped,
  formatCursorFocusLines,
  inferOomCauses,
  summarizeProcesses,
} from '../../scripts/lib/devStatusCore.mjs';

describe('devStatusCore', () => {
  it('summarizeProcesses groups Cursor and Metro', () => {
    const groups = summarizeProcesses([
      {
        Name: 'Cursor.exe',
        ProcessId: 1,
        WorkingSetSize: 100 * 1024 * 1024,
        CommandLine: 'Cursor.exe --type=renderer',
      },
      {
        Name: 'node.exe',
        ProcessId: 2,
        WorkingSetSize: 50 * 1024 * 1024,
        CommandLine: 'node expo start --port 8081',
      },
    ]);
    expect(groups.cursor.running).toBe(true);
    expect(groups.metro.running).toBe(true);
    expect(groups.cursor.totalMb).toBe(100);
    expect(groups.metro.totalMb).toBe(50);
  });

  it('detectStopped lists processes that disappeared', () => {
    const previous = {
      processes: {
        metro: { label: 'Metro', running: true, pids: [99], totalMb: 200 },
        adb: { label: 'adb', running: false, pids: [], totalMb: 0 },
      },
    };
    const current = {
      processes: {
        metro: { label: 'Metro', running: false, pids: [], totalMb: 0 },
        adb: { label: 'adb', running: false, pids: [], totalMb: 0 },
      },
    };
    expect(detectStopped(previous, current)).toEqual([
      expect.objectContaining({ key: 'metro', label: 'Metro' }),
    ]);
  });

  it('inferOomCauses flags high memory and stopped Metro', () => {
    const causes = inferOomCauses(
      {
        memory: { usedPct: 85 },
        cursorTotalMb: 3500,
        cursor: { categories: { tsserver: { label: 'TypeScript Server', totalMb: 2000 } } },
        processes: { metro: { running: false } },
      },
      { processes: { metro: { running: true } } },
    );
    expect(causes.some((c) => c.includes('85%'))).toBe(true);
    expect(causes.some((c) => c.includes('Metro'))).toBe(true);
    expect(causes.some((c) => c.includes('TypeScript Server'))).toBe(true);
  });

  it('formatCursorFocusLines lists indexing, tsserver, extension host', () => {
    const lines = formatCursorFocusLines({
      totalMb: 1200,
      processCount: 4,
      categories: {
        indexing: { label: 'Cursor Indexing', totalMb: 100, count: 1 },
        tsserver: { label: 'TypeScript Server', totalMb: 400, count: 1 },
        extensionHost: { label: 'Extension Host', totalMb: 500, count: 1 },
      },
    });
    expect(lines.some((l) => l.includes('Cursor Indexing'))).toBe(true);
    expect(lines.some((l) => l.includes('TypeScript Server'))).toBe(true);
    expect(lines.some((l) => l.includes('Extension Host'))).toBe(true);
  });
});
