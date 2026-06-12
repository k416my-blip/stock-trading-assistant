import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  getInvalidDetectorConfig,
  resolveInvalidDetectorFlags,
  resolvePhase125RuntimeMode,
} from '../../scripts/lib/phase12-5-runtime-mode.mjs';
import { runInvalidDetectorPass } from '../../scripts/lib/phase12-5-invalid-detectors.mjs';

describe('phase12-5 runtime mode', () => {
  it('defaults to dev mode', () => {
    expect(resolvePhase125RuntimeMode({})).toBe('dev');
    expect(resolvePhase125RuntimeMode({ PHASE12_5_RUNTIME_MODE: 'dev' })).toBe('dev');
  });

  it('resolves apk mode from env', () => {
    expect(resolvePhase125RuntimeMode({ PHASE12_5_RUNTIME_MODE: 'apk' })).toBe('apk');
  });

  it('apk mode disables metro invalid but scans bundle as warn', () => {
    const cfg = getInvalidDetectorConfig('apk');
    expect(cfg.checkMetro).toBe(false);
    expect(cfg.checkBundle).toBe(true);
    expect(cfg.bundleErrorSeverity).toBe('warn');
    expect(cfg.primarySignals).not.toContain('metro_down');
  });

  it('dev mode keeps metro and bundle invalid checks', () => {
    const cfg = getInvalidDetectorConfig('dev');
    expect(cfg.checkMetro).toBe(true);
    expect(cfg.checkBundle).toBe(true);
    expect(cfg.primarySignals).toContain('metro_down');
    expect(cfg.primarySignals).toContain('bundle_error');
  });

  it('runInvalidDetectorPass apk mode ignores metro down', () => {
    const result = runInvalidDetectorPass({
      fs,
      execSync: () => '',
      liveLogcatPath: null,
      watchLogPath: null,
      runtimeMode: 'apk',
      checkPid: false,
      checkWatch: false,
    });
    expect(result.stop).toBe(false);
    expect(result.runtimeMode).toBe('apk');
  });

  it('runInvalidDetectorPass apk mode warns on bundle error instead of stopping', () => {
    const dir = mkdtempSync(join(tmpdir(), 'p125-apk-'));
    const live = join(dir, 'adb-logcat-live.log');
    writeFileSync(live, 'Could not load bundle\n', 'utf8');
    try {
      const result = runInvalidDetectorPass({
        fs,
        execSync: () => '',
        liveLogcatPath: live,
        runtimeMode: 'apk',
        checkPid: false,
        checkWatch: false,
      });
      expect(result.stop).toBe(false);
      expect(result.bundleWarn).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('resolveInvalidDetectorFlags allows explicit overrides', () => {
    const flags = resolveInvalidDetectorFlags({
      runtimeMode: 'apk',
      checkMetro: true,
    });
    expect(flags.runtimeMode).toBe('apk');
    expect(flags.checkMetro).toBe(true);
    expect(flags.checkBundle).toBe(true);
  });
});
