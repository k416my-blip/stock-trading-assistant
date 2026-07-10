import { describe, expect, it } from 'vitest';
import {
  E2E_METRO_ENV,
  applyE2eRuntimeEnv,
  e2eMetroPolicyLines,
  e2eMetroStartArgs,
} from '../../scripts/lib/e2eMetroEnv.mjs';

describe('e2eMetroEnv', () => {
  it('sets DevTools-suppression env vars', () => {
    applyE2eRuntimeEnv();
    expect(process.env.E2E_MODE).toBe('1');
    expect(process.env.CI).toBe('1');
    expect(process.env.EXPO_DEBUG).toBe('0');
    expect(process.env.BROWSER).toBe('none');
    expect(process.env.__EXPO_E2E_TEST).toBe('1');
  });

  it('exports stable E2E metro env keys', () => {
    expect(Object.keys(E2E_METRO_ENV)).toEqual(
      expect.arrayContaining(['CI', 'EXPO_DEBUG', 'BROWSER', 'E2E_MODE']),
    );
  });

  it('uses minimal expo start args', () => {
    expect(e2eMetroStartArgs(8081)).toEqual(['expo', 'start', '--port', '8081']);
  });

  it('documents DevTools policy for OOM reports', () => {
    const lines = e2eMetroPolicyLines();
    expect(lines.some((l) => l.includes('DevTools'))).toBe(true);
    expect(lines.some((l) => l.includes('e2e:metro'))).toBe(true);
  });
});
