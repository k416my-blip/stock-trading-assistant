import { describe, expect, it, vi, afterEach } from 'vitest';

describe('phase125 stability test mode', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('suppresses API key missing UI when EXPO_PUBLIC_TWELVE_HOUR_TEST_MONITOR=1', async () => {
    vi.stubEnv('EXPO_PUBLIC_TWELVE_HOUR_TEST_MONITOR', '1');
    const mod = await import('../../src/services/phase125StabilityTestMode');
    expect(mod.shouldSuppressApiKeyMissingUi()).toBe(true);
    expect(mod.shouldBlockPriceRefreshForMissingApiKey(false)).toBe(false);
    expect(mod.shouldBlockPriceRefreshForMissingApiKey(true)).toBe(false);
  });

  it('shows API key missing UI in normal builds', async () => {
    vi.stubEnv('EXPO_PUBLIC_TWELVE_HOUR_TEST_MONITOR', '');
    const mod = await import('../../src/services/phase125StabilityTestMode');
    expect(mod.shouldSuppressApiKeyMissingUi()).toBe(false);
    expect(mod.shouldBlockPriceRefreshForMissingApiKey(false)).toBe(true);
  });

  it('buildApiKeyMissingStabilityMeta records NOT_CONFIGURED telemetry shape', async () => {
    vi.stubEnv('EXPO_PUBLIC_TWELVE_HOUR_TEST_MONITOR', '1');
    const mod = await import('../../src/services/phase125StabilityTestMode');
    expect(mod.buildApiKeyMissingStabilityMeta('NOT_CONFIGURED')).toEqual({
      apiKeyMissing: true,
      provider: 'twelveData',
      warningCode: 'API_KEY_MISSING_SUPPRESSED_IN_TEST_MODE',
      priceRefreshStatus: 'NOT_CONFIGURED',
      uiBlocked: false,
    });
    expect(mod.buildApiKeyMissingStabilityMeta('WARN').priceRefreshStatus).toBe('WARN');
  });
});
