import { existsSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import {
  buildUiDumpBasename,
  LEGACY_DISMISS_BASENAME,
  sanitizeUiDumpLabel,
  saveUiDumpSnapshot,
} from '../../scripts/lib/phase12-5-ui-dump-finalization.mjs';
import { formatLogcatTimestamp } from '../../scripts/lib/phase12-5-logcat-finalization.mjs';

describe('phase12-5 UI dump finalization', () => {
  const fixedNow = new Date('2026-06-12T13:31:43.000Z');

  it('buildUiDumpBasename uses timestamp and sanitized label', () => {
    const ts = formatLogcatTimestamp(fixedNow);
    expect(buildUiDumpBasename('dismiss', ts)).toBe(`ui-dump-dismiss-${ts}.xml`);
    expect(buildUiDumpBasename('tab-pre-ホーム', ts)).toBe(`ui-dump-tab-pre-ホーム-${ts}.xml`);
  });

  it('sanitizeUiDumpLabel normalizes unsafe characters', () => {
    expect(sanitizeUiDumpLabel('dismiss')).toBe('dismiss');
    expect(sanitizeUiDumpLabel('tab scroll/1')).toBe('tab_scroll_1');
  });

  it('saveUiDumpSnapshot writes timestamped dismiss dump, not legacy dismiss.xml', () => {
    const dir = mkdtempSync(join(tmpdir(), 'p125-ui-'));
    try {
      const beforeLegacy = existsSync(join(dir, LEGACY_DISMISS_BASENAME));
      const result = saveUiDumpSnapshot({
        outDir: dir,
        label: 'dismiss',
        content: '<hierarchy/>',
        now: fixedNow,
      });
      expect(result.ok).toBe(true);
      expect(result.path).toBeTruthy();
      expect(result.path!.endsWith(`ui-dump-dismiss-${formatLogcatTimestamp(fixedNow)}.xml`)).toBe(true);
      expect(existsSync(join(dir, LEGACY_DISMISS_BASENAME))).toBe(beforeLegacy);
      expect(readFileSync(result.path!, 'utf8')).toBe('<hierarchy/>');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('saveUiDumpSnapshot adds numeric suffix on basename collision', () => {
    const dir = mkdtempSync(join(tmpdir(), 'p125-ui-collision-'));
    const ts = formatLogcatTimestamp(fixedNow);
    const basename = buildUiDumpBasename('dismiss', ts);
    try {
      writeFileSync(join(dir, basename), 'existing', 'utf8');
      const result = saveUiDumpSnapshot({
        outDir: dir,
        label: 'dismiss',
        content: '<hierarchy/>',
        now: fixedNow,
      });
      expect(result.ok).toBe(true);
      expect(result.path!.endsWith(`ui-dump-dismiss-${ts}-1.xml`)).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('saveUiDumpSnapshot returns WARN on write failure without throwing', () => {
    const dir = mkdtempSync(join(tmpdir(), 'p125-ui-fail-'));
    try {
      const result = saveUiDumpSnapshot({
        outDir: dir,
        label: 'dismiss',
        content: '<hierarchy/>',
        now: fixedNow,
        mockFail: true,
      });
      expect(result.ok).toBe(false);
      expect(result.warning?.code).toBe('MOCK_FAIL');
      expect(result.warning?.recoverable).toBe(true);
      expect(result.content).toBe('<hierarchy/>');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('saveUiDumpSnapshot returns WARN on errno -4094 style write errors without throwing', () => {
    const dir = mkdtempSync(join(tmpdir(), 'p125-ui-4094-'));
    try {
      const err = Object.assign(new Error('UNKNOWN: unknown error, open dismiss'), {
        code: 'UNKNOWN',
        errno: -4094,
      });
      const result = saveUiDumpSnapshot({
        outDir: dir,
        label: 'dismiss',
        content: '<hierarchy/>',
        now: fixedNow,
        writeFile: () => {
          throw err;
        },
      });
      expect(result.ok).toBe(false);
      expect(result.warning?.errno).toBe(-4094);
      expect(result.warning?.recoverable).toBe(true);
      expect(existsSync(join(dir, LEGACY_DISMISS_BASENAME))).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('saveUiDumpSnapshot warns on empty adb capture without throwing', () => {
    const dir = mkdtempSync(join(tmpdir(), 'p125-ui-empty-'));
    try {
      const result = saveUiDumpSnapshot({
        outDir: dir,
        label: 'dismiss',
        content: '   ',
        now: fixedNow,
      });
      expect(result.ok).toBe(false);
      expect(result.warning?.code).toBe('EMPTY_CAPTURE');
      expect(result.content).toBe('');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('phase12-5 UI dump — legacy dismiss.xml mtime guard', () => {
  it('does not update legacy dismiss.xml mtime when writing dismiss label dump', () => {
    const dir = mkdtempSync(join(tmpdir(), 'p125-ui-legacy-'));
    const legacyPath = join(dir, LEGACY_DISMISS_BASENAME);
    try {
      writeFileSync(legacyPath, '<legacy/>', 'utf8');
      const before = statSync(legacyPath).mtimeMs;
      const result = saveUiDumpSnapshot({
        outDir: dir,
        label: 'dismiss',
        content: '<new/>',
        now: new Date('2026-06-12T13:31:43.000Z'),
      });
      expect(result.ok).toBe(true);
      expect(statSync(legacyPath).mtimeMs).toBe(before);
      expect(readFileSync(legacyPath, 'utf8')).toBe('<legacy/>');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
