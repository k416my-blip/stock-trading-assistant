import { describe, expect, it } from 'vitest';
import {
  LIVE_SNAPSHOT_HEADING,
  MEMORY_NOTE_HEADING,
  buildMemoryNoteAndLiveSnapshotMarkdown,
  detectStopped,
  formatCursorFocusLines,
  inferOomCauses,
  mergeCurrentStatusLiveSections,
  summarizeProcesses,
} from '../../scripts/lib/devStatusCore.mjs';

const PASS_FIXTURE = `# CURRENT_STATUS

## AI Concierge Budget / Quantity UI Final Acceptance — PASS

| 最終受入 | PASS |

## OOM 12h Stability Run — PASS

| 最終判定 | PASS |

## Git

| 12h OOM stability run commit hash | \`9ab6458\` |

## Memory note

| 項目 | 値 |
| 現在 | stale |

## Live snapshot（old）

- stale aggregate

---

## Commands

- \`npm run status\`
`;

const sampleSnapshot = {
  capturedAt: '2026-07-09T02:30:00.000Z',
  memory: { usedPct: 33.5, totalMB: 32678, freeMB: 21741 },
  cursorTotalMb: 4690,
  cursor: {
    processCount: 19,
    categories: {
      tsserver: { totalMb: 1307, count: 2 },
      extensionHost: { totalMb: 1658, count: 7 },
    },
  },
  processes: {
    metro: { label: 'Metro', running: false },
    adb: { label: 'adb', running: false },
    node: { label: 'node', running: false },
    adbLogcat: { label: 'adb logcat', running: false },
  },
};

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
    expect(causes.some((c) => c.includes('DevTools'))).toBe(true);
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

  it('mergeCurrentStatusLiveSections preserves PASS blocks and updates live sections only', () => {
    const merged = mergeCurrentStatusLiveSections(PASS_FIXTURE, {
      snapshot: sampleSnapshot,
      stopped: [],
    });

    expect(merged).toContain('AI Concierge Budget / Quantity UI Final Acceptance — PASS');
    expect(merged).toContain('OOM 12h Stability Run — PASS');
    expect(merged).toContain('12h OOM stability run commit hash');
    expect(merged).toContain('## Commands');
    expect(merged).not.toContain('stale aggregate');
    expect(merged).toContain(MEMORY_NOTE_HEADING);
    expect(merged).toContain(LIVE_SNAPSHOT_HEADING);
    expect(merged).toContain('4690 MB');
    expect(merged).toContain('33.5%');

    const memoryIdx = merged.indexOf(MEMORY_NOTE_HEADING);
    const conciergeIdx = merged.indexOf('AI Concierge Budget / Quantity UI Final Acceptance — PASS');
    const gitIdx = merged.indexOf('## Git');
    expect(conciergeIdx).toBeGreaterThan(-1);
    expect(gitIdx).toBeGreaterThan(conciergeIdx);
    expect(memoryIdx).toBeGreaterThan(gitIdx);
  });

  it('buildMemoryNoteAndLiveSnapshotMarkdown marks cursor under 5GB as normal', () => {
    const block = buildMemoryNoteAndLiveSnapshotMarkdown({ snapshot: sampleSnapshot, stopped: [] });
    expect(block).toContain('**正常** — 5 GB 未満');
    expect(block).toContain('### Dev processes');
  });
});
